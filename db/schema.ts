import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const tasks = sqliteTable('tasks', {
 groupId:text('group_id').notNull().default('legacy'),
 id:text('id').primaryKey(), title:text('title').notNull(), date:text('date').notNull(), assignee:text('assignee').notNull(), description:text('description').notNull(), notes:text('notes').notNull(), status:text('status').notNull(), creator:text('creator').notNull(), creatorUserId:text('creator_user_id'), photos:text('photos').notNull().default('[]'), version:integer('version').notNull().default(1), createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull()
},t=>[index('tasks_group_date_idx').on(t.groupId,t.date)]);
export const appGroups=sqliteTable('app_groups',{
 theme:text('theme').notNull().default('sage'),
 id:text('id').primaryKey(),name:text('name').notNull(),inviteCode:text('invite_code').notNull().unique(),createdBy:text('created_by').notNull(),createdAt:text('created_at').notNull()
});
export const groupMembers=sqliteTable('group_members',{
 groupId:text('group_id').notNull(),userId:text('user_id').notNull(),role:text('role').notNull().default('member'),joinedAt:text('joined_at').notNull()
},t=>[primaryKey({columns:[t.groupId,t.userId]}),index('group_members_user_idx').on(t.userId)]);
export const groupJoinRequests=sqliteTable('group_join_requests',{
 groupId:text('group_id').notNull(),userId:text('user_id').notNull(),inviteCode:text('invite_code').notNull(),requestedAt:text('requested_at').notNull()
},t=>[primaryKey({columns:[t.groupId,t.userId]}),index('group_join_requests_user_idx').on(t.userId)]);
export const members=sqliteTable('members',{
 userId:text('user_id').primaryKey(),displayName:text('display_name').notNull(),status:text('status').notNull().default('pending'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
});
export const userPreferences=sqliteTable('user_preferences',{
 userId:text('user_id').primaryKey(),boardTitle:text('board_title').notNull()
});
