import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const sql=async name=>(await readFile(new URL('../drizzle/'+name,import.meta.url),'utf8')).replaceAll('--> statement-breakpoint','');

test('group migration preserves existing tasks and only enrolls previously approved members',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(await sql('0000_sad_true_believers.sql'));db.exec(await sql('0001_past_kree.sql'));db.exec(await sql('0002_user_preferences.sql'));
  const member=db.prepare('INSERT INTO members VALUES (?,?,?,?,?)');member.run('existing','家人','approved','now','now');member.run('pending','新人','pending','now','now');
  db.prepare("INSERT INTO tasks (id,title,date,assignee,description,notes,status,creator,photos,created_at,updated_at) VALUES ('old','既有任務','2026-10-28','家人','','','未處理','家人','[]','now','now')").run();
  db.exec(await sql('0003_groups.sql'));
  assert.equal(db.prepare("SELECT group_id FROM tasks WHERE id='old'").get().group_id,'legacy');
  assert.deepEqual(db.prepare('SELECT user_id FROM group_members').all().map(m=>m.user_id),['existing']);
  assert.equal(db.prepare("SELECT name FROM app_groups WHERE id='legacy'").get().name,'原有共用清單');
  db.exec(await sql('0004_group_themes.sql'));assert.equal(db.prepare("SELECT theme FROM app_groups WHERE id='legacy'").get().theme,'sage');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE group_id='legacy'").get().n,1);
 }finally{db.close()}
});

