import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['demo/store.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {createDemoStore,storageKey,demoName}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const memory=()=>{const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)}};
const form=(changes={})=>{const f=new FormData();for(const [k,v] of Object.entries({title:'示範任務',date:'2026-10-28',assignee:demoName,status:'未處理',description:'',notes:'',retained:'[]',...changes}))f.set(k,String(v));return f};
test('demo persists tasks and photos locally, isolates browsers and groups, and never uses network',async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('Demo must not use network')};
 try{
  const storage=memory(),a=createDemoStore(storage),b=createDemoStore(memory());
  const p=a.stagePhoto('sample.png','data:image/png;base64,aGVsbG8=');
  const r=await a.request('/api/tasks?groupId=home',{method:'POST',body:form({retained:JSON.stringify([p.id])})});assert.equal(r.status,200);const task=await r.json();
  const reloaded=createDemoStore(storage);assert.equal(reloaded.photo(p.id),'data:image/png;base64,aGVsbG8=');
  assert.equal((await (await reloaded.request('/api/tasks?groupId=home')).json()).length,5);
  assert.equal((await (await a.request('/api/tasks?groupId=weekend')).json()).length,1);
  assert.equal((await (await b.request('/api/tasks?groupId=home')).json()).length,4);
  assert.equal((await a.request('/api/tasks?groupId=home',{method:'POST',body:form({id:task.id,version:0})})).status,409);
  assert.equal((await a.request('https://example.com/api/tasks')).status,400);
  assert.equal((await a.request('/api/tasks?groupId=unknown')).status,404);
  assert.equal((await a.request('/api/auth/me?groupId=home')).status,404);
  a.updateGroup('home',{name:'我的示範清單',theme:'ocean'});assert.equal(createDemoStore(storage).groups()[0].theme,'ocean');
  a.reset();assert.equal(a.photo(p.id),'');assert.equal(createDemoStore(storage).groups()[0].name,'我們家的生活清單');
 }finally{globalThis.fetch=original}
});
test('demo storage failures do not claim a successful save or discard current data',async()=>{
 const storage=memory(),store=createDemoStore({getItem:storage.getItem,setItem(){throw Error('quota')}});
 const r=await store.request('/api/tasks?groupId=home',{method:'POST',body:form()});assert.equal(r.status,400);assert.match((await r.json()).error,/儲存失敗/);
 assert.equal((await (await store.request('/api/tasks?groupId=home')).json()).length,4);
 assert.throws(()=>store.reset(),/儲存失敗/);
 assert.throws(()=>store.stagePhoto('x.svg','data:image/svg+xml;base64,aGVsbG8='),/僅支援/);
 storage.setItem(storageKey,'broken');assert.match(createDemoStore(storage).startupError,/無法讀取/);
});
