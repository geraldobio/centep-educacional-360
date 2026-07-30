type AccessJwtHeader = {
  alg?: unknown;
  kid?: unknown;
  typ?: unknown;
};

type AccessJwtPayload = {
  aud?: unknown;
  email?: unknown;
  exp?: unknown;
  iat?: unknown;
  iss?: unknown;
  nbf?: unknown;
  sub?: unknown;
  type?: unknown;
};

type AccessJwk = JsonWebKey & {
  alg?: string;
  kid?: string;
  kty?: string;
  use?: string;
};

type JwksCacheEntry = {
  expiresAt: number;
  keys: Map<string, AccessJwk>;
};

export type CloudflareAccessConfig = {
  audience: string;
  teamDomain: string;
};

export type CloudflareAccessIdentity = {
  email: string;
  subject: string | null;
};

const CLOCK_SKEW_SECONDS = 60;
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_TOKEN_LENGTH = 16_384;
const jwksCache = new Map<string, JwksCacheEntry>();

export async function verifyCloudflareAccessToken(
  token: string,
  config: CloudflareAccessConfig,
): Promise<CloudflareAccessIdentity> {
  if (!token || token.length > MAX_TOKEN_LENGTH) {
    throw new Error("Invalid Cloudflare Access token length.");
  }

  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error("Malformed Cloudflare Access token.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJsonSegment<AccessJwtHeader>(encodedHeader);
  if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid) {
    throw new Error("Unsupported Cloudflare Access token header.");
  }

  const teamDomain = normalizeTeamDomain(config.teamDomain);
  const audience = config.audience.trim();
  if (!audience) {
    throw new Error("Missing Cloudflare Access audience.");
  }

  const jwk = await getSigningKey(teamDomain, header.kid);
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signedData = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = decodeBase64Url(encodedSignature);
  const validSignature = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    publicKey,
    signature,
    signedData,
  );
  if (!validSignature) {
    throw new Error("Invalid Cloudflare Access token signature.");
  }

  const payload = decodeJsonSegment<AccessJwtPayload>(encodedPayload);
  validateClaims(payload, teamDomain, audience);

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email) {
    throw new Error("Cloudflare Access token does not contain an email address.");
  }

  return {
    email,
    subject: typeof payload.sub === "string" && payload.sub ? payload.sub : null,
  };
}

function validateClaims(payload: AccessJwtPayload, teamDomain: string, audience: string) {
  if (payload.iss !== teamDomain) {
    throw new Error("Invalid Cloudflare Access token issuer.");
  }
  if (payload.type !== "app") {
    throw new Error("Invalid Cloudflare Access token type.");
  }

  const audiences =
    typeof payload.aud === "string"
      ? [payload.aud]
      : Array.isArray(payload.aud)
        ? payload.aud.filter((item): item is string => typeof item === "string")
        : [];
  if (!audiences.includes(audience)) {
    throw new Error("Invalid Cloudflare Access token audience.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now - CLOCK_SKEW_SECONDS) {
    throw new Error("Expired Cloudflare Access token.");
  }
  if (typeof payload.nbf === "number" && payload.nbf > now + CLOCK_SKEW_SECONDS) {
    throw new Error("Cloudflare Access token is not active yet.");
  }
  if (typeof payload.iat === "number" && payload.iat > now + CLOCK_SKEW_SECONDS) {
    throw new Error("Cloudflare Access token was issued in the future.");
  }
}

async function getSigningKey(teamDomain: string, kid: string): Promise<AccessJwk> {
  const certsUrl = `${teamDomain}/cdn-cgi/access/certs`;
  const cached = jwksCache.get(certsUrl);
  if (cached && cached.expiresAt > Date.now()) {
    const cachedKey = cached.keys.get(kid);
    if (cachedKey) return cachedKey;
  }

  const response = await fetch(certsUrl, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Unable to load Cloudflare Access signing keys (${response.status}).`);
  }

  const jwks = (await response.json()) as { keys?: unknown };
  if (!Array.isArray(jwks.keys)) {
    throw new Error("Invalid Cloudflare Access signing key response.");
  }

  const keys = new Map<string, AccessJwk>();
  for (const item of jwks.keys) {
    if (!item || typeof item !== "object") continue;
    const key = item as AccessJwk;
    if (
      typeof key.kid === "string" &&
      key.kid &&
      key.kty === "RSA" &&
      (!key.alg || key.alg === "RS256") &&
      (!key.use || key.use === "sig")
    ) {
      keys.set(key.kid, key);
    }
  }

  jwksCache.set(certsUrl, {
    expiresAt: Date.now() + JWKS_CACHE_TTL_MS,
    keys,
  });

  const key = keys.get(kid);
  if (!key) {
    throw new Error("Cloudflare Access signing key was not found.");
  }
  return key;
}

function normalizeTeamDomain(value: string): string {
  const url = new URL(value.trim());
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Invalid Cloudflare Access team domain.");
  }
  return url.origin;
}

function decodeJsonSegment<T>(segment: string): T {
  const decoded = new TextDecoder().decode(decodeBase64Url(segment));
  try {
    return JSON.parse(decoded) as T;
  } catch {
    throw new Error("Malformed Cloudflare Access token JSON.");
  }
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error("Malformed Cloudflare Access token encoding.");
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