test('groups enforce task, photo, roster and owner isolation across invitations and removal',async t=>{
 const db=new DatabaseSync(':memory:');
 for(const name of ['0000_sad_true_believers.sql','0001_past_kree.sql','0002_user_preferences.sql','0003_groups.sql','0004_group_themes.sql','0005_group_join_requests.sql'])db.exec(await sql(name));
 const newbie='U'+'e'.repeat(32);
 const alice='U'+'a'.repeat(32),bob='U'+'b'.repeat(32),outsider='U'+'c'.repeat(32),pending='U'+'d'.repeat(32);
 const member=db.prepare('INSERT INTO members VALUES (?,?,?,?,?)');
 for(const [id,name,status] of [[alice,'成員甲','approved'],[bob,'成員乙','approved'],[outsider,'成員丙','approved'],[pending,'待核准','pending']])member.run(id,name,status,'now','now');
 const bucket=new Map();
 globalThis.__groupTestEnv={AUTH_MODE:'line',LINE_CHANNEL_ID:'12345',LINE_LIFF_ID:'12345-abc',LINE_ADMIN_USER_ID:alice,
  DB:{prepare(query){const stmt=db.prepare(query);const wrap=(args=[])=>({bind:(...values)=>wrap(values),first:async()=>stmt.get(...args)||null,all:async()=>({results:stmt.all(...args)}),run:async()=>({meta:{changes:Number(stmt.run(...args).changes)}})});return wrap()},async batch(statements){db.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}},
  BUCKET:{async get(id){return bucket.get(id)}}};
 const compiled=await build({stdin:{contents:"export * as me from './app/api/auth/me/route.ts';export * as siteMembers from './app/api/members/route.ts';export * as groups from './app/api/groups/route.ts';export * as members from './app/api/groups/members/route.ts';export * as tasks from './app/api/tasks/route.ts';export * as assignees from './app/api/members/assignees/route.ts';export * as photos from './app/api/photos/[id]/route.ts';",resolveDir:fileURLToPath(root)},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'group-test-env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env=globalThis.__groupTestEnv;',loader:'js'}))}}]});
 const routes=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async(_url,init)=>{const id=init.body.get('id_token').split('.')[0];const identity={alice:[alice,'成員甲'],bob:[bob,'成員乙'],outsider:[outsider,'成員丙'],pending:[pending,'待核准'],newbie:[newbie,'新使用者']}[id];return identity?Response.json({iss:'https://access.line.me',aud:'12345',sub:identity[0],name:identity[1],exp:Math.floor(Date.now()/1000)+3600}):new Response('{}',{status:400})};
 const req=(actor,path='/api/groups',method='GET',body)=>new Request('https://test.invalid'+path,{method,headers:actor?{Authorization:'Bearer '+actor+'.x.y'}:{},...(body===undefined?{}:{body:body instanceof FormData?body:JSON.stringify(body)})});
 const groupPost=(actor,data)=>routes.groups.POST(req(actor,'/api/groups','POST',data));
 let a,b,inviteCode,taskId,photoId;
 const taskForm=(extra={})=>{const form=new FormData();Object.entries({title:'群組專屬任務',date:'2026-10-28',assignee:'待認領',status:'未處理',retained:'[]',...extra}).forEach(([k,v])=>form.set(k,String(v)));return form};
 try{
  await t.test('create validates names and requires approved identity',async()=>{
   assert.equal((await groupPost('',{action:'create',name:'秘密'})).status,401);
   assert.equal((await groupPost('pending',{action:'create',name:'秘密'})).status,403);
   for(const name of ['', '  ', 'a'.repeat(41),123])assert.equal((await groupPost('alice',{action:'create',name})).status,400);
   a=(await (await groupPost('alice',{action:'create',name:'家庭'})).json()).group;
   b=(await (await groupPost('bob',{action:'create',name:'工作'})).json()).group;
   assert.equal(a.theme,'sage');assert.equal(b.theme,'sage');assert.equal(a.role,'owner');assert.notEqual(a.id,b.id);
   assert.deepEqual((await (await routes.groups.GET(req('bob'))).json()).map(g=>g.id),[b.id]);
   assert.ok(!(await (await routes.groups.GET(req('alice'))).json()).some(g=>g.id===b.id));
  });
  await t.test('site administrator cannot read or modify another private group',async()=>{
   for(const route of [routes.tasks,routes.members,routes.assignees])assert.equal((await route.GET(req('alice','/api/tasks?groupId='+b.id))).status,404);
   assert.equal((await routes.tasks.POST(req('alice','/api/tasks?groupId='+b.id,'POST',taskForm()))).status,404);
   assert.equal((await groupPost('alice',{action:'rename',groupId:b.id,name:'竄改'})).status,404);
   assert.equal((await groupPost('alice',{action:'rotateInvite',groupId:b.id})).status,404);
  });
  await t.test('themes are validated, persisted per group and restricted to the group owner',async()=>{
   assert.equal((await groupPost('bob',{action:'theme',groupId:a.id,theme:'rose'})).status,404);
   for(const theme of ['', 'invalid', '<style>', 123, null])assert.equal((await groupPost('alice',{action:'theme',groupId:a.id,theme})).status,400);
   for(const theme of ['sage','lavender','amber','rose','slate','ocean']){
    const response=await groupPost('alice',{action:'theme',groupId:a.id,theme});assert.equal(response.status,200);assert.equal((await response.json()).group.theme,theme);
   }
   assert.equal((await (await routes.groups.GET(req('alice'))).json()).find(g=>g.id===a.id).theme,'ocean');
   assert.equal((await (await routes.groups.GET(req('bob'))).json()).find(g=>g.id===b.id).theme,'sage');
  });
  await t.test('task reads, writes and assignee choices stay inside their group',async()=>{
   const response=await routes.tasks.POST(req('alice','/api/tasks?groupId='+a.id,'POST',taskForm()));assert.equal(response.status,200);taskId=(await response.json()).id;
   assert.equal((await (await routes.tasks.GET(req('bob','/api/tasks?groupId='+b.id))).json()).length,0);
   assert.equal((await routes.tasks.POST(req('bob','/api/tasks?groupId='+b.id,'POST',taskForm({id:taskId,version:1})))).status,404);
   assert.equal((await routes.tasks.POST(req('alice','/api/tasks?groupId='+a.id,'POST',taskForm({assignee:'成員乙'})))).status,400);
   assert.deepEqual(await (await routes.assignees.GET(req('alice','/api/members/assignees?groupId='+a.id))).json(),['成員甲']);
   photoId=crypto.randomUUID();db.prepare('UPDATE tasks SET photos=? WHERE id=?').run(JSON.stringify([{id:photoId,name:'photo.png'}]),taskId);bucket.set(photoId,{body:new Uint8Array([1,2,3]),httpMetadata:{contentType:'image/png'}});
   assert.equal((await routes.photos.GET(req('bob'),{params:Promise.resolve({id:photoId})})).status,404);
   assert.equal((await routes.photos.GET(req('alice'),{params:Promise.resolve({id:photoId})})).status,200);
  });
  await t.test('invitation is explicit, idempotent and does not grant owner access',async()=>{
   inviteCode=(await (await routes.members.GET(req('alice','/api/groups/members?groupId='+a.id))).json()).inviteCode;assert.match(inviteCode,/^[a-f0-9]{32}$/);
   assert.equal((await routes.members.GET(req('bob','/api/groups/members?groupId='+a.id))).status,404);
   assert.equal((await groupPost('bob',{action:'join',inviteCode:'bad'})).status,400);
   assert.equal((await groupPost('bob',{action:'join',inviteCode:'0'.repeat(32)})).status,404);
   assert.equal((await groupPost('pending',{action:'join',inviteCode})).status,403);
   for(let i=0;i<2;i++)assert.equal((await groupPost('bob',{action:'join',inviteCode})).status,200);
   assert.equal(db.prepare('SELECT COUNT(*) AS n FROM group_members WHERE group_id=? AND user_id=?').get(a.id,bob).n,1);
   const roster=await (await routes.members.GET(req('bob','/api/groups/members?groupId='+a.id))).json();assert.equal((await (await routes.groups.GET(req('bob'))).json()).find(g=>g.id===a.id).theme,'ocean');assert.equal((await groupPost('bob',{action:'theme',groupId:a.id,theme:'rose'})).status,403);assert.equal(roster.inviteCode,null);assert.equal(roster.members.length,2);
   assert.equal((await (await routes.tasks.GET(req('bob','/api/tasks?groupId='+a.id))).json()).length,1);
   assert.equal((await routes.photos.GET(req('bob'),{params:Promise.resolve({id:photoId})})).status,200);
   assert.equal((await groupPost('bob',{action:'rename',groupId:a.id,name:'竄改'})).status,403);
   assert.equal((await groupPost('bob',{action:'rotateInvite',groupId:a.id})).status,403);
   assert.equal((await routes.members.POST(req('bob','/api/groups/members?groupId='+a.id,'POST',{userId:alice}))).status,403);
   assert.equal((await groupPost('alice',{action:'join',inviteCode})).status,200);assert.equal(db.prepare('SELECT role FROM group_members WHERE group_id=? AND user_id=?').get(a.id,alice).role,'owner');
   assert.equal((await groupPost('alice',{action:'rename',groupId:a.id,name:'家庭清單'})).status,200);
   assert.equal((await (await routes.groups.GET(req('bob'))).json()).find(g=>g.id===a.id).name,'家庭清單');
  });
  await t.test('site member directory shows all memberships and explicit empty groups to administrators only',async()=>{
   assert.equal((await routes.siteMembers.GET(req(''))).status,401);
   assert.equal((await routes.siteMembers.GET(req('bob'))).status,403);
   const directory=await (await routes.siteMembers.GET(req('alice'))).json();
   const memberships=directory.find(m=>m.userId===bob).groups;
   assert.deepEqual(new Set(memberships.map(g=>g.id)),new Set([a.id,b.id]));
   assert.equal(memberships.find(g=>g.id===a.id).name,'家庭清單');
   assert.equal(memberships.find(g=>g.id===a.id).theme,'ocean');
   assert.equal(memberships.find(g=>g.id===b.id).role,'owner');
   assert.deepEqual(directory.find(m=>m.userId===outsider).groups,[]);
   assert.deepEqual(directory.find(m=>m.userId===pending).groups,[]);
   assert.ok(memberships.every(g=>!('inviteCode' in g)&&!('invite_code' in g)));
  });
  await t.test('removal revokes data access and rotated links cannot rejoin',async()=>{
   assert.equal((await routes.members.POST(req('alice','/api/groups/members?groupId='+a.id,'POST',{userId:alice}))).status,400);
   assert.equal((await routes.members.POST(req('alice','/api/groups/members?groupId='+a.id,'POST',{userId:bob}))).status,200);
   for(const route of [routes.tasks,routes.members,routes.assignees])assert.equal((await route.GET(req('bob','/api/tasks?groupId='+a.id))).status,404);
   assert.equal((await routes.tasks.POST(req('bob','/api/tasks?groupId='+a.id,'POST',taskForm()))).status,404);
   assert.equal((await routes.photos.GET(req('bob'),{params:Promise.resolve({id:photoId})})).status,404);
   const remaining=(await (await routes.siteMembers.GET(req('alice'))).json()).find(m=>m.userId===bob).groups;assert.deepEqual(remaining.map(g=>g.id),[b.id]);
   const rotated=await (await groupPost('alice',{action:'rotateInvite',groupId:a.id})).json();assert.notEqual(rotated.inviteCode,inviteCode);
   assert.equal((await groupPost('bob',{action:'join',inviteCode})).status,404);
   assert.equal((await groupPost('outsider',{action:'join',inviteCode})).status,404);
   assert.equal((await groupPost('bob',{action:'join',inviteCode:rotated.inviteCode})).status,200);
  });
  await t.test('valid invitation automatically approves the verified account and joins only the invited group',async()=>{
   const code=(await (await routes.members.GET(req('alice','/api/groups/members?groupId='+a.id))).json()).inviteCode;
   assert.equal((await routes.me.GET(req('','/api/auth/me?inviteCode='+code))).status,401);
   for(const actor of ['pending','newbie']){
    const id=actor==='pending'?pending:newbie;
    for(let i=0;i<2;i++){
     const response=await routes.me.GET(req(actor,'/api/auth/me?inviteCode='+code+'&userId='+outsider));assert.equal(response.status,200);
     const applicant=await response.json();assert.equal(applicant.userId,id);assert.equal(applicant.status,'approved');assert.equal(applicant.invitedGroup.id,a.id);assert.equal(applicant.invitedGroup.joined,true);assert.deepEqual(applicant.requestedGroups,[]);
    }
    assert.equal(db.prepare('SELECT status FROM members WHERE user_id=?').get(id).status,'approved');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM group_members WHERE user_id=? AND group_id=?').get(id,a.id).n,1);
    assert.equal((await routes.tasks.GET(req(actor,'/api/tasks?groupId='+a.id))).status,200);
    assert.ok(!(await (await routes.groups.GET(req(actor))).json()).some(g=>g.id===b.id));
   }
   assert.equal(db.prepare('SELECT COUNT(*) AS n FROM group_members WHERE user_id=? AND group_id=?').get(outsider,a.id).n,0);
  });
  await t.test('already approved users opening a valid invitation join automatically without changing owner roles',async()=>{
   const code=(await (await routes.members.GET(req('alice','/api/groups/members?groupId='+a.id))).json()).inviteCode;
   const result=await (await routes.me.GET(req('outsider','/api/auth/me?inviteCode='+code))).json();assert.equal(result.invitedGroup.joined,true);
   assert.equal((await routes.tasks.GET(req('outsider','/api/tasks?groupId='+a.id))).status,200);
   await routes.me.GET(req('alice','/api/auth/me?inviteCode='+code));
   assert.equal(db.prepare('SELECT role FROM group_members WHERE user_id=? AND group_id=?').get(alice,a.id).role,'owner');
   const bad=await (await routes.me.GET(req('bob','/api/auth/me?inviteCode=invalid'))).json();assert.match(bad.inviteError,/格式/);
  });
  await t.test('auto approval and group membership roll back together when joining fails',async()=>{
   db.prepare('DELETE FROM group_members WHERE user_id=?').run(pending);db.prepare("UPDATE members SET status='pending' WHERE user_id=?").run(pending);
   const code=(await (await routes.members.GET(req('alice','/api/groups/members?groupId='+a.id))).json()).inviteCode;
   db.exec("CREATE TRIGGER reject_group_insert BEFORE INSERT ON group_members WHEN NEW.user_id='"+pending+"' BEGIN SELECT RAISE(ABORT,'test failure'); END");
   assert.equal((await routes.me.GET(req('pending','/api/auth/me?inviteCode='+code))).status,503);
   assert.equal(db.prepare('SELECT status FROM members WHERE user_id=?').get(pending).status,'pending');
   assert.equal(db.prepare('SELECT COUNT(*) AS n FROM group_members WHERE user_id=?').get(pending).n,0);
   db.exec('DROP TRIGGER reject_group_insert');
  });
  await t.test('missing, malformed, expired and group-id-only links never auto approve an account',async()=>{
   const oldCode=(await (await routes.members.GET(req('alice','/api/groups/members?groupId='+a.id))).json()).inviteCode;
   await groupPost('alice',{action:'rotateInvite',groupId:a.id});
   for(const path of ['/api/auth/me','/api/auth/me?groupId='+a.id,'/api/auth/me?inviteCode=invalid','/api/auth/me?inviteCode='+oldCode]){
    const result=await (await routes.me.GET(req('pending',path))).json();assert.equal(result.status,'pending');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM group_members WHERE user_id=?').get(pending).n,0);
   }
   assert.equal((await routes.tasks.GET(req('pending','/api/tasks?groupId='+a.id))).status,403);
  });
  await t.test('blocked users stay blocked even with a valid invitation',async()=>{
   const code=(await (await routes.members.GET(req('alice','/api/groups/members?groupId='+a.id))).json()).inviteCode;
   assert.equal((await routes.siteMembers.POST(req('alice','/api/members','POST',{userId:pending,status:'blocked'}))).status,200);
   const blocked=await (await routes.me.GET(req('pending','/api/auth/me?inviteCode='+code))).json();assert.equal(blocked.status,'blocked');assert.equal(blocked.invitedGroup,undefined);
   assert.equal(db.prepare('SELECT COUNT(*) AS n FROM group_members WHERE user_id=?').get(pending).n,0);
  });
  await t.test('manual approval remains compatible with previously recorded valid group requests',async()=>{
   db.prepare("UPDATE members SET status='pending' WHERE user_id=?").run(pending);
   const code=(await (await routes.members.GET(req('alice','/api/groups/members?groupId='+a.id))).json()).inviteCode;
   db.prepare('INSERT INTO group_join_requests VALUES (?,?,?,?)').run(a.id,pending,code,'now');
   assert.equal((await routes.siteMembers.POST(req('alice','/api/members','POST',{userId:pending,status:'approved'}))).status,200);
   assert.equal(db.prepare('SELECT role FROM group_members WHERE group_id=? AND user_id=?').get(a.id,pending).role,'member');
   assert.equal(db.prepare('SELECT COUNT(*) AS n FROM group_join_requests WHERE user_id=?').get(pending).n,0);
  });
 }finally{globalThis.fetch=originalFetch;delete globalThis.__groupTestEnv;db.close()}
});
