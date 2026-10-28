import {useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {RotateCcw,Users,X} from 'lucide-react';
import TaskBoard from '../components/task-board';
import {groupThemes} from '../lib/group-themes';
import {DemoAuth} from './auth';
import {createDemoStore} from './store';
import type {Photo} from '../lib/tasks';
import '../app/globals.css';
import './style.css';

const store=createDemoStore({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
function Demo(){
 const [groups,setGroups]=useState(store.groups),[selected,setSelected]=useState(groups[0].id),[revision,setRevision]=useState(0),[error,setError]=useState(store.startupError);
 const settings=useRef<HTMLDialogElement>(null),resetDialog=useRef<HTMLDialogElement>(null);
 const group=groups.find(g=>g.id===selected)||groups[0];
 const refresh=()=>setGroups(store.groups());
 async function upload(files:FileList):Promise<Photo[]>{
  if(files.length>3)throw Error('每個任務最多 3 張照片。');
  for(const file of Array.from(files))if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>700*1024)throw Error('請使用 700 KB 以下的 PNG、JPEG 或 WebP 圖片。');
  return Promise.all(Array.from(files).map(file=>new Promise<Photo>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{try{resolve(store.stagePhoto(file.name,String(reader.result)))}catch(e){reject(e)}};reader.onerror=()=>reject(Error('無法讀取照片'));reader.readAsDataURL(file)})));
 }
 const tools=<div className="group-toolbar"><label><Users size={17}/><select aria-label="切換群組" value={group.id} onChange={e=>setSelected(e.target.value)}>{groups.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select></label><button className="secondary" onClick={()=>settings.current?.showModal()}>群組配色</button></div>;
 return <DemoAuth store={store}><div className="demo-banner"><div><b>DEMO 體驗模式</b><span>僅儲存在此瀏覽器 · 無 LINE 登入 · 請勿輸入敏感資料</span></div><button onClick={()=>resetDialog.current?.showModal()}><RotateCcw size={15}/>重設示範資料</button></div>{error&&<div className="demo-error" role="alert">{error}</div>}<TaskBoard key={group.id+':'+revision} group={group} groupTools={tools} storageMode="local" onPhotoUpload={upload} onRename={async name=>{store.updateGroup(group.id,{name});refresh()}}/>
 <dialog ref={settings} className="group-dialog"><div className="dialog-header"><h2>示範群組配色</h2><button aria-label="關閉配色" onClick={()=>settings.current?.close()}><X/></button></div><div className="group-dialog-body"><p>這裡的群組及成員都是虛構資料，變更只會保存在你的瀏覽器。</p><div className="theme-options">{groupThemes.map(t=><button key={t.id} aria-pressed={group.theme===t.id} onClick={()=>{try{store.updateGroup(group.id,{theme:t.id});refresh();setError('')}catch(e){setError((e as Error).message)}}}>{t.name}</button>)}</div></div></dialog>
 <dialog ref={resetDialog} className="group-dialog demo-reset"><div className="dialog-header"><h2>重設示範資料？</h2></div><div className="group-dialog-body"><p>會移除你在這個 Demo 新增的任務、照片及配色，恢復預設範例。</p></div><div className="dialog-footer"><button className="secondary" onClick={()=>resetDialog.current?.close()}>取消</button><button className="primary" onClick={()=>{try{store.reset();refresh();setSelected('home');setRevision(n=>n+1);setError('');resetDialog.current?.close()}catch(e){setError((e as Error).message)}}}>確認重設</button></div></dialog>
 <footer className="demo-footer">本機互動展示 · 不支援多人同步 · <a href="https://github.com/gitmaruneko/ourtodo" target="_blank" rel="noreferrer">查看開源專案</a></footer></DemoAuth>;
}
createRoot(document.getElementById('root')!).render(<Demo/>);
