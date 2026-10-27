import {actor,accessResponse} from '@/lib/access';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{return Response.json(await actor(request,true),{headers:{'Cache-Control':'no-store'}});}
 catch(e){return accessResponse(e);}
}

