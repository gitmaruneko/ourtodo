import {env} from 'cloudflare:workers';
import {requireAdmin,accessResponse,AccessError} from '@/lib/access';
import {validMemberAction} from '@/lib/line-core';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
 await requireAdmin(request);
 const [result,memberships,requests]=await Promise.all([
  env.DB!.prepare('SELECT user_id AS userId,display_name AS displayName,status,created_at AS createdAt,updated_at AS updatedAt FROM members ORDER BY created_at DESC').all<{userId:string}>(),
  env.DB!.prepare('SELECT gm.user_id AS userId,g.id,g.name,g.theme,gm.role FROM group_members gm JOIN app_groups g ON g.id=gm.group_id ORDER BY g.name,g.id').all<{userId:string;id:string;name:string;theme:string;role:string}>(),
  env.DB!.prepare('SELECT r.user_id AS userId,g.id,g.name,g.theme FROM group_join_requests r JOIN app_groups g ON g.id=r.group_id AND g.invite_code=r.invite_code ORDER BY r.requested_at,g.id').all<{userId:string;id:string;name:string;theme:string}>(),
 ]);
 const byUser=new Map<string,{id:string;name:string;theme:string;role:string}[]>();
 for(const {userId,...group} of memberships.results){const list=byUser.get(userId)||[];list.push(group);byUser.set(userId,list)}
 const pendingByUser=new Map<string,{id:string;name:string;theme:string}[]>();
 for(const {userId,...group} of requests.results){const list=pendingByUser.get(userId)||[];list.push(group);pendingByUser.set(userId,list)}
 return Response.json(result.results.map(member=>({...member,groups:byUser.get(member.userId)||[],requestedGroups:pendingByUser.get(member.userId)||[]})),{headers:{'Cache-Control':'no-store'}});
 }catch(e){return accessResponse(e)}
}
export async function POST(request:Request){
 try{
 await requireAdmin(request);
 const data=await request.json() as {userId?:string;status?:string};
 const target=String(data.userId||''),status=String(data.status||'');
 validMemberAction(target,status,env.LINE_ADMIN_USER_ID!);
 const now=new Date().toISOString();
 const statements=[env.DB!.prepare('UPDATE members SET status=?,updated_at=? WHERE user_id=?').bind(status,now,target)];
 if(status==='approved')statements.push(env.DB!.prepare("INSERT INTO group_members (group_id,user_id,role,joined_at) SELECT r.group_id,r.user_id,'member',? FROM group_join_requests r JOIN app_groups g ON g.id=r.group_id AND g.invite_code=r.invite_code JOIN members m ON m.user_id=r.user_id WHERE r.user_id=? AND m.status='approved' ON CONFLICT(group_id,user_id) DO NOTHING").bind(now,target));
 statements.push(env.DB!.prepare('DELETE FROM group_join_requests WHERE user_id=?').bind(target));
 const result=await env.DB!.batch(statements);
 if(!result[0].meta.changes)throw new AccessError(404,'MISSING','找不到這位成員，請重新整理。');
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return accessResponse(e)}
}

