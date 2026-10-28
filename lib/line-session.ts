import type {LiffSDK} from './line-client';

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
  if(!/^\d+-[A-Za-z0-9]+$/.test(options.liffId))throw Error('LINE 登入設定無效，請聯絡管理員。');
  const target=new URL(redirect);
  navigate('https://liff.line.me/'+options.liffId+(target.pathname==='/'?'':target.pathname)+target.search);
  return;
 }
 invalidateLineSession(sdk);
 sdk.login({redirectUri:redirect});
}
