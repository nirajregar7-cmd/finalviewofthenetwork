import { createInsertSchema } from 'drizzle-zod';
import { primaryKey, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod/v4';
import { groupMessages, users } from './schema';

export const entityChatReadCursors = pgTable('entity_chat_read_cursors', {
  groupId: text('group_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastSeenMessageId: text('last_seen_message_id')
    .notNull()
    .references(() => groupMessages.id, { onDelete: 'cascade' }),
  seenAt: timestamp('seen_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.groupId, table.userId] }),
}));

export const insertEntityChatReadCursorSchema = createInsertSchema(entityChatReadCursors)
  .omit({ seenAt: true });
export type InsertEntityChatReadCursor = z.infer<typeof insertEntityChatReadCursorSchema>;
export type EntityChatReadCursor = typeof entityChatReadCursors.$inferSelect;
