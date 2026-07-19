import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const enrollments = sqliteTable(
  "enrollments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    protocol: text("protocol").notNull(),
    name: text("name").notNull(),
    cpf: text("cpf").notNull(),
    birthDate: text("birth_date").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    city: text("city").notNull(),
    course: text("course").notNull(),
    shift: text("shift").notNull(),
    experience: text("experience").notNull().default("Iniciante"),
    message: text("message").notNull().default(""),
    status: text("status").notNull().default("Nova"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("enrollments_protocol_unique").on(table.protocol),
    index("enrollments_created_at_idx").on(table.createdAt),
    index("enrollments_status_idx").on(table.status),
  ],
);
