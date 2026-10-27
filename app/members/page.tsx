'use client';
import {useEffect,useState} from 'react';
import {AccessGate,useAuth} from '@/components/access-gate';
import {ArrowLeft,Users,RefreshCw} from 'lucide-react';
type Member={userId:string;displayName:string;status:string;createdAt:string};
function Members(){
 const {user,authFetch}=useAuth(),[members,setMembers]=useState<Member[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(''),[notice,setNotice]=useState('');
 async function load(){setError('');try{const r=await authFetch('/api/members'),data=await r.json() as Member[] & {error?:string};if(!r.ok)throw Error(data.error);setMembers(data)}catch(e){setError(e instanceof Error?e.message:'無法讀取成員')}}
 useEffect(()=>{if(user.isAdmin)load()},[user.isAdmin]);
 async function change(id:string,status:string){
 setBusy(id);setError('');setNotice('');
 try{const r=await authFetch('/api/members',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:id,status})}),data=await r.json() as {error?:string};if(!r.ok)throw Error(data.error);setNotice(status==='approved'?'已核准這位成員':'已停用這位成員的存取權限');await load()}catch(e){setError(e instanceof Error?e.message:'更新失敗')}finally{setBusy('')}
 }
 return <div className="settings-page"><a className="back-link" href="/"><ArrowLeft size={16}/>回到任務清單</a><div className="settings-heading"><div><span className="eyebrow">OUR PEOPLE</span><h1>ourtodo 的成員</h1><p>核准你認識的成員，讓任務和照片留在自己人之間。</p></div>{user.isAdmin&&<button className="secondary" onClick={load}><RefreshCw size={16}/>重新整理</button>}</div>{!user.isAdmin?<div className="error">只有管理員可以查看或變更成員名單。</div>:<>{error&&<div role="alert" className="error">{error}</div>}{notice&&<p role="status" className="member-notice">{notice}</p>}<div className="member-list">{members.length?members.map(m=><article className="member-card" key={m.userId}><span className="member-avatar">{m.displayName.slice(0,1)}</span><div className="member-info"><b>{m.displayName}</b><small>{m.userId===user.userId?'管理員（你）':m.status==='approved'?'已核准':m.status==='blocked'?'已停用':'等待核准'}</small><span>申請日期 {new Date(m.createdAt).toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei'})}</span><details><summary>辨識帳號</summary><code>{m.userId}</code></details></div>{m.userId!==user.userId&&<div className="member-actions">{m.status!=='approved'&&<button className="primary" disabled={Boolean(busy)} onClick={()=>change(m.userId,'approved')}>核准加入</button>}{m.status!=='blocked'&&<button className="secondary" disabled={Boolean(busy)} onClick={()=>change(m.userId,'blocked')}>{m.status==='pending'?'拒絕':'停用'}</button>}</div>}</article>):<div className="empty"><Users/><p>目前尚無加入申請。家人使用 LINE 登入後會顯示在這裡。</p></div>}</div></>}</div>;
}
export default function Page(){return <AccessGate><Members/></AccessGate>}

