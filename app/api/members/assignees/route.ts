import {env} from 'cloudflare:workers';
import {accessResponse} from '@/lib/access';
import {requireGroup} from '@/lib/groups';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
  const {user,group}=await requireGroup(request);
  const result=await env.DB!.prepare("SELECT DISTINCT m.display_name AS displayName FROM members m JOIN group_members gm ON gm.user_id=m.user_id WHERE gm.group_id=? AND m.status='approved' ORDER BY m.display_name").bind(group.id).all<{displayName:string}>();
  const names=Array.from(new Set([...result.results.map(m=>m.displayName),user.displayName])).sort((a,b)=>a.localeCompare(b,'zh-TW'));
  return Response.json(names,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return accessResponse(e)}
}
