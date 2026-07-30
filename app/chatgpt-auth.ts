import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER = "oai-authenticated-user-full-name-encoding";
const VERIFIED_CLOUDFLARE_ACCESS_EMAIL_HEADER = "x-centep-verified-access-email";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const CENTEP_ADMIN_EMAILS = new Set([
  "geraldo.bio@gmail.com",
  "geraldobio@gmail.com",
]);

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const email =
    requestHeaders.get(USER_EMAIL_HEADER) ??
    requestHeaders.get(VERIFIED_CLOUDFLARE_ACCESS_EMAIL_HEADER);
  if (!email) return null;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    displayName: fullName ?? normalizedEmail,
    email: normalizedEmail,
    fullName,
  };
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(`/signin-with-chatgpt?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`);
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  return `/signout-with-chatgpt?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

export function isCentepAdminEmail(email: string): boolean {
  return CENTEP_ADMIN_EMAILS.has(email.trim().toLowerCase());
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/";
    if (["/signin-with-chatgpt", "/signout-with-chatgpt", "/callback"].includes(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
