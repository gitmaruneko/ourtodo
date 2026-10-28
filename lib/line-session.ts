import type {LiffSDK} from './line-client';

export function withLineTimeout<T>(operation:Promise<T>,message:string,timeoutMs=15000):Promise<T>{
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error(message)),timeoutMs);
  operation.then(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)});
 });
}

export async function withLineRequestTimeout<T>(operation:(signal:AbortSignal)=>Promise<T>,message:string,timeoutMs=15000):Promise<T>{
 const controller=new AbortController();
 try{return await withLineTimeout(operation(controller.signal),message,timeoutMs)}finally{controller.abort()}
}

export function lineLoginRedirect(href:string,invitation=''){
 const current=new URL(href);
 let state:URL|undefined;
 const encoded=current.searchParams.get('liff.state');
 if(encoded){try{const candidate=new URL(encoded,current.origin);if(candidate.origin===current.origin)state=candidate}catch{}}
 const target=new URL(state?.pathname||current.pathname,current.origin);
 const group=current.searchParams.get('group')||state?.searchParams.get('group');
 const join=invitation||current.searchParams.get('join')||state?.searchParams.get('join');
 if(group)target.searchParams.set('group',group);
 if(join)target.searchParams.set('join',join);
 return target.toString();
}

export function invalidateLineSession(sdk:LiffSDK){
 // LIFF handles authentication itself inside its own browser.
 if(!sdk.isInClient()&&sdk.isLoggedIn())sdk.logout();
}

export function restartLineLogin(sdk:LiffSDK,options:{href:string;liffId:string;invitation?:string},navigate:(url:string)=>void){
 const redirect=lineLoginRedirect(options.href,options.invitation);
 if(sdk.isInClient()){
  navigate(lineAppUrl(options.liffId,options.href,options.invitation));
  return;
 }
 invalidateLineSession(sdk);
 sdk.login({redirectUri:redirect});
}

export function lineAppUrl(liffId:string,href:string,invitation=''){
 if(!/^\d+-[A-Za-z0-9]+$/.test(liffId))throw Error('LINE 登入設定無效，請聯絡管理員。');
 const target=new URL(lineLoginRedirect(href,invitation));
 return 'https://liff.line.me/'+liffId+(target.pathname==='/'?'':target.pathname)+target.search;
}
