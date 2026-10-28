import {env} from 'cloudflare:workers';
import {requireMember,AccessError,type Actor} from './access';
import type {GroupTheme} from './group-themes';

export const legacyGroupId='legacy';
export type Group={id:string;name:string;theme:GroupTheme;role:'owner'|'member'};

// Existing tasks and previously approved members stay together after upgrading.
// A site administrator owns this migrated group, but has no access to other groups.
export async function ensureLegacyOwner(user:Actor){
 if(user.isAdmin){
  await env.DB!.prepare("INSERT INTO group_members (group_id,user_id,role,joined_at) VALUES (? ,?,'owner',?) ON CONFLICT(group_id,user_id) DO UPDATE SET role='owner'").bind(legacyGroupId,user.userId,new Date().toISOString()).run();
 }
}

export async function requireGroup(request:Request,explicitId?:string){
 const user=await requireMember(request);
 const groupId=explicitId??new URL(request.url).searchParams.get('groupId')??legacyGroupId;
 if(groupId===legacyGroupId)await ensureLegacyOwner(user);
 const group=await env.DB!.prepare('SELECT g.id,g.name,g.theme,gm.role FROM app_groups g JOIN group_members gm ON gm.group_id=g.id WHERE g.id=? AND gm.user_id=?').bind(groupId,user.userId).first<Group>();
 if(!group)throw new AccessError(404,'GROUP','找不到群組，或你尚未加入這個群組。');
 return {user,group};
}

export async function requireGroupOwner(request:Request,groupId?:string){
 const context=await requireGroup(request,groupId);
 if(context.group.role!=='owner')throw new AccessError(403,'GROUP_OWNER','只有群組管理員可以變更群組設定。');
 return context;
}
