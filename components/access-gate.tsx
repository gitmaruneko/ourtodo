'use client';
import {createContext,useContext,useEffect,useState,useCallback,useRef,type ReactNode} from 'react';
import {CheckCheck,RefreshCw,ShieldCheck,LogOut,Users,ArrowLeft} from 'lucide-react';
import {loadLineSDK,type LiffSDK} from '@/lib/line-client';
import {invalidateLineSession,lineAppUrl,lineLoginRedirect,restartLineLogin,withLineTimeout,withLineRequestTimeout} from '@/lib/line-session';
type User={userId:string;displayName:string;provider:'line'|'platform';isAdmin:boolean;status:string;requestedGroups?:{id:string;name:string}[];invitedGroup?:{id:string;name:string;joined:boolean};inviteError?:string};
type Config={enabled:boolean;configured:boolean;liffId:string|null;uploadsEnabled:boolean};
type Auth={user:User;liffId:string|null;uploadsEnabled:boolean;authFetch:(input:string,init?:RequestInit)=>Promise<Response>};
const Context=createContext<Auth|null>(null);
export function useAuth(){const value=useContext(Context);if(!value)throw Error('缺少登入資訊');return value;}
export function AccessGate({children}:{children:ReactNode}){
 const [config,setConfig]=useState<Config|null>(null),[user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const sdk=useRef<LiffSDK|null>(null);
 const invitation=useRef('');
 const expired=useRef(false);
 const [needsLogin,setNeedsLogin]=useState(false);
 const [loadingMessage,setLoadingMessage]=useState('正在確認登入資訊…');
 const invalidate=useCallback((message='LINE 登入已過期，請重新登入。')=>{
  if(!expired.current){expired.current=true;try{if(sdk.current)invalidateLineSession(sdk.current)}catch{}}
  setNeedsLogin(true);setUser(null);setError(message);
 },[]);
 const authFetch=useCallback(async(input:string,init?:RequestInit)=>{
 const headers=new Headers(init?.headers);
 if(sdk.current){
 if(expired.current)throw Error('LINE 登入已過期，請重新登入。');
 const token=sdk.current.getIDToken();
 if(!token){invalidate();throw Error('LINE 登入已過期，請重新登入。');}
 headers.set('Authorization','Bearer '+token);
 }
 const result=await fetch(input,{...init,headers,cache:'no-store'});
 if(result.status===401||result.status===403){
 const body=await result.clone().json().catch(()=>({})) as {error?:string;code?:string};
 if(result.status===401&&body.code==='LOGIN')invalidate(body.error);
 else if(['PENDING','BLOCKED'].includes(body.code||'')&&input.split('?')[0]!=='/api/auth/me'){setUser(null);setError(body.error||'請重新登入');}
 }
 return result;
 },[invalidate]);
 async function load(){
 setLoading(true);setError('');setLoadingMessage('正在讀取登入設定…');
 try{
 const code=new URL(lineLoginRedirect(window.location.href)).searchParams.get('join');if(code)invitation.current=code;
 const c=await withLineRequestTimeout(signal=>fetch('/api/auth/config',{cache:'no-store',signal}).then(r=>{if(!r.ok)throw Error('無法讀取登入設定，請重新載入。');return r.json()}),'登入設定讀取逾時，請重新載入。',10000) as Config;setConfig(c);
 if(c.enabled){
 if(!c.configured||!c.liffId)throw Error('LINE 登入尚未完成設定，請聯絡網站管理員。');
 setLoadingMessage('正在連接 LINE 登入…');
 const liff=await loadLineSDK();
 setLoadingMessage('正在完成 LINE 登入確認…');
 await withLineTimeout(liff.init({liffId:c.liffId}),'LINE 登入確認逾時，請按「重新使用 LINE 登入」重試。');sdk.current=liff;
 if(!liff.isLoggedIn()){setUser(null);return;}
 expired.current=false;setNeedsLogin(false);
 }
 setLoadingMessage(invitation.current?'正在加入邀請群組…':'正在確認帳號與群組…');
 const {r,data}=await withLineRequestTimeout(async signal=>{const r=await authFetch('/api/auth/me'+(invitation.current?'?inviteCode='+encodeURIComponent(invitation.current):''),{signal}),data=await r.json() as User & {error?:string};return {r,data}},'帳號確認逾時，請按「重新使用 LINE 登入」重試。');
 if(!r.ok)throw Error(data.error||'無法確認登入資訊');
 if(data.status==='approved'&&data.invitedGroup?.joined){const url=new URL(window.location.href);url.searchParams.delete('join');url.searchParams.set('group',data.invitedGroup.id);window.history.replaceState(null,'',url);invitation.current='';}
 if(data.inviteError)setError(data.inviteError);
 setUser(data);
 }catch(e){setUser(null);setNeedsLogin(true);setError(e instanceof Error?e.message:'無法載入登入資訊。');}finally{setLoading(false);}
 }
 useEffect(()=>{load()},[]);
 useEffect(()=>{if(!user||user.status==='approved')return;const t=setInterval(()=>{if(document.visibilityState==='visible')load()},15000);return()=>clearInterval(t)},[user?.status]);
 function login(){
  if(!config?.liffId){setError('LINE 登入設定尚未準備好，請按重新載入後重試。');return;}
  try{if(!sdk.current){window.location.assign(lineAppUrl(config.liffId,window.location.href,invitation.current));return;}restartLineLogin(sdk.current,{href:window.location.href,liffId:config.liffId,invitation:invitation.current},url=>window.location.assign(url))}
  catch(e){setError(e instanceof Error?e.message:'無法重新登入，請關閉頁面後再開啟邀請連結。')}
 }
 function logout(){if(sdk.current?.isInClient())sdk.current.closeWindow();else{sdk.current?.logout();setUser(null);setError('');}}
 if(loading&&!user)return <div className="access-page"><span className="brand-icon"><CheckCheck/></span><p role="status">{loadingMessage}</p></div>;
 if(!user||user.status!=='approved')return <div className="access-page"><section className="access-card"><a className="brand" href="/"><span className="brand-icon"><CheckCheck/></span>ourtodo</a><span className="access-symbol"><ShieldCheck size={35}/></span><h1>{user?.status==='pending'?'等待管理員核准':user?.status==='blocked'?'目前無法進入':'用 LINE，一起辦好大小事'}</h1><p>{user?.status==='pending'?(user.requestedGroups?.length?'你的加入申請已送出，管理員核准後會自動加入以下群組。':'你的網站加入申請已送出，請等待管理員核准。'):user?.status==='blocked'?'如需重新加入，請聯絡這個空間的管理員。':'使用 LINE 名稱記錄任務，不需要另設網站密碼。'}</p>
 {user?.status==='pending'&&Boolean(user.requestedGroups?.length)&&<div className="pending-group-names"><small>申請加入的群組</small>{user.requestedGroups?.map(group=><b key={group.id}>{group.name}</b>)}</div>}{user&&<div className="signed-user"><b>{user.displayName}</b><small>已確認 LINE 身分</small></div>}
 {error&&<div className="error" role="alert">{error}</div>}
 {!user&&config?.enabled&&config.configured&&<button className="line-button" onClick={login}>{needsLogin?'重新使用 LINE 登入':'使用 LINE 登入'}</button>}
 {!user&&config&&!config.enabled&&<a className="primary" href="/signin-with-chatgpt?return_to=/" target="_top">登入目前的私人網站</a>}
 {!user&&config?.enabled&&!config.configured&&<a className="secondary" href="/line-setup">設定 LINE 登入</a>}
 <button className="secondary" onClick={()=>load()}><RefreshCw size={16}/>{user?'重新確認核准狀態':'重新載入'}</button>
 {user&&<button className="plain-button" onClick={logout}>離開此帳號</button>}
 <small className="access-footnote">只有獲准的成員能存取任務與照片。</small></section></div>;
 return <Context.Provider value={{user,authFetch,liffId:config?.liffId||null,uploadsEnabled:Boolean(config?.uploadsEnabled)}}><div className="identity-bar"><span><ShieldCheck size={15}/>{user.provider==='line'?user.displayName+' · LINE 已登入':'私人預覽 · LINE 尚未啟用'}</span><div>{user.isAdmin&&<a href="/members"><Users size={15}/>成員管理</a>}{user.provider==='platform'&&<a href="/line-setup">LINE 設定步驟</a>}{user.provider==='line'&&<button onClick={logout}><LogOut size={15}/>離開</button>}</div></div>{children}</Context.Provider>;
}
export function AuthImage({photoId,alt}:{photoId:string;alt:string}){
 const {authFetch}=useAuth(),[src,setSrc]=useState(''),[failed,setFailed]=useState(false);
 useEffect(()=>{
 let disposed=false,url='';
 setSrc('');setFailed(false);
 authFetch('/api/photos/'+photoId).then(async r=>{if(!r.ok)throw Error();return r.blob()}).then(blob=>{if(disposed)return;url=URL.createObjectURL(blob);setSrc(url)}).catch(()=>{if(!disposed)setFailed(true)});
 return()=>{disposed=true;if(url)URL.revokeObjectURL(url)};
 },[photoId,authFetch]);
 return src?<img src={src} alt={alt}/>:<span className="photo-placeholder">{failed?'照片暫時無法讀取':'正在讀取照片…'}</span>;
}

