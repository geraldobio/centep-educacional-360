import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const verifierSourceUrl = new URL("../worker/cloudflare-access.ts", import.meta.url);
const verifierSource = await readFile(verifierSourceUrl, "utf8");
const verifierJavaScript = stripTypeScriptTypes(verifierSource, {
  mode: "strip",
  sourceUrl: verifierSourceUrl.href,
});
const verifierModuleUrl = `data:text/javascript;base64,${Buffer.from(verifierJavaScript).toString("base64")}`;
const { verifyCloudflareAccessToken } = await import(verifierModuleUrl);

const encoder = new TextEncoder();

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function generateSigningKey(kid) {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const exported = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  return {
    privateKey: keyPair.privateKey,
    publicJwk: {
      ...exported,
      alg: "RS256",
      kid,
      use: "sig",
    },
  };
}

async function signToken(privateKey, kid, payload, headerOverrides = {}) {
  const header = { alg: "RS256", kid, typ: "JWT", ...headerOverrides };
  const encodedHeader = base64UrlJson(header);
  const encodedPayload = base64UrlJson(payload);
  const signedData = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    encoder.encode(signedData),
  );

  return `${signedData}.${Buffer.from(signature).toString("base64url")}`;
}

function validPayload(teamDomain, audience, overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    aud: [audience],
    email: " Admin@CENTEP.Example ",
    exp: now + 300,
    iat: now - 5,
    iss: teamDomain,
    sub: "user-123",
    type: "app",
    ...overrides,
  };
}

