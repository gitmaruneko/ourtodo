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
 const uploaded:string[]=[];
 try {
 if(Number(request.headers.get('content-length'))>10*1024*1024)return json({error:'照片總大小不可超過 8 MB。'},413);
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
 const files=form.getAll('files').filter((f):f is File=>f instanceof File&&f.size>0);
 if(photos.length+files.length>4||files.reduce((n,f)=>n+f.size,0)>8*1024*1024)return json({error:'最多 4 張照片，新增照片總計最多 8 MB。'},400);
 for(const f of files) {
 const a=new Uint8Array(await f.slice(0,12).arrayBuffer());
 const type=a[0]===255&&a[1]===216?'image/jpeg':a[0]===137&&a[1]===80&&a[2]===78&&a[3]===71?'image/png':String.fromCharCode(...a.slice(0,4))==='RIFF'&&String.fromCharCode(...a.slice(8,12))==='WEBP'?'image/webp':null;
 if(!type||type!==f.type||f.size>2*1024*1024){await Promise.all(uploaded.map(k=>env.BUCKET!.delete(k)));return json({error:'請上傳 JPEG、PNG 或 WebP，每張最多 2 MB。'},400);}
 const key=crypto.randomUUID();await env.BUCKET!.put(key,f.stream(),{httpMetadata:{contentType:type}});uploaded.push(key);photos.push({id:key,name:f.name.slice(0,150)});
 }
 const now=new Date().toISOString();
 if(old){
 const r=await env.DB!.prepare('UPDATE tasks SET title=?,date=?,assignee=?,description=?,notes=?,status=?,photos=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(title,date,assignee,description,notes,status,JSON.stringify(photos),now,id,old.version).run();
 if(!r.meta.changes){await Promise.all(uploaded.map(k=>env.BUCKET!.delete(k)));return json({error:'另一位使用者已更新任務，請重新載入。'},409);}
 }else await env.DB!.prepare('INSERT INTO tasks (id,title,date,assignee,description,notes,status,creator,creator_user_id,photos,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?)').bind(id,title,date,assignee,description,notes,status,creator,user.provider==='line'?user.userId:null,JSON.stringify(photos),now,now).run();
 return json({id});
 }catch{await Promise.allSettled(uploaded.map(k=>env.BUCKET!.delete(k)));return json({error:'儲存失敗，請保留內容並重試。'},500);}
}
