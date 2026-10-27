import {env} from 'cloudflare:workers';
import {AccessError,verifyLineToken,assertApproved,type LineIdentity} from './line-core';
export {AccessError} from './line-core';
export type Member={userId:string;displayName:string;status:string;createdAt:string;updatedAt:string};
export type Actor={userId:string;displayName:string;provider:'line'|'platform';isAdmin:boolean;status:string};
export function lineConfig(){
 const enabled=env.AUTH_MODE!=='sites-private';
 const configured=Boolean(env.LINE_CHANNEL_ID&&/^\d+$/.test(env.LINE_CHANNEL_ID)&&env.LINE_LIFF_ID&&/^\d+-[a-zA-Z0-9]+$/.test(env.LINE_LIFF_ID)&&env.LINE_ADMIN_USER_ID&&/^U[a-f0-9]{32}$/.test(env.LINE_ADMIN_USER_ID));
 return {enabled,configured,liffId:configured?env.LINE_LIFF_ID:null};
}
export function accessResponse(error:unknown){
 const known=error instanceof AccessError;
 return Response.json({error:known?error.message:'服務暫時無法使用，請稍後重試。',code:known?error.code:'SERVER'},{status:known?error.status:503,headers:{'Cache-Control':'no-store'}});
}
export function privateActor(request:Request):Actor{
 // Sites supplies these trusted headers only after its own hosted sign-in.
 const id=request.headers.get('oai-authenticated-user-id');
 if(!id)throw new AccessError(401,'LOGIN','請先登入目前的私人網站。');
 let name=request.headers.get('oai-authenticated-user-full-name')||'網站使用者';
 if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(name)}catch{name='網站使用者'}}
 return {userId:id,displayName:name,provider:'platform',isAdmin:false,status:'approved'};
}
const cache=new Map<string,{identity:LineIdentity;until:number}>();
export async function lineIdentity(request:Request):Promise<LineIdentity>{
 const config=lineConfig();
 if(!config.enabled||!config.configured)throw new AccessError(503,'CONFIG','LINE 登入設定尚未完成，請聯絡網站管理員。');
 const header=request.headers.get('authorization')||'';
 if(!header.startsWith('Bearer '))throw new AccessError(401,'LOGIN','請先使用 LINE 登入。');
 const token=header.slice(7);
 const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const previous=cache.get(key),now=Date.now();
 if(previous&&previous.until>now&&previous.identity.expiresAt>now)return previous.identity;
 const identity=await verifyLineToken(token,env.LINE_CHANNEL_ID!);
 if(cache.size>=250)cache.clear();
 cache.set(key,{identity,until:Math.min(identity.expiresAt,now+60000)});
 return identity;
}
export async function actor(request:Request,enroll=false):Promise<Actor>{
 if(!lineConfig().enabled)return privateActor(request);
 const identity=await lineIdentity(request);
 const isAdmin=identity.userId===env.LINE_ADMIN_USER_ID;
 const now=new Date().toISOString();
 if(enroll){
 await env.DB!.prepare("INSERT INTO members (user_id,display_name,status,created_at,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,status=CASE WHEN ?=1 THEN 'approved' ELSE members.status END,updated_at=excluded.updated_at").bind(identity.userId,identity.displayName,isAdmin?'approved':'pending',now,now,isAdmin?1:0).run();
 }
 const member=await env.DB!.prepare('SELECT status FROM members WHERE user_id=?').bind(identity.userId).first<{status:string}>();
 return {...identity,provider:'line',isAdmin,status:isAdmin?'approved':member?.status||'pending'};
}
export async function requireMember(request:Request){
 const user=await actor(request);
 assertApproved(user.status,user.isAdmin);
 return user;
}
export async function requireAdmin(request:Request){
 const user=await requireMember(request);
 if(user.provider!=='line'||!user.isAdmin)throw new AccessError(403,'ADMIN','只有管理員可以管理成員。');
 return user;
}

