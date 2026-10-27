'use client';
import {createContext,useContext,useEffect,useState,useCallback,useRef,type ReactNode} from 'react';
import {CheckCheck,RefreshCw,ShieldCheck,LogOut,Users,ArrowLeft} from 'lucide-react';
import {loadLineSDK,type LiffSDK} from '@/lib/line-client';
type User={userId:string;displayName:string;provider:'line'|'platform';isAdmin:boolean;status:string};
type Config={enabled:boolean;configured:boolean;liffId:string|null};
type Auth={user:User;authFetch:(input:string,init?:RequestInit)=>Promise<Response>};
const Context=createContext<Auth|null>(null);
export function useAuth(){const value=useContext(Context);if(!value)throw Error('缺少登入資訊');return value;}
export function AccessGate({children}:{children:ReactNode}){
 const [config,setConfig]=useState<Config|null>(null),[user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const sdk=useRef<LiffSDK|null>(null);
 const authFetch=useCallback(async(input:string,init?:RequestInit)=>{
 const headers=new Headers(init?.headers);
 if(sdk.current){
 const token=sdk.current.getIDToken();
 if(!token)throw Error('LINE 登入已過期，請關閉後重新開啟連結。');
 headers.set('Authorization','Bearer '+token);
 }
 const result=await fetch(input,{...init,headers,cache:'no-store'});
 if((result.status===401||result.status===403)&&input!=='/api/auth/me'){
 const body=await result.clone().json() as {error?:string;code?:string};
 if(['LOGIN','PENDING','BLOCKED'].includes(body.code||'')){setUser(null);setError(body.error||'請重新登入');}
 }
 return result;
 },[]);
 async function load(){
 setLoading(true);setError('');
 try{
 const c=await (await fetch('/api/auth/config',{cache:'no-store'})).json() as Config;setConfig(c);
 if(c.enabled){
 if(!c.configured||!c.liffId)throw Error('LINE 登入尚未完成設定，請聯絡網站管理員。');
 const liff=await loadLineSDK();await liff.init({liffId:c.liffId});sdk.current=liff;
 if(!liff.isLoggedIn()){setUser(null);return;}
 }
 const r=await authFetch('/api/auth/me'),data=await r.json() as User & {error?:string};
 if(!r.ok)throw Error(data.error||'無法確認登入資訊');
 setUser(data);
 }catch(e){setUser(null);setError(e instanceof Error?e.message:'無法載入登入資訊。');}finally{setLoading(false);}
 }
 useEffect(()=>{load()},[]);
 useEffect(()=>{if(!user||user.status==='approved')return;const t=setInterval(()=>{if(document.visibilityState==='visible')load()},15000);return()=>clearInterval(t)},[user?.status]);
 function login(){sdk.current?.login({redirectUri:window.location.origin+'/'});}
 function logout(){if(sdk.current?.isInClient())sdk.current.closeWindow();else{sdk.current?.logout();setUser(null);setError('');}}
 if(loading&&!user)return <div className="access-page"><span className="brand-icon"><CheckCheck/></span><p>正在確認登入資訊…</p></div>;
 if(!user||user.status!=='approved')return <div className="access-page"><section className="access-card"><a className="brand" href="/"><span className="brand-icon"><CheckCheck/></span>ourtodo</a><span className="access-symbol"><ShieldCheck size={35}/></span><h1>{user?.status==='pending'?'等待家人核准':user?.status==='blocked'?'目前無法進入':'用 LINE，一起辦好大小事'}</h1><p>{user?.status==='pending'?'你的加入申請已送出。管理員核准後，就能查看任務和照片。':user?.status==='blocked'?'如需重新加入，請聯絡這個空間的管理員。':'使用 LINE 名稱記錄任務，不需要另設網站密碼。'}</p>
 {user&&<div className="signed-user"><b>{user.displayName}</b><small>已確認 LINE 身分</small></div>}
 {error&&<div className="error" role="alert">{error}</div>}
 {!user&&config?.enabled&&config.configured&&<button className="line-button" onClick={login}>使用 LINE 登入</button>}
 {!user&&config&&!config.enabled&&<a className="primary" href="/signin-with-chatgpt?return_to=/" target="_top">登入目前的私人網站</a>}
 {!user&&config?.enabled&&!config.configured&&<a className="secondary" href="/line-setup">設定 LINE 登入</a>}
 <button className="secondary" onClick={()=>load()}><RefreshCw size={16}/>{user?'重新確認核准狀態':'重新載入'}</button>
 {user&&<button className="plain-button" onClick={logout}>離開此帳號</button>}
 <small className="access-footnote">只有獲准的成員能存取任務與照片。</small></section></div>;
 return <Context.Provider value={{user,authFetch}}><div className="identity-bar"><span><ShieldCheck size={15}/>{user.provider==='line'?user.displayName+' · LINE 已登入':'私人預覽 · LINE 尚未啟用'}</span><div>{user.isAdmin&&<a href="/members"><Users size={15}/>成員管理</a>}{user.provider==='platform'&&<a href="/line-setup">LINE 設定步驟</a>}{user.provider==='line'&&<button onClick={logout}><LogOut size={15}/>離開</button>}</div></div>{children}</Context.Provider>;
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

