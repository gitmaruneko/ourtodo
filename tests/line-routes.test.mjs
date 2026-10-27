import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
test('LINE membership protects real route handlers, task attribution and photos',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(await readFile(new URL('../drizzle/0000_sad_true_believers.sql',import.meta.url),'utf8'));
 db.exec((await readFile(new URL('../drizzle/0001_past_kree.sql',import.meta.url),'utf8')).replaceAll('--> statement-breakpoint',''));
 const admin='U'+'a'.repeat(32),family='U'+'b'.repeat(32),unknown='U'+'c'.repeat(32);
 const bucket=new Map();
 globalThis.__lineIntegrationEnv={
 AUTH_MODE:'line',LINE_CHANNEL_ID:'12345',LINE_LIFF_ID:'12345-abc',LINE_ADMIN_USER_ID:admin,
 DB:{prepare(query){const statement=db.prepare(query);const wrap=(values=[])=>({
 bind:(...args)=>wrap(args),first:async()=>statement.get(...values)||null,
 all:async()=>({results:statement.all(...values)}),run:async()=>({meta:{changes:Number(statement.run(...values).changes)}})
 });return wrap();}},
 BUCKET:{async put(key,stream,options){bucket.set(key,{body:new Uint8Array(await new Response(stream).arrayBuffer()),httpMetadata:options.httpMetadata})},async get(key){return bucket.get(key)},async delete(key){bucket.delete(key)}}
 };
 const compiled=await build({stdin:{contents:"export * as config from './app/api/auth/config/route.ts';export * as task from './app/api/tasks/route.ts';export * as photo from './app/api/photos/[id]/route.ts';export * as me from './app/api/auth/me/route.ts';export * as members from './app/api/members/route.ts';",resolveDir:fileURLToPath(root)},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'test-env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env=globalThis.__lineIntegrationEnv;',loader:'js'}));}}]});
 const routes=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{
 assert.equal(url,'https://api.line.me/oauth2/v2.1/verify');
 const token=init.body.get('id_token'),identities={'admin.x.y':[admin,'管理員'],'family.x.y':[family,'家人甲'],'unknown.x.y':[unknown,'陌生帳號']};
 const identity=identities[token];
 return identity?Response.json({iss:'https://access.line.me',aud:'12345',sub:identity[0],name:identity[1],exp:Math.floor(Date.now()/1000)+3600}):new Response('{}',{status:400});
 };
 const req=(token,path='/api/auth/me',method='GET',body)=>new Request('https://test.invalid'+path,{method,headers:token?{Authorization:'Bearer '+token}:{},...(body?{body}:{})});
 try{
 assert.equal((await (await routes.config.GET()).json()).uploadsEnabled,false);
 assert.equal((await routes.task.GET(req(''))).status,401);
 assert.equal((await routes.task.GET(req('forged.x.y'))).status,401);
 assert.equal((await routes.members.GET(req(''))).status,401);
 assert.equal((await routes.photo.GET(req(''),{params:Promise.resolve({id:'00000000-0000-0000-0000-000000000000'})})).status,401);
 const owner=await (await routes.me.GET(req('admin.x.y'))).json();assert.equal(owner.isAdmin,true);assert.equal(owner.status,'approved');
 const pending=await (await routes.me.GET(req('family.x.y'))).json();assert.equal(pending.status,'pending');assert.equal(pending.isAdmin,false);
 const stranger=await (await routes.me.GET(req('unknown.x.y'))).json();assert.equal(stranger.isAdmin,false);
 assert.equal((await routes.task.GET(req('family.x.y'))).status,403);
 assert.equal((await routes.task.POST(req('family.x.y','/api/tasks','POST',new FormData()))).status,403);
 assert.equal((await routes.members.GET(req('family.x.y'))).status,403);
 const approve=()=>routes.members.POST(req('admin.x.y','/api/members','POST',JSON.stringify({userId:family,status:'approved'})));
 assert.equal((await approve()).status,200);assert.equal((await routes.task.GET(req('family.x.y'))).status,200);
 const form=new FormData();Object.entries({title:'家庭任務',date:'2026-11-30',assignee:'家人乙',status:'安排中',creator:'偽造名稱',retained:'[]'}).forEach(([k,v])=>form.set(k,v));
 form.append('files',new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')],'test.png',{type:'image/png'}));
 const uploadRejected=await routes.task.POST(req('family.x.y','/api/tasks','POST',form));assert.equal(uploadRejected.status,400);assert.match((await uploadRejected.json()).error,/照片上傳功能已停用/);
 form.delete('files');
 const created=await routes.task.POST(req('family.x.y','/api/tasks','POST',form));assert.equal(created.status,200);
 const rows=await (await routes.task.GET(req('family.x.y'))).json();assert.equal(rows.length,1);assert.equal(rows[0].creator,'家人甲');assert.equal(rows[0].creator_user_id,family);
 assert.equal(rows[0].photos.length,0);
 const id=crypto.randomUUID();db.prepare('UPDATE tasks SET photos=? WHERE id=?').run(JSON.stringify([{id,name:'legacy.png'}]),rows[0].id);bucket.set(id,{body:new Uint8Array([137,80,78,71]),httpMetadata:{contentType:'image/png'}});
 const photo=(token)=>routes.photo.GET(req(token),{params:Promise.resolve({id})});
 assert.equal((await photo('family.x.y')).status,200);assert.equal((await photo('unknown.x.y')).status,403);
 const savedBucket=globalThis.__lineIntegrationEnv.BUCKET;delete globalThis.__lineIntegrationEnv.BUCKET;
 assert.equal((await photo('family.x.y')).status,503);
 const textOnly=new FormData();Object.entries({title:'不含照片的任務',date:'2026-11-30',assignee:'家人甲',status:'未處理',retained:'[]'}).forEach(([k,v])=>textOnly.set(k,v));
 assert.equal((await routes.task.POST(req('family.x.y','/api/tasks','POST',textOnly))).status,200);
 const noStorage=new FormData();Object.entries({title:'照片尚未開通',date:'2026-11-30',assignee:'家人甲',status:'未處理',retained:'[]'}).forEach(([k,v])=>noStorage.set(k,v));
 noStorage.append('files',new File(['test'],'test.png',{type:'image/png'}));
 const unavailable=await routes.task.POST(req('family.x.y','/api/tasks','POST',noStorage));assert.equal(unavailable.status,400);assert.match((await unavailable.json()).error,/照片上傳功能已停用/);
 globalThis.__lineIntegrationEnv.BUCKET=savedBucket;
 assert.equal((await routes.members.POST(req('family.x.y','/api/members','POST',JSON.stringify({userId:unknown,status:'approved'})))).status,403);
 assert.equal((await routes.members.POST(req('admin.x.y','/api/members','POST',JSON.stringify({userId:admin,status:'blocked'})))).status,400);
 assert.equal((await routes.members.POST(req('admin.x.y','/api/members','POST',JSON.stringify({userId:family,status:'blocked'})))).status,200);
 assert.equal((await routes.task.GET(req('family.x.y'))).status,403);assert.equal((await photo('family.x.y')).status,403);
 assert.equal((await routes.task.GET(req('admin.x.y'))).status,200);
 const env=globalThis.__lineIntegrationEnv;env.LINE_LIFF_ID=undefined;
 assert.equal((await routes.task.GET(req('admin.x.y'))).status,503);
 env.LINE_LIFF_ID='12345-abc';env.AUTH_MODE=undefined;
 assert.equal((await routes.task.GET(req(''))).status,401);
 const spoofed=new Request('https://test.invalid/api/tasks',{headers:{'oai-authenticated-user-id':'forged'}});
 assert.equal((await routes.task.GET(spoofed)).status,401);
 env.AUTH_MODE='sites-private';
 assert.equal((await routes.task.GET(req('family.x.y'))).status,401);
 }finally{globalThis.fetch=originalFetch;delete globalThis.__lineIntegrationEnv;db.close()}
});

