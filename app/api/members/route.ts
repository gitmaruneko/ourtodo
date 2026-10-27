import {env} from 'cloudflare:workers';
import {requireAdmin,accessResponse,AccessError} from '@/lib/access';
import {validMemberAction} from '@/lib/line-core';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
 await requireAdmin(request);
 const result=await env.DB!.prepare('SELECT user_id AS userId,display_name AS displayName,status,created_at AS createdAt,updated_at AS updatedAt FROM members ORDER BY created_at DESC').all();
 return Response.json(result.results,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return accessResponse(e)}
}
export async function POST(request:Request){
 try{
 await requireAdmin(request);
 const data=await request.json() as {userId?:string;status?:string};
 const target=String(data.userId||''),status=String(data.status||'');
 validMemberAction(target,status,env.LINE_ADMIN_USER_ID!);
 const result=await env.DB!.prepare('UPDATE members SET status=?,updated_at=? WHERE user_id=?').bind(status,new Date().toISOString(),target).run();
 if(!result.meta.changes)throw new AccessError(404,'MISSING','找不到這位成員，請重新整理。');
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return accessResponse(e)}
}

