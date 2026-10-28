import {actor,accessResponse} from '@/lib/access';
import {env} from 'cloudflare:workers';
import {applyInvitation,pendingGroupRequests} from '@/lib/group-requests';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
  const user=await actor(request,true);
  const code=new URL(request.url).searchParams.get('inviteCode');
  const invitation=code?await applyInvitation(user,code):{};
  if(user.provider==='line'){
   const current=await env.DB!.prepare('SELECT status FROM members WHERE user_id=?').bind(user.userId).first<{status:string}>();
   user.status=user.isAdmin?'approved':current?.status||'pending';
  }
  const requestedGroups=user.status==='pending'?await pendingGroupRequests(user.userId):[];
  return Response.json({...user,...invitation,requestedGroups},{headers:{'Cache-Control':'no-store'}});
 }
 catch(e){return accessResponse(e);}
}

