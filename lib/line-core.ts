export type LineIdentity={userId:string;displayName:string;expiresAt:number};
export class AccessError extends Error {
 status:number;code:string;
 constructor(status:number,code:string,message:string){super(message);this.status=status;this.code=code;}
}
export async function verifyLineToken(token:string,channelId:string,fetcher:typeof fetch=fetch,now=Date.now()):Promise<LineIdentity>{
 if(!/^\d+$/.test(channelId))throw new AccessError(503,'CONFIG','LINE 登入設定尚未完成。');
 if(!token||token.length>8192||token.split('.').length!==3)throw new AccessError(401,'LOGIN','請重新使用 LINE 登入。');
 let response:Response;
 try{response=await fetcher('https://api.line.me/oauth2/v2.1/verify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({id_token:token,client_id:channelId}),signal:AbortSignal.timeout(10000)});}
 catch{throw new AccessError(503,'LINE_UNAVAILABLE','暫時無法確認 LINE 身分，請稍後重試。');}
 if(response.status===429||response.status>=500)throw new AccessError(503,'LINE_UNAVAILABLE','LINE 登入服務忙碌，請稍後重試。');
 if(!response.ok)throw new AccessError(401,'LOGIN','LINE 登入已過期或無效，請重新登入。');
 const data=await response.json() as Record<string,unknown>;
 if(data.iss!=='https://access.line.me'||data.aud!==channelId||typeof data.sub!=='string'||!/^U[a-f0-9]{32}$/.test(data.sub)||typeof data.exp!=='number'||data.exp*1000<=now)
 throw new AccessError(401,'LOGIN','LINE 身分驗證失敗，請重新登入。');
 if(typeof data.name!=='string'||!data.name.trim())throw new AccessError(403,'PROFILE_SCOPE','請允許 LINE 個人檔案權限後重新登入。');
 return {userId:data.sub,displayName:data.name.trim().slice(0,100),expiresAt:data.exp*1000};
}
export function assertApproved(status:string|undefined,admin:boolean){
 if(admin)return;
 if(status!=='approved')throw new AccessError(403,status==='blocked'?'BLOCKED':'PENDING',status==='blocked'?'此帳號目前無法使用這個共用空間。':'已收到加入申請，請等待管理員核准。');
}
export function validMemberAction(target:string,status:string,adminId:string){
 if(!/^U[a-f0-9]{32}$/.test(target)||!['approved','blocked'].includes(status))throw new AccessError(400,'INPUT','成員資料或操作無效。');
 if(target===adminId)throw new AccessError(400,'OWNER','無法變更管理員本人的權限。');
}

