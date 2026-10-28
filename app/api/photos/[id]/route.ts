import {env} from 'cloudflare:workers';
import {requireMember,accessResponse} from '@/lib/access';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 let user;try{user=await requireMember(_request);}catch(e){return accessResponse(e);}
 if(!env.BUCKET)return Response.json({error:'照片儲存尚未開通。'},{status:503,headers:{'Cache-Control':'no-store'}});
 const {id}=await params;
 if(!/^[a-f0-9-]{36}$/.test(id))return new Response('找不到照片',{status:404});
 const referenced=await env.DB!.prepare("SELECT tasks.id FROM tasks JOIN group_members gm ON gm.group_id=tasks.group_id WHERE gm.user_id=? AND EXISTS (SELECT 1 FROM json_each(tasks.photos) WHERE json_extract(value,'$.id')=?) LIMIT 1").bind(user.userId,id).first();
 if(!referenced)return new Response('找不到照片',{status:404});
 const object=await env.BUCKET!.get(id);if(!object)return new Response('找不到照片',{status:404});
 return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
