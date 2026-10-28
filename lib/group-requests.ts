import {env} from 'cloudflare:workers';
import type {Actor} from './access';

export async function applyInvitation(user:Actor,code:string){
 if(user.provider!=='line'||user.status==='blocked')return {};
 if(!/^[a-f0-9]{32}$/.test(code))return {inviteError:'邀請連結格式不正確，請向群組管理員索取連結。'};
 const group=await env.DB!.prepare('SELECT id,name FROM app_groups WHERE invite_code=?').bind(code).first<{id:string;name:string}>();
 if(!group)return {inviteError:'邀請連結已失效，請向群組管理員索取新連結。'};
 const now=new Date().toISOString();
 // A valid invitation authorizes a pending account and its group membership together.
 // Blocked accounts stay blocked; invalid or rotated invitations grant no access.
 await env.DB!.batch([
  env.DB!.prepare("UPDATE members SET status='approved',updated_at=? WHERE user_id=? AND status='pending' AND EXISTS (SELECT 1 FROM app_groups WHERE invite_code=?)").bind(now,user.userId,code),
  env.DB!.prepare("INSERT INTO group_members (group_id,user_id,role,joined_at) SELECT g.id,m.user_id,'member',? FROM app_groups g JOIN members m ON m.user_id=? WHERE g.invite_code=? AND m.status='approved' ON CONFLICT(group_id,user_id) DO NOTHING").bind(now,user.userId,code),
  env.DB!.prepare("DELETE FROM group_join_requests WHERE user_id=? AND EXISTS (SELECT 1 FROM members WHERE user_id=? AND status='approved')").bind(user.userId,user.userId),
 ]);
 const current=await env.DB!.prepare('SELECT id FROM app_groups WHERE id=? AND invite_code=?').bind(group.id,code).first();
 if(!current)return {inviteError:'邀請連結已更新，請向群組管理員索取新連結。'};
 const joined=Boolean(await env.DB!.prepare('SELECT user_id FROM group_members WHERE group_id=? AND user_id=?').bind(group.id,user.userId).first());
 return {invitedGroup:{...group,joined}};
}

export async function pendingGroupRequests(userId:string){
 const result=await env.DB!.prepare('SELECT g.id,g.name,g.theme FROM group_join_requests r JOIN app_groups g ON g.id=r.group_id AND g.invite_code=r.invite_code WHERE r.user_id=? ORDER BY r.requested_at,g.id').bind(userId).all<{id:string;name:string;theme:string}>();
 return result.results;
}
