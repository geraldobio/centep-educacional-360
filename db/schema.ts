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

export const enrollmentNotes = sqliteTable(
  "enrollment_notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    enrollmentId: integer("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    authorEmail: text("author_email").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("enrollment_notes_enrollment_created_idx").on(table.enrollmentId, table.createdAt),
  ],
);

export const enrollmentHistory = sqliteTable(
  "enrollment_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    enrollmentId: integer("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    description: text("description").notNull(),
    authorEmail: text("author_email").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("enrollment_history_enrollment_created_idx").on(table.enrollmentId, table.createdAt),
  ],
);

export const enrollmentDocuments = sqliteTable(
  "enrollment_documents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    enrollmentId: integer("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    documentType: text("document_type").notNull(),
    label: text("label").notNull(),
    status: text("status").notNull().default("Pendente"),
    note: text("note").notNull().default(""),
    updatedBy: text("updated_by").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("enrollment_documents_enrollment_type_unique").on(
      table.enrollmentId,
      table.documentType,
    ),
    index("enrollment_documents_status_idx").on(table.status),
  ],
);
