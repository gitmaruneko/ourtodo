import {statuses,validDate,type Task,type Photo} from '../lib/tasks';
import {validGroupTheme} from '../lib/group-themes';
import type {Group} from '../lib/groups';

export const storageKey='ourtodo-demo:v1';
export const demoName='體驗使用者';
type StoredPhoto=Photo&{data:string};
type State={schema:1;groups:Group[];tasks:Record<string,Task[]>;photos:Record<string,StoredPhoto>};
type Storage=Pick<globalThis.Storage,'getItem'|'setItem'>;
const date=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)};
export function seed():State{
 const now=new Date().toISOString();
 const task=(id:string,title:string,offset:number,assignee:string,status:string):Task=>({id,title,date:date(offset),assignee,status,description:'這是公開 Demo 的虛構範例，可以自由修改。',notes:'',creator:demoName,photos:[],version:1,createdAt:now,updatedAt:now});
 return {schema:1,groups:[{id:'home',name:'我們家的生活清單',theme:'sage',role:'owner'},{id:'weekend',name:'週末出遊計畫',theme:'ocean',role:'owner'}],tasks:{home:[task('sample-1','整理本週採買清單',0,demoName,'未處理'),task('sample-2','安排週末家庭聚餐',1,'示範夥伴','安排中'),task('sample-3','確認居家用品補貨',2,'待認領','需協助'),task('sample-4','繳交本月水電費',-1,demoName,'已完成')],weekend:[task('sample-trip','規劃週末散步路線',2,demoName,'未處理')]},photos:{}};
}
export function createDemoStore(storage:Storage){
 let state:State;
 let startupError='';
 try{const raw=storage.getItem(storageKey);state=raw?JSON.parse(raw):seed();if(state.schema!==1||!Array.isArray(state.groups)||!state.groups.length||!state.tasks||!state.photos)throw Error('invalid')}
 catch{state=seed();startupError='無法讀取先前的本機資料，已載入示範任務。'}
 const staged=new Map<string,StoredPhoto>();
 const persist=(next:State)=>{try{storage.setItem(storageKey,JSON.stringify(next))}catch{throw Error('本機儲存失敗或空間不足。請移除部分照片，或允許瀏覽器儲存網站資料後再試。')}state=next};
 const groups=()=>structuredClone(state.groups);
 const updateGroup=(id:string,changes:{name?:string;theme?:string})=>{
  if(changes.name!==undefined&&(!changes.name.trim()||changes.name.trim().length>40))throw Error('請輸入 1 至 40 字的名稱。');
  if(changes.theme!==undefined&&!validGroupTheme(changes.theme))throw Error('請選擇有效配色。');
  const next=structuredClone(state),g=next.groups.find(g=>g.id===id);if(!g)throw Error('找不到群組');
  if(changes.name!==undefined)g.name=changes.name.trim();if(validGroupTheme(changes.theme))g.theme=changes.theme;persist(next);
 };
 const stagePhoto=(name:string,data:string)=>{if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data))throw Error('僅支援 PNG、JPEG 與 WebP 圖片。');const p={id:crypto.randomUUID(),name,data};staged.set(p.id,p);return {id:p.id,name:p.name}};
 const photo=(id:string)=>staged.get(id)?.data||state.photos[id]?.data||'';
 // This adapter never calls fetch: the shared UI talks only to this browser's data.
 const request=async(input:string,init?:RequestInit):Promise<Response>=>{
  const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
  try{
   if(!input.startsWith('/api/'))throw Error('Demo 僅能使用本機示範資料。');
   const url=new URL(input,'https://demo.invalid');const id=url.searchParams.get('groupId')||'';
   if(!state.groups.some(g=>g.id===id))return reply({error:'找不到示範群組'},404);
   if(url.pathname==='/api/members/assignees')return reply([demoName,'示範夥伴']);
   if(url.pathname!=='/api/tasks')return reply({error:'Demo 不支援此操作'},404);
   if(!init?.method||init.method==='GET')return reply(state.tasks[id]||[]);
   if(init.method!=='POST'||!(init.body instanceof FormData))return reply({error:'不支援此操作'},405);
   const f=init.body,get=(k:string)=>String(f.get(k)||'');
   if(!get('title').trim()||get('title').length>100||!validDate(get('date'))||!statuses.includes(get('status') as any)||![demoName,'示範夥伴','待認領'].includes(get('assignee')))throw Error('請確認任務名稱、有效日期、負責人及狀態。');
   const next=structuredClone(state),list=next.tasks[id]||[],existing=list.find(t=>t.id===get('id'));
   if(get('id')&&(!existing||existing.version!==Number(get('version'))))return reply({error:'任務已更新，請重新整理後再試。'},409);
   const retained=JSON.parse(get('retained')||'[]') as string[];if(!Array.isArray(retained)||retained.length>3)throw Error('每個任務最多保留 3 張照片。');
   const photos=retained.map(pid=>{const p=staged.get(pid)||next.photos[pid];if(!p)throw Error('照片不存在，請重新選取。');next.photos[pid]=p;return {id:p.id,name:p.name}});
   const now=new Date().toISOString(),t:Task={id:existing?.id||crypto.randomUUID(),title:get('title').trim(),date:get('date'),assignee:get('assignee'),status:get('status'),description:get('description').slice(0,5000),notes:get('notes').slice(0,3000),creator:existing?.creator||demoName,photos,version:(existing?.version||0)+1,createdAt:existing?.createdAt||now,updatedAt:now};
   next.tasks[id]=existing?list.map(old=>old.id===t.id?t:old):[...list,t];
   const used=new Set(Object.values(next.tasks).flat().flatMap(t=>t.photos.map(p=>p.id)));Object.keys(next.photos).forEach(pid=>{if(!used.has(pid))delete next.photos[pid]});
   persist(next);retained.forEach(pid=>staged.delete(pid));return reply(t);
  }catch(e){return reply({error:e instanceof Error?e.message:'本機儲存失敗'},400)}
 };
 return {groups,updateGroup,request,stagePhoto,photo,startupError,reset(){persist(seed());staged.clear()}};
}
export type DemoStore=ReturnType<typeof createDemoStore>;
