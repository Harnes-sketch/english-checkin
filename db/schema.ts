import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const checkins = sqliteTable("checkins", {
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  completed: integer("completed").notNull().default(0),
  minutes: integer("minutes").notNull().default(0),
  note: text("note").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
}, (table) => [primaryKey({ columns: [table.userId, table.date] })]);
