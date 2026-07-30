import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const sourceUrl = new URL("../app/api/enrollments/validation.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const JavaScript = stripTypeScriptTypes(source, {
  mode: "strip",
  sourceUrl: sourceUrl.href,
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(JavaScript).toString("base64")}`;
const {
  isEnrollmentPayload,
  isValidBirthDate,
  isValidCpf,
  isValidEnrollmentData,
  normalizeEnrollmentPayload,
} = await import(moduleUrl);

const fixedNow = Date.UTC(2026, 6, 30);

function validPayload(overrides = {}) {
  return {
    name: "  Maria da Silva  ",
    cpf: "529.982.247-25",
    birthDate: "1990-05-20",
    email: " Maria@Example.COM ",
    phone: "(71) 99999-0000",
    city: " Pojuca ",
    course: "Técnico e Operador de Som",
    shift: "Noite",
    experience: "Tenho experiência básica",
    message: "  Quero trabalhar com eventos.  ",
    consent: "accepted",
    ...overrides,
  };
}

test("public enrollment validation", async (t) => {
  await t.test("accepts only plain object-like JSON payloads", () => {
    assert.equal(isEnrollmentPayload({}), true);
    assert.equal(isEnrollmentPayload(Object.create(null)), true);
    assert.equal(isEnrollmentPayload(null), false);
    assert.equal(isEnrollmentPayload([]), false);
    assert.equal(isEnrollmentPayload("payload"), false);
    assert.equal(isEnrollmentPayload(42), false);
  });

  await t.test("normalizes fields before persistence", () => {
    const normalized = normalizeEnrollmentPayload(validPayload());
    assert.deepEqual(normalized, {
      name: "Maria da Silva",
      cpf: "52998224725",
      birthDate: "1990-05-20",
      email: "maria@example.com",
      phone: "(71) 99999-0000",
      city: "Pojuca",
      course: "Técnico e Operador de Som",
      shift: "Noite",
      experience: "Tenho experiência básica",
      message: "Quero trabalhar com eventos.",
      consentAccepted: true,
    });
  });

  await t.test("validates CPF check digits and rejects repeated digits", () => {
    assert.equal(isValidCpf("52998224725"), true);
    assert.equal(isValidCpf("52998224724"), false);
    assert.equal(isValidCpf("00000000000"), false);
    assert.equal(isValidCpf("123"), false);
  });

  await t.test("rejects impossible and future birth dates", () => {
    assert.equal(isValidBirthDate("1990-05-20", fixedNow), true);
    assert.equal(isValidBirthDate("2024-02-29", fixedNow), true);
    assert.equal(isValidBirthDate("2023-02-29", fixedNow), false);
    assert.equal(isValidBirthDate("2026-07-31", fixedNow), false);
    assert.equal(isValidBirthDate("20/05/1990", fixedNow), false);
  });

  await t.test("accepts a complete valid enrollment", () => {
    const normalized = normalizeEnrollmentPayload(validPayload());
    assert.equal(isValidEnrollmentData(normalized, fixedNow), true);
  });

  await t.test("requires explicit consent", () => {
    const normalized = normalizeEnrollmentPayload(validPayload({ consent: undefined }));
    assert.equal(isValidEnrollmentData(normalized, fixedNow), false);
  });

  await t.test("rejects unlisted course, shift, and experience values", () => {
    for (const overrides of [
      { course: "Curso inventado" },
      { shift: "Madrugada" },
      { experience: "Especialista internacional" },
    ]) {
      const normalized = normalizeEnrollmentPayload(validPayload(overrides));
      assert.equal(isValidEnrollmentData(normalized, fixedNow), false);
    }
  });

  await t.test("rejects malformed contact and required fields", () => {
    for (const overrides of [
      { name: "Ana" },
      { email: "sem-arroba" },
      { phone: "12345" },
      { city: "" },
    ]) {
      const normalized = normalizeEnrollmentPayload(validPayload(overrides));
      assert.equal(isValidEnrollmentData(normalized, fixedNow), false);
    }
  });

  await t.test("applies field length limits", () => {
    const normalized = normalizeEnrollmentPayload(
      validPayload({ name: "A".repeat(200), message: "M".repeat(1200) }),
    );
    assert.equal(normalized.name.length, 120);
    assert.equal(normalized.message.length, 1000);
  });
});
