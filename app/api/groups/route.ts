import {env} from 'cloudflare:workers';
import {requireMember,accessResponse,AccessError} from '@/lib/access';
import {ensureLegacyOwner,requireGroupOwner,type Group} from '@/lib/groups';
import {validGroupTheme} from '@/lib/group-themes';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 try{
  const user=await requireMember(request);await ensureLegacyOwner(user);
  const result=await env.DB!.prepare('SELECT g.id,g.name,g.theme,gm.role FROM app_groups g JOIN group_members gm ON gm.group_id=g.id WHERE gm.user_id=? ORDER BY gm.joined_at,g.id').bind(user.userId).all<Group>();
  return json(result.results);
 }catch(e){return accessResponse(e)}
}
export async function POST(request:Request){
 try{
  const user=await requireMember(request);
  let data:Record<string,unknown>;
  try{data=await request.json() as Record<string,unknown>}catch{throw new AccessError(400,'INPUT','群組資料格式無效。')}
  if(!data||typeof data!=='object')throw new AccessError(400,'INPUT','群組資料格式無效。');
  if(data.action==='create'){
   const name=typeof data.name==='string'?data.name.trim():'';
   if(!name||name.length>40)throw new AccessError(400,'INPUT','請輸入 1 至 40 字的群組名稱。');
   const id=crypto.randomUUID(),code=crypto.randomUUID().replaceAll('-',''),now=new Date().toISOString();
   await env.DB!.batch([
    env.DB!.prepare('INSERT INTO app_groups (id,name,invite_code,created_by,created_at) VALUES (?,?,?,?,?)').bind(id,name,code,user.userId,now),
    env.DB!.prepare("INSERT INTO group_members (group_id,user_id,role,joined_at) VALUES (?,?,'owner',?)").bind(id,user.userId,now),
   ]);
   return json({group:{id,name,theme:'sage',role:'owner'}},201);
  }
  if(data.action==='join'){
   const code=typeof data.inviteCode==='string'?data.inviteCode.trim():'';
   if(!/^[a-f0-9]{32}$/.test(code))throw new AccessError(400,'INPUT','邀請碼格式不正確，請確認邀請連結。');
   const group=await env.DB!.prepare('SELECT id,name,theme FROM app_groups WHERE invite_code=?').bind(code).first<{id:string;name:string;theme:string}>();
   if(!group)throw new AccessError(404,'INVITE','邀請碼無效或已更新，請向群組管理員索取新連結。');
   await env.DB!.prepare("INSERT INTO group_members (group_id,user_id,role,joined_at) SELECT id,?,'member',? FROM app_groups WHERE id=? AND invite_code=? ON CONFLICT(group_id,user_id) DO NOTHING").bind(user.userId,new Date().toISOString(),group.id,code).run();
   const member=await env.DB!.prepare('SELECT role FROM group_members WHERE group_id=? AND user_id=?').bind(group.id,user.userId).first<{role:string}>();
   if(!member)throw new AccessError(409,'INVITE','邀請已更新，請重新取得邀請連結。');
   return json({group:{...group,role:member.role}});
  }
  const groupId=typeof data.groupId==='string'?data.groupId:'';
  const {group}=await requireGroupOwner(request,groupId);
  if(data.action==='theme'){
   if(!validGroupTheme(data.theme))throw new AccessError(400,'INPUT','請選擇有效的群組配色。');
   await env.DB!.prepare('UPDATE app_groups SET theme=? WHERE id=?').bind(data.theme,group.id).run();
   return json({group:{...group,theme:data.theme}});
  }
  if(data.action==='rename'){
   const name=typeof data.name==='string'?data.name.trim():'';
   if(!name||name.length>40)throw new AccessError(400,'INPUT','請輸入 1 至 40 字的群組名稱。');
   await env.DB!.prepare('UPDATE app_groups SET name=? WHERE id=?').bind(name,group.id).run();
   return json({group:{...group,name}});
  }
  if(data.action==='rotateInvite'){
   const code=crypto.randomUUID().replaceAll('-','');
   await env.DB!.batch([
    env.DB!.prepare('UPDATE app_groups SET invite_code=? WHERE id=?').bind(code,group.id),
    env.DB!.prepare('DELETE FROM group_join_requests WHERE group_id=?').bind(group.id),
   ]);
   return json({inviteCode:code});
  }
  throw new AccessError(400,'INPUT','不支援的群組操作。');
 }catch(e){return accessResponse(e)}
}
