import {test} from 'node:test';
import assert from 'node:assert/strict';
import {invalidateLineSession,lineLoginRedirect,restartLineLogin} from '../lib/line-session.ts';

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
