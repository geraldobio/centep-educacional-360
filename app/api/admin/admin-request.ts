import { getChatGPTUser, isCentepAdminEmail } from "../../chatgpt-auth";

export type AdminUser = {
  email: string;
};

export function adminJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("X-Content-Type-Options", "nosniff");
  return Response.json(body, { ...init, headers });
}

export async function authorizeAdminRequest(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return {
      response: adminJson({ error: "Faça login para continuar." }, { status: 401 }),
    } as const;
  }
  if (!isCentepAdminEmail(user.email)) {
    return {
      response: adminJson({ error: "Acesso não autorizado." }, { status: 403 }),
    } as const;
  }

  const method = request.method.toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const requestOrigin = request.headers.get("origin");
    const expectedOrigin = new URL(request.url).origin;
    const fetchSite = request.headers.get("sec-fetch-site");
    if (
      !requestOrigin ||
      requestOrigin !== expectedOrigin ||
      (fetchSite && fetchSite !== "same-origin")
    ) {
      return {
        response: adminJson(
          { error: "Origem da solicitação não permitida." },
          { status: 403 },
        ),
      } as const;
    }
  }

  return { user: { email: user.email } satisfies AdminUser } as const;
}

export async function parseEnrollmentId(params: Promise<{ id: string }>) {
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
