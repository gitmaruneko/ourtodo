'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Users,Plus,X,Copy,RefreshCw,CheckCheck,Check} from 'lucide-react';
import {useAuth} from '@/components/access-gate';
import TaskBoard from '@/components/task-board';
import type {Group} from '@/lib/groups';
import {lineAppUrl} from '@/lib/line-session';
import {groupThemes,groupThemeStyle,type GroupTheme} from '@/lib/group-themes';
type Member={userId:string;displayName:string;role:string;status:string};

export default function GroupSpace(){
 const {user,authFetch,liffId}=useAuth();
 const [groups,setGroups]=useState<Group[]>([]),[groupId,setGroupId]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [name,setName]=useState(''),[invite,setInvite]=useState(''),[members,setMembers]=useState<Member[]>([]),[inviteCode,setInviteCode]=useState(''),[memberLoading,setMemberLoading]=useState(false),[memberError,setMemberError]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[dialogError,setDialogError]=useState('');
 const manager=useRef<HTMLDialogElement>(null),memberRequest=useRef(0);
 const active=groups.find(g=>g.id===groupId);
 const storageKey='ourtodo-group-'+user.userId;
 function remember(id:string){
  try{localStorage.setItem(storageKey,id)}catch{}
  const url=new URL(window.location.href);url.searchParams.set('group',id);url.searchParams.delete('join');window.history.replaceState(null,'',url);
 }
 async function request(input:string,init?:RequestInit){
  const r=await authFetch(input,init);const data=await r.json() as any;
  if(!r.ok)throw Error(data.error||'操作失敗，請重試。');return data;
 }
 async function loadGroups(preferred?:string){
  const list=await request('/api/groups') as Group[];setGroups(list);
  let saved='';try{saved=localStorage.getItem(storageKey)||''}catch{}
  const desired=preferred||new URL(window.location.href).searchParams.get('group')||saved;
  const next=list.find(g=>g.id===desired)?.id||list[0]?.id||'';setGroupId(next);
  if(next&&!new URL(window.location.href).searchParams.has('join'))remember(next);
  return next;
 }
 async function initialize(){
  setLoading(true);setError('');
  try{const id=await loadGroups();const code=new URL(window.location.href).searchParams.get('join');if(code){setInvite(code);manager.current?.showModal();loadMembers(id)}}
  catch(e){setError(e instanceof Error?e.message:'無法讀取群組。')}finally{setLoading(false)}
 }
 useEffect(()=>{initialize()},[]);
 useEffect(()=>{
  let active=true;
  const timer=setInterval(()=>{if(document.visibilityState==='visible')request('/api/groups').then((list:Group[])=>{if(active){setGroups(list);setGroupId(id=>list.some(g=>g.id===id)?id:list[0]?.id||'')}}).catch(()=>{})},30000);
  return()=>{active=false;clearInterval(timer)};
 },[]);
 async function loadMembers(id=groupId){
  const sequence=++memberRequest.current;setMemberLoading(true);setMemberError('');setMembers([]);setInviteCode('');
  if(!id){setMemberLoading(false);return}
  try{const data=await request('/api/groups/members?groupId='+encodeURIComponent(id));if(sequence===memberRequest.current){setMembers(data.members);setInviteCode(data.inviteCode||'')}}
  catch(e){if(sequence===memberRequest.current)setMemberError(e instanceof Error?e.message:'無法讀取成員。')}finally{if(sequence===memberRequest.current)setMemberLoading(false)}
 }
 function manage(){setMessage('');setDialogError('');manager.current?.showModal();loadMembers()}
 async function perform(action:string,extra:Record<string,string>={}){
  return request('/api/groups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,groupId,...extra})});
 }
 async function enter(action:'create'|'join',event:React.FormEvent){
  event.preventDefault();setBusy(true);setDialogError('');setMessage('');
  try{
   let code=invite.trim();try{code=new URL(code).searchParams.get('join')||code}catch{}
   const data=await perform(action,action==='create'?{name}:{inviteCode:code});
   await loadGroups(data.group.id);remember(data.group.id);setName('');setInvite('');manager.current?.close();
  }catch(e){setDialogError(e instanceof Error?e.message:'操作失敗，請重試。')}finally{setBusy(false)}
 }
 async function rename(name:string){
  const data=await perform('rename',{name});setGroups(list=>list.map(g=>g.id===data.group.id?data.group:g));
 }
 async function changeTheme(theme:GroupTheme){
  setBusy(true);setDialogError('');setMessage('');
  try{const data=await perform('theme',{theme});setGroups(list=>list.map(g=>g.id===data.group.id?data.group:g));setMessage('群組配色已儲存。')}
  catch(e){setDialogError(e instanceof Error?e.message:'配色儲存失敗，請重試。')}finally{setBusy(false)}
 }
 async function removeMember(id:string){
  setBusy(true);setDialogError('');
  try{await request('/api/groups/members?groupId='+encodeURIComponent(groupId),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:id})});await loadMembers();setMessage('已移除這位群組成員。')}
  catch(e){setDialogError(e instanceof Error?e.message:'無法移除成員。')}finally{setBusy(false)}
 }
 async function rotate(){
  setBusy(true);setDialogError('');
  try{const data=await perform('rotateInvite');setInviteCode(data.inviteCode);setMessage('已更新邀請連結，舊連結已失效。')}
  catch(e){setDialogError(e instanceof Error?e.message:'更新失敗。')}finally{setBusy(false)}
 }
 const link=inviteCode&&typeof window!=='undefined'?(liffId?lineAppUrl(liffId,window.location.origin+'/',inviteCode):window.location.origin+'/?join='+inviteCode):'';
 const tools=<div className="group-toolbar"><label><Users size={17}/><select aria-label="切換群組" value={groupId} onChange={e=>{setGroupId(e.target.value);remember(e.target.value)}}>{groups.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select></label><button className="secondary" onClick={manage}><Users size={15}/>群組管理</button></div>;
 return <>
 {loading?<div className="group-welcome"><CheckCheck/><p>正在讀取群組…</p></div>:error?<div className="group-welcome"><p role="alert">{error}</p><button className="secondary" onClick={initialize}>重新載入</button></div>:active?<TaskBoard key={active.id} group={active} groupTools={tools} onRename={rename}/>:<div className="group-welcome"><span className="brand-icon"><CheckCheck/></span><h1>建立你的第一個群組</h1><p>每個群組各自保存任務與成員，加入後就能一起分工。</p><button className="primary" onClick={manage}><Plus size={18}/>建立或加入群組</button></div>}
 <dialog ref={manager} className="group-dialog" data-theme={active?.theme} style={groupThemeStyle(active?.theme) as CSSProperties} onCancel={e=>{if(busy)e.preventDefault()}}><div className="dialog-header"><h2>群組管理</h2><button aria-label="關閉群組管理" disabled={busy} onClick={()=>manager.current?.close()}><X/></button></div><div className="group-dialog-body">
 {dialogError&&<div className="error" role="alert">{dialogError}</div>}{message&&<p className="group-message" role="status">{message}</p>}
 {active&&<section className="theme-section"><h3>{active.name} · 清單配色</h3><p className="group-help">{active.role==='owner'?'點選即儲存，同群組成員會使用相同配色。':'配色由群組管理員設定。'}</p><div className="theme-options" role="group" aria-label="群組清單配色">{groupThemes.map(theme=><button type="button" key={theme.id} disabled={busy||active.role!=='owner'} aria-pressed={active.theme===theme.id} aria-label={theme.name} className="theme-option" style={{'--theme-swatch':theme.color,'--theme-background':theme.background} as CSSProperties} onClick={()=>changeTheme(theme.id)}><span className="theme-swatch">{active.theme===theme.id&&<Check size={17}/>}</span><span>{theme.name}</span></button>)}</div></section>}
 <section><h3>建立群組</h3><form className="group-entry" onSubmit={e=>enter('create',e)}><input aria-label="新群組名稱" placeholder="例如：家庭、工作團隊" maxLength={40} required value={name} onChange={e=>setName(e.target.value)}/><button className="primary" disabled={busy}>建立</button></form></section>
 <section><h3>加入群組</h3><form className="group-entry" onSubmit={e=>enter('join',e)}><input aria-label="群組邀請連結或邀請碼" placeholder="貼上邀請連結或邀請碼" required value={invite} onChange={e=>setInvite(e.target.value)}/><button className="primary" disabled={busy}>加入</button></form><p className="group-help">從有效邀請連結登入，即自動加入對應群組，不需等待核准。</p></section>
 {active&&<section><h3>{active.name} · 成員</h3>{memberLoading?<p>正在讀取成員…</p>:memberError?<div role="alert">{memberError}<button className="secondary" onClick={()=>loadMembers()}>重試</button></div>:<ul className="group-members">{members.map(m=><li key={m.userId}><span>{m.displayName}{m.userId===user.userId?'（你）':''}<small>{m.role==='owner'?'群組管理員':m.status==='approved'?'成員':'網站帳號已停用'}</small></span>{active.role==='owner'&&m.role!=='owner'&&<button disabled={busy} className="secondary" onClick={()=>removeMember(m.userId)}>移除</button>}</li>)}</ul>}
 {active.role==='owner'&&inviteCode&&<div className="group-invite"><h3>邀請成員</h3><p className="group-help">持有此連結的人完成 LINE 登入後，會自動加入本群組。請只分享給要邀請的人。</p><input aria-label="本群組邀請連結" readOnly value={link} onFocus={e=>e.target.select()}/><div><button disabled={busy} className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(link);setMessage('已複製邀請連結。')}catch{setMessage('請選取上方連結後複製。')}}}><Copy size={15}/>複製邀請連結</button><button disabled={busy} className="secondary" onClick={rotate}><RefreshCw size={14}/>更新邀請連結</button></div></div>}
 </section>}
 </div></dialog>
 </>;
}
