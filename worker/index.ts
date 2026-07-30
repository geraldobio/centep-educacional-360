/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { setD1Database, type D1Binding } from "../db";
import { verifyCloudflareAccessToken } from "./cloudflare-access";

interface Env {
  ASSETS: {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  };
  DB: D1Binding;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  CF_ACCESS_AUD?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const ACCESS_ASSERTION_HEADER = "cf-access-jwt-assertion";
const ACCESS_EMAIL_HEADER = "cf-access-authenticated-user-email";
const OPENAI_EMAIL_HEADER = "oai-authenticated-user-email";
const OPENAI_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const OPENAI_FULL_NAME_ENCODING_HEADER = "oai-authenticated-user-full-name-encoding";
const VERIFIED_ACCESS_EMAIL_HEADER = "x-centep-verified-access-email";

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    setD1Database(env.DB);
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const verifiedRequest = isProtectedAdminPath(url.pathname)
      ? await authorizeCloudflareAccessRequest(request, env)
      : request;
    if (verifiedRequest instanceof Response) return verifiedRequest;

    return handler.fetch(verifiedRequest, env, ctx);
  },
};

async function authorizeCloudflareAccessRequest(
  request: Request,
  env: Env,
): Promise<Request | Response> {
  const audience = env.CF_ACCESS_AUD?.trim() ?? "";
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim() ?? "";
  if (!audience || !teamDomain) {
    console.error("Cloudflare Access configuration is missing for an admin request.");
    return protectedError(request, 503, "A proteção administrativa não está configurada.");
  }

  const token = request.headers.get(ACCESS_ASSERTION_HEADER) ?? "";
  if (!token) {
    return protectedError(request, 401, "Autenticação administrativa necessária.");
  }

  try {
    const identity = await verifyCloudflareAccessToken(token, {
      audience,
      teamDomain,
    });
    const headers = new Headers(request.headers);

    // Do not pass authentication material or identity headers supplied by the
    // client. The application only receives the email extracted from the
    // verified Access JWT.
    headers.delete(ACCESS_ASSERTION_HEADER);
    headers.delete(ACCESS_EMAIL_HEADER);
    headers.delete(OPENAI_EMAIL_HEADER);
    headers.delete(OPENAI_FULL_NAME_HEADER);
    headers.delete(OPENAI_FULL_NAME_ENCODING_HEADER);
    headers.delete(VERIFIED_ACCESS_EMAIL_HEADER);
    headers.set(VERIFIED_ACCESS_EMAIL_HEADER, identity.email);

    return new Request(request, { headers });
  } catch (error) {
    console.error("Cloudflare Access token verification failed", error);
    return protectedError(request, 401, "Sessão administrativa inválida ou expirada.");
  }
}

function isProtectedAdminPath(pathname: string): boolean {
  return (
    pathname === "/admin-online" ||
    pathname.startsWith("/admin-online/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/")
  );
}

function protectedError(request: Request, status: number, message: string): Response {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  const pathname = new URL(request.url).pathname;

  if (pathname === "/api/admin" || pathname.startsWith("/api/admin/")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
    return new Response(JSON.stringify({ error: message }), { status, headers });
  }

  headers.set("Content-Type", "text/plain; charset=utf-8");
  return new Response(message, { status, headers });
}

export default worker;
