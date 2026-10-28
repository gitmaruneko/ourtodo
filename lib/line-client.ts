'use client';
export interface LiffSDK {
 init(options:{liffId:string}):Promise<void>;
 isLoggedIn():boolean;
 isInClient():boolean;
 login(options:{redirectUri:string}):void;
 logout():void;
 closeWindow():void;
 getIDToken():string|null;
}
declare global {interface Window {liff?:LiffSDK}}
let loading:Promise<LiffSDK>|undefined;
export function loadLineSDK():Promise<LiffSDK>{
 if(window.liff)return Promise.resolve(window.liff);
 if(!loading)loading=new Promise((resolve,reject)=>{
 const script=document.createElement('script');
 const fail=(message:string)=>{clearTimeout(timer);loading=undefined;script.remove();reject(Error(message))};
 const timer=setTimeout(()=>fail('LINE 登入元件載入逾時，請重新開啟 LINE 登入。'),10000);
 script.src='https://static.line-scdn.net/liff/edge/versions/2.31.1/sdk.js';
 script.async=true;
 script.onload=()=>{clearTimeout(timer);if(window.liff)resolve(window.liff);else fail('LINE 元件載入失敗，請重新開啟 LINE 登入。')};
 script.onerror=()=>fail('無法載入 LINE 登入，請檢查網路後重試。');
 document.head.appendChild(script);
 });
 return loading;
}

