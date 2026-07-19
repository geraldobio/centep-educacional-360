import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished CENTEP home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>CENTEP Educacional 360<\/title>/i);
  assert.match(html, /Conhecimento que se ouve/);
  assert.match(html, /Técnico e Operador de Som/);
  assert.match(html, /CENTEP LAB/);
  assert.match(html, /Portal do Professor/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("renders all requested application routes", async () => {
  for (const pathname of ["/login", "/matricula", "/portal-aluno", "/portal-professor", "/admin"]) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
  }

  const login = await (await render("/login")).text();
  assert.match(login, /Bem-vindo de volta/);
  assert.match(login, /Acessos de demonstração/);
  assert.match(login, /aluno@centep\.com\.br/);
});

test("keeps demo role routing explicit and documented", async () => {
  const [auth, readme, packageJson] = await Promise.all([
    readFile(new URL("../app/lib/demo-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(auth, /destination: "\/portal-aluno"/);
  assert.match(auth, /destination: "\/portal-professor"/);
  assert.match(auth, /destination: "\/admin"/);
  assert.match(auth, /centep-demo-session/);
  assert.match(readme, /login.*é demonstrativo/is);
  assert.match(readme, /pnpm dev/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
