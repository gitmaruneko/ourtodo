import {env} from 'cloudflare:workers';
import {accessResponse,AccessError} from '@/lib/access';
import {requireGroup,requireGroupOwner} from '@/lib/groups';
export const dynamic='force-dynamic';
const json=(data:unknown)=>Response.json(data,{headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 try{
  const {group}=await requireGroup(request);
  const members=await env.DB!.prepare('SELECT gm.user_id AS userId,m.display_name AS displayName,gm.role,m.status FROM group_members gm JOIN members m ON m.user_id=gm.user_id WHERE gm.group_id=? ORDER BY gm.role DESC,gm.joined_at').bind(group.id).all();
  const invite=group.role==='owner'?await env.DB!.prepare('SELECT invite_code AS inviteCode FROM app_groups WHERE id=?').bind(group.id).first<{inviteCode:string}>():null;
  return json({members:members.results,inviteCode:invite?.inviteCode||null});
 }catch(e){return accessResponse(e)}
}
export async function POST(request:Request){
 try{
  const {group,user}=await requireGroupOwner(request);
  let data:{userId?:unknown};
  try{data=await request.json() as {userId?:unknown}}catch{throw new AccessError(400,'INPUT','成員資料格式無效。')}
  if(typeof data?.userId!=='string'||!data.userId||data.userId===user.userId)throw new AccessError(400,'INPUT','無法移除群組管理員本人。');
  const result=await env.DB!.prepare("DELETE FROM group_members WHERE group_id=? AND user_id=? AND role<>'owner'").bind(group.id,data.userId).run();
  if(!result.meta.changes)throw new AccessError(404,'MISSING','找不到可移除的成員。');
  return json({ok:true});
 }catch(e){return accessResponse(e)}
}
