import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyLineToken,assertApproved,validMemberAction,AccessError} from '../lib/line-core.ts';
const now=1800000000000,uid='U'+'a'.repeat(32),other='U'+'b'.repeat(32);
const profile={iss:'https://access.line.me',aud:'12345',sub:uid,exp:now/1000+3600,name:'瓊瑋'};
const ok=(body=profile)=>async()=>Response.json(body);
const rejects=(promise,status)=>assert.rejects(promise,e=>e instanceof AccessError&&e.status===status);
test('verify sends token only to official LINE verification endpoint',async()=>{
 let seen=false;
 const user=await verifyLineToken('one.two.three','12345',async(url,init)=>{
 assert.equal(url,'https://api.line.me/oauth2/v2.1/verify');assert.equal(init.method,'POST');
 assert.equal(init.body.get('id_token'),'one.two.three');assert.equal(init.body.get('client_id'),'12345');seen=true;return Response.json(profile);
 },now);
 assert.equal(seen,true);assert.equal(user.userId,uid);assert.equal(user.displayName,'瓊瑋');
});
test('missing and malformed tokens are rejected without contacting LINE',async()=>{
 for(const token of ['', 'fake', 'a'.repeat(9000)])await rejects(verifyLineToken(token,'12345',()=>{throw Error('must not call')},now),401);
});
test('missing channel configuration fails closed',async()=>{await rejects(verifyLineToken('one.two.three','',ok(),now),503)});
test('forged, revoked and expired token responses are rejected',async()=>{
 await rejects(verifyLineToken('a.b.c','12345',async()=>new Response('{}',{status:400}),now),401);
 for(const patch of [{exp:now/1000-1},{aud:'54321'},{iss:'https://fake.example'},{sub:'not-a-line-user'}])await rejects(verifyLineToken('a.b.c','12345',ok({...profile,...patch}),now),401);
});
test('profile scope required; never trust a client supplied display name',async()=>{
 await rejects(verifyLineToken('a.b.c','12345',ok({...profile,name:undefined}),now),403);
 const user=await verifyLineToken('a.b.c','12345',ok({...profile,name:'新的名稱'}),now);assert.equal(user.displayName,'新的名稱');
});
test('LINE unavailable and rate limited errors stay closed',async()=>{
 await rejects(verifyLineToken('a.b.c','12345',async()=>{throw Error('offline')},now),503);
 for(const status of [429,500])await rejects(verifyLineToken('a.b.c','12345',async()=>new Response('{}',{status}),now),503);
});
test('pending, unknown and blocked members cannot access data',()=>{
 for(const status of [undefined,'pending','blocked','other'])assert.throws(()=>assertApproved(status,false),e=>e instanceof AccessError&&e.status===403);
 assert.doesNotThrow(()=>assertApproved('approved',false));assert.doesNotThrow(()=>assertApproved('approved',true));
});
test('member updates reject self removal, invalid user IDs and privilege promotion',()=>{
 assert.throws(()=>validMemberAction(uid,'blocked',uid),/管理員/);
 assert.throws(()=>validMemberAction('fake','approved',uid),/無效/);
 assert.throws(()=>validMemberAction(other,'admin',uid),/無效/);
 assert.doesNotThrow(()=>validMemberAction(other,'approved',uid));
 assert.doesNotThrow(()=>validMemberAction(other,'blocked',uid));
});

