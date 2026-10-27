import {env} from 'cloudflare:workers';
import {requireMember,accessResponse} from '@/lib/access';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{await requireMember(_request);}catch(e){return accessResponse(e);}
 if(!env.BUCKET)return Response.json({error:'照片儲存尚未開通。'},{status:503,headers:{'Cache-Control':'no-store'}});
 const {id}=await params;
 if(!/^[a-f0-9-]{36}$/.test(id))return new Response('找不到照片',{status:404});
 const referenced=await env.DB!.prepare("SELECT id FROM tasks WHERE EXISTS (SELECT 1 FROM json_each(tasks.photos) WHERE json_extract(value,'$.id')=?) LIMIT 1").bind(id).first();
 if(!referenced)return new Response('找不到照片',{status:404});
 const object=await env.BUCKET!.get(id);if(!object)return new Response('找不到照片',{status:404});
 return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}});
}
