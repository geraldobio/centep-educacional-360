import { getChatGPTUser, isCentepAdminEmail } from "../../chatgpt-auth";

export type AdminUser = {
  email: string;
};

export async function authorizeAdminRequest(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return {
      response: Response.json({ error: "Faça login para continuar." }, { status: 401 }),
    } as const;
  }
  if (!isCentepAdminEmail(user.email)) {
    return {
      response: Response.json({ error: "Acesso não autorizado." }, { status: 403 }),
    } as const;
  }

  const requestOrigin = request.headers.get("origin");
  const requestHost = request.headers.get("host");
  if (requestOrigin && requestHost && new URL(requestOrigin).host !== requestHost) {
    return {
      response: Response.json(
        { error: "Origem da solicitação não permitida." },
        { status: 403 },
      ),
    } as const;
  }

  return { user: { email: user.email } satisfies AdminUser } as const;
}

export async function parseEnrollmentId(params: Promise<{ id: string }>) {
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
