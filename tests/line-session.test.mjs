import {test} from 'node:test';
import assert from 'node:assert/strict';
import {invalidateLineSession,lineAppUrl,lineLoginRedirect,restartLineLogin,withLineTimeout,withLineRequestTimeout} from '../lib/line-session.ts';

const fake=(inside=false,loggedIn=true)=>{
 const calls=[];const sdk={isInClient:()=>inside,isLoggedIn:()=>loggedIn,logout(){calls.push('logout');loggedIn=false},login(options){calls.push(['login',options])}};
 return {sdk,calls};
};
test('external login discards the stale session before logging in again',()=>{
 const {sdk,calls}=fake();
 restartLineLogin(sdk,{href:'https://test.invalid/?group=family&code=stale&state=old#access_token=old',liffId:'12345-test'},()=>assert.fail('must not reopen LIFF externally'));
 assert.deepEqual(calls,['logout',['login',{redirectUri:'https://test.invalid/?group=family'}]]);
});
test('missing external session proceeds to login without logout',()=>{
 const {sdk,calls}=fake(false,false);
 restartLineLogin(sdk,{href:'https://test.invalid/',liffId:'12345-test'},()=>assert.fail());
 assert.deepEqual(calls,[['login',{redirectUri:'https://test.invalid/'}]]);
});
test('LIFF browser reopens the LIFF URL and never calls external-only login or logout',()=>{
 const {sdk,calls}=fake(true);const targets=[];
 invalidateLineSession(sdk);
 restartLineLogin(sdk,{href:'https://test.invalid/members?group=family',liffId:'12345-test',invitation:'example-invite'},url=>targets.push(url));
 assert.deepEqual(calls,[]);assert.deepEqual(targets,['https://liff.line.me/12345-test/members?group=family&join=example-invite']);
});
test('relogin preserves invitations from current URL, saved context and LIFF state',()=>{
 assert.equal(lineLoginRedirect('https://test.invalid/?join=invitation&code=old'),'https://test.invalid/?join=invitation');
 assert.equal(lineLoginRedirect('https://test.invalid/?group=family','saved-invite'),'https://test.invalid/?group=family&join=saved-invite');
 assert.equal(lineLoginRedirect('https://test.invalid/?liff.state='+encodeURIComponent('/?join=nested&group=family')),'https://test.invalid/?group=family&join=nested');
});
test('relogin never forwards OAuth tokens or a foreign LIFF state',()=>{
 const href='https://test.invalid/?liff.state='+encodeURIComponent('https://attacker.invalid/?join=untrusted')+'&id_token=secret&access_token=secret&state=secret#id_token=secret';
 assert.equal(lineLoginRedirect(href),'https://test.invalid/');
 const {sdk}=fake(true);assert.throws(()=>restartLineLogin(sdk,{href,liffId:'https://attacker.invalid'},()=>assert.fail()),/設定無效/);
});
test('LINE initialization that never settles fails with a retry message instead of hanging',async()=>{
 await assert.rejects(withLineTimeout(new Promise(()=>{}),'LINE 登入確認逾時',5),/確認逾時/);
});
test('login deadlines preserve successful initialization and real errors',async()=>{
 assert.equal(await withLineTimeout(Promise.resolve('ready'),'timeout',50),'ready');
 const failure=Error('network failed');await assert.rejects(withLineTimeout(Promise.reject(failure),'timeout',50),e=>e===failure);
});
test('account confirmation timeout cancels the old request before a retry',async()=>{
 let signal;
 await assert.rejects(withLineRequestTimeout(value=>{signal=value;return new Promise(()=>{})},'帳號確認逾時',5),/確認逾時/);
 assert.equal(signal.aborted,true);
});
test('group invitation links use LIFF entry and preserve the invitation on first launch',()=>{
 const link=lineAppUrl('12345-test','https://test.invalid/','sample-invite');
 assert.equal(link,'https://liff.line.me/12345-test?join=sample-invite');
 assert.equal(new URL(link).searchParams.get('join'),'sample-invite');
 assert.equal(lineLoginRedirect('https://test.invalid/?liff.state='+encodeURIComponent('?join=sample-invite')),'https://test.invalid/?join=sample-invite');
});
