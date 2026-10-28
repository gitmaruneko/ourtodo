import {env} from 'cloudflare:workers';
import {requireMember,accessResponse} from '@/lib/access';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 try{
  const user=await requireMember(request);
  const preferences=await env.DB!.prepare('SELECT board_title FROM user_preferences WHERE user_id=?').bind(user.userId).first<{board_title:string}>();
  return json({boardTitle:preferences?.board_title||'我們的待辦清單'});
 }catch(e){return accessResponse(e)}
}
export async function PUT(request:Request){
 let user;
 try{user=await requireMember(request)}catch(e){return accessResponse(e)}
 let data;
 try{data=await request.json() as {boardTitle?:unknown}}catch{return json({error:'標題格式無效。'},400)}
 const title=typeof data?.boardTitle==='string'?data.boardTitle.trim():'';
 if(!title||title.length>40)return json({error:'請輸入 1 至 40 字的標題。'},400);
 try{
  await env.DB!.prepare('INSERT INTO user_preferences (user_id,board_title) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET board_title=excluded.board_title').bind(user.userId,title).run();
  return json({boardTitle:title});
 }catch{return json({error:'標題儲存失敗，請重試。'},503)}
}
