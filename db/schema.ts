// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const tasks = sqliteTable('tasks', {
 id:text('id').primaryKey(), title:text('title').notNull(), date:text('date').notNull(), assignee:text('assignee').notNull(), description:text('description').notNull(), notes:text('notes').notNull(), status:text('status').notNull(), creator:text('creator').notNull(), creatorUserId:text('creator_user_id'), photos:text('photos').notNull().default('[]'), version:integer('version').notNull().default(1), createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull()
});
export const members=sqliteTable('members',{
 userId:text('user_id').primaryKey(),displayName:text('display_name').notNull(),status:text('status').notNull().default('pending'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
});
