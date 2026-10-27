import { env } from 'cloudflare:workers';
import { statuses, validDate } from '@/lib/tasks';
import {requireMember,accessResponse} from '@/lib/access';
export const dynamic = 'force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request) {
 try{await requireMember(request);}catch(e){return accessResponse(e);}
 try { const r=await env.DB!.prepare('SELECT * FROM tasks ORDER BY date ASC, created_at DESC').all();
 return json(r.results.map((t:any)=>({...t,createdAt:t.created_at,updatedAt:t.updated_at,photos:JSON.parse(t.photos)})));
 } catch {return json({error:'暫時無法讀取任務，請稍後重試。'},503);}
}
export async function POST(request:Request) {
 let user;
 try{user=await requireMember(request);}catch(e){return accessResponse(e);}
 try {
 if(Number(request.headers.get('content-length'))>10*1024*1024)return json({error:'任務內容過大。'},413);
 const form=await request.formData();
 const value=(key:string)=>String(form.get(key)||'').trim();
 const title=value('title'),date=value('date'),assignee=value('assignee'),description=value('description'),notes=value('notes'),status=value('status'),creator=user.provider==='line'?user.displayName:value('creator');
 if(!title||title.length>100||!assignee||assignee.length>40||description.length>5000||notes.length>3000||!statuses.includes(status as any)||!validDate(date))return json({error:'請填寫任務名稱、負責人、狀態及有效日期（1900–2100 年）。'},400);
 const id=value('id')||crypto.randomUUID();
 const old=await env.DB!.prepare('SELECT * FROM tasks WHERE id=?').bind(id).first<any>();
 if(value('id')&&!old)return json({error:'找不到這筆任務，請重新整理。'},404);
 if(!old&&(!creator||creator.length>100))return json({error:'請填寫建立人姓名（最多 100 字）。'},400);
 if(old&&old.version!==Number(value('version')))return json({error:'這筆任務已被更新，請關閉並重新載入後再編輯。'},409);
 const existing=old?JSON.parse(old.photos):[];
 const retained=JSON.parse(value('retained')||'[]');
 if(!Array.isArray(retained)||retained.some((p:any)=>typeof p!=='string'||!existing.some((e:any)=>e.id===p)))return json({error:'照片資料無效。'},400);
 const photos=existing.filter((p:any)=>retained.includes(p.id));
 if(form.getAll('files').some(f=>f instanceof File))return json({error:'照片上傳功能已停用。'},400);
 const now=new Date().toISOString();
 if(old){
 const r=await env.DB!.prepare('UPDATE tasks SET title=?,date=?,assignee=?,description=?,notes=?,status=?,photos=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(title,date,assignee,description,notes,status,JSON.stringify(photos),now,id,old.version).run();
 if(!r.meta.changes){return json({error:'另一位使用者已更新任務，請重新載入。'},409);}
 }else await env.DB!.prepare('INSERT INTO tasks (id,title,date,assignee,description,notes,status,creator,creator_user_id,photos,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?)').bind(id,title,date,assignee,description,notes,status,creator,user.provider==='line'?user.userId:null,JSON.stringify(photos),now,now).run();
 return json({id});
 }catch{return json({error:'儲存失敗，請保留內容並重試。'},500);}
}