async function withJwks(teamDomain, keys, callback) {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  globalThis.fetch = async (input, init) => {
    fetchCalls += 1;
    assert.equal(String(input), `${teamDomain}/cdn-cgi/access/certs`);
    assert.equal(new Headers(init?.headers).get("accept"), "application/json");
    return new Response(JSON.stringify({ keys }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    return await callback(() => fetchCalls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("Cloudflare Access JWT verifier", async (t) => {
  await t.test("accepts a valid RS256 token, normalizes email, and caches JWKS", async () => {
    const teamDomain = "https://valid-access.example";
    const audience = "valid-audience";
    const key = await generateSigningKey("valid-key");
    const token = await signToken(
      key.privateKey,
      "valid-key",
      validPayload(teamDomain, audience, { aud: ["other-audience", audience] }),
    );

    await withJwks(teamDomain, [key.publicJwk], async (getFetchCalls) => {
      const identity = await verifyCloudflareAccessToken(token, {
        audience,
        teamDomain: `${teamDomain}/`,
      });
      assert.deepEqual(identity, {
        email: "admin@centep.example",
        subject: "user-123",
      });

      const secondIdentity = await verifyCloudflareAccessToken(token, {
        audience,
        teamDomain,
      });
      assert.deepEqual(secondIdentity, identity);
      assert.equal(getFetchCalls(), 1);
    });
  });

  await t.test("rejects an invalid issuer", async () => {
    const teamDomain = "https://issuer-access.example";
    const audience = "issuer-audience";
    const key = await generateSigningKey("issuer-key");
    const token = await signToken(
      key.privateKey,
      "issuer-key",
      validPayload(teamDomain, audience, { iss: "https://attacker.example" }),
    );

    await withJwks(teamDomain, [key.publicJwk], async () => {
      await assert.rejects(
        verifyCloudflareAccessToken(token, { audience, teamDomain }),
        /issuer/i,
      );
    });
  });

  await t.test("rejects an invalid audience", async () => {
    const teamDomain = "https://audience-access.example";
    const audience = "expected-audience";
    const key = await generateSigningKey("audience-key");
    const token = await signToken(
      key.privateKey,
      "audience-key",
      validPayload(teamDomain, "different-audience"),
    );

    await withJwks(teamDomain, [key.publicJwk], async () => {
      await assert.rejects(
        verifyCloudflareAccessToken(token, { audience, teamDomain }),
        /audience/i,
      );
    });
  });

  await t.test("rejects expired and not-yet-active tokens", async (subtest) => {
    await subtest.test("expired", async () => {
      const teamDomain = "https://expired-access.example";
      const audience = "expired-audience";
      const key = await generateSigningKey("expired-key");
      const now = Math.floor(Date.now() / 1000);
      const token = await signToken(
        key.privateKey,
        "expired-key",
        validPayload(teamDomain, audience, { exp: now - 120 }),
      );

      await withJwks(teamDomain, [key.publicJwk], async () => {
        await assert.rejects(
          verifyCloudflareAccessToken(token, { audience, teamDomain }),
          /expired/i,
        );
      });
    });

    await subtest.test("future nbf", async () => {
      const teamDomain = "https://future-access.example";
      const audience = "future-audience";
      const key = await generateSigningKey("future-key");
      const now = Math.floor(Date.now() / 1000);
      const token = await signToken(
        key.privateKey,
        "future-key",
        validPayload(teamDomain, audience, { nbf: now + 120 }),
      );

      await withJwks(teamDomain, [key.publicJwk], async () => {
        await assert.rejects(
          verifyCloudflareAccessToken(token, { audience, teamDomain }),
          /not active yet/i,
        );
      });
    });
  });

  await t.test("rejects unsupported algorithms before loading signing keys", async () => {
    const teamDomain = "https://algorithm-access.example";
    const audience = "algorithm-audience";
    const header = base64UrlJson({ alg: "HS256", kid: "algorithm-key" });
    const payload = base64UrlJson(validPayload(teamDomain, audience));
    const token = `${header}.${payload}.AA`;

    await assert.rejects(
      verifyCloudflareAccessToken(token, { audience, teamDomain }),
      /unsupported.*header/i,
    );
  });

  await t.test("rejects an unknown signing key", async () => {
    const teamDomain = "https://unknown-key-access.example";
    const audience = "unknown-key-audience";
    const key = await generateSigningKey("known-key");
    const token = await signToken(
      key.privateKey,
      "missing-key",
      validPayload(teamDomain, audience),
    );

    await withJwks(teamDomain, [key.publicJwk], async () => {
      await assert.rejects(
        verifyCloudflareAccessToken(token, { audience, teamDomain }),
        /signing key was not found/i,
      );
    });
  });

  await t.test("rejects a token with an invalid signature", async () => {
    const teamDomain = "https://signature-access.example";
    const audience = "signature-audience";
    const trustedKey = await generateSigningKey("trusted-key");
    const attackerKey = await generateSigningKey("attacker-key");
    const token = await signToken(
      attackerKey.privateKey,
      "trusted-key",
      validPayload(teamDomain, audience),
    );

    await withJwks(teamDomain, [trustedKey.publicJwk], async () => {
      await assert.rejects(
        verifyCloudflareAccessToken(token, { audience, teamDomain }),
        /signature/i,
      );
    });
  });

  await t.test("rejects tokens without an email address", async () => {
    const teamDomain = "https://email-access.example";
    const audience = "email-audience";
    const key = await generateSigningKey("email-key");
    const token = await signToken(
      key.privateKey,
      "email-key",
      validPayload(teamDomain, audience, { email: "" }),
    );

    await withJwks(teamDomain, [key.publicJwk], async () => {
      await assert.rejects(
        verifyCloudflareAccessToken(token, { audience, teamDomain }),
        /email address/i,
      );
    });
  });

  await t.test("rejects oversized and malformed tokens", async () => {
    await assert.rejects(
      verifyCloudflareAccessToken("a".repeat(16_385), {
        audience: "oversized-audience",
        teamDomain: "https://oversized-access.example",
      }),
      /length/i,
    );
    await assert.rejects(
      verifyCloudflareAccessToken("not-a-jwt", {
        audience: "malformed-audience",
        teamDomain: "https://malformed-access.example",
      }),
      /malformed/i,
    );
  });
});
