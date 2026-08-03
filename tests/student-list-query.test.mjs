import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const sourceUrl = new URL(
  "../app/admin-online/students/student-list-query.ts",
  import.meta.url,
);

const source = await readFile(sourceUrl, "utf8");

const JavaScript = stripTypeScriptTypes(source, {
  mode: "strip",
  sourceUrl: sourceUrl.href,
});

const moduleUrl =
  `data:text/javascript;base64,${Buffer.from(JavaScript).toString("base64")}`;

const { studentListSql } = await import(moduleUrl);

test(
  "student list keeps one latest enrollment per student before LIMIT",
  () => {
    const database = new DatabaseSync(":memory:");

    try {
      database.exec(`
        CREATE TABLE enrollments (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL
        );

        CREATE TABLE students (
          id TEXT PRIMARY KEY,
          source_enrollment_id INTEGER NOT NULL,
          registration_number TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE academic_enrollments (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          course TEXT NOT NULL,
          class_name TEXT NOT NULL,
          shift TEXT NOT NULL,
          status TEXT NOT NULL,
          enrolled_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      const insertEnrollment = database.prepare(`
        INSERT INTO enrollments (id, name)
        VALUES (?, ?)
      `);

      const insertStudent = database.prepare(`
        INSERT INTO students (
          id,
          source_enrollment_id,
          registration_number,
          created_at
        ) VALUES (?, ?, ?, ?)
      `);

      const insertAcademicEnrollment = database.prepare(`
        INSERT INTO academic_enrollments (
          id,
          student_id,
          course,
          class_name,
          shift,
          status,
          enrolled_at,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertEnrollment.run(1, "Aluno com vários vínculos");
      insertEnrollment.run(2, "Aluno que não pode desaparecer");

      insertStudent.run(
        "student-a",
        1,
        "CENTEP-2026-A",
        "2026-01-01T00:00:00.000Z",
      );

      insertStudent.run(
        "student-b",
        2,
        "CENTEP-2026-B",
        "2025-01-01T00:00:00.000Z",
      );

      database.exec("BEGIN");

      try {
        for (let index = 0; index <= 500; index += 1) {
          const timestamp = new Date(
            Date.UTC(2026, 0, 1, 0, 0, index),
          ).toISOString();

          insertAcademicEnrollment.run(
            `academic-a-${String(index).padStart(3, "0")}`,
            "student-a",
            `Curso ${index}`,
            `Turma ${index}`,
            "Manhã",
            "Ativa",
            timestamp,
            timestamp,
          );
        }

        insertAcademicEnrollment.run(
          "academic-b-001",
          "student-b",
          "Curso do aluno B",
          "Turma B",
          "Noite",
          "Ativa",
          "2025-01-01T00:00:00.000Z",
          "2025-01-01T00:00:00.000Z",
        );

        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }

      const rows = database.prepare(studentListSql).all();

      assert.equal(
        rows.length,
        2,
        "cada aluno deve aparecer apenas uma vez",
      );

      assert.deepEqual(
        rows
          .map((row) => row.student_id)
          .sort(),
        ["student-a", "student-b"],
        "o segundo aluno não pode ser ocultado pelos 501 vínculos do primeiro",
      );

      const studentA = rows.find(
        (row) => row.student_id === "student-a",
      );

      assert.ok(studentA);
      assert.equal(studentA.course, "Curso 500");
      assert.equal(studentA.class_name, "Turma 500");

      assert.equal(
        rows.filter((row) => row.student_id === "student-a").length,
        1,
        "o aluno com múltiplos vínculos não pode ser duplicado",
      );
    } finally {
      database.close();
    }
  },
);
