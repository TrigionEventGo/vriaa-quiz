import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionValue,
} from "@/lib/admin-session-crypto";

function cookieValue(rawCookie: string | null, name: string): string | null {
  if (!rawCookie) return null;
  for (const part of rawCookie.split(";")) {
    const p = part.trim();
    if (p.startsWith(`${name}=`)) return decodeURIComponent(p.slice(name.length + 1));
  }
  return null;
}

/**
 * True when QUIZ_ADMIN_TOKEN is unset (dev convenience) or caller proves admin.
 */
export async function isAdminAuthorized(request: Request): Promise<boolean> {
  const envToken = process.env.QUIZ_ADMIN_TOKEN;
  if (!envToken) return true;
  const header = request.headers.get("x-quiz-admin-token");
  if (header === envToken) return true;
  const session = cookieValue(request.headers.get("cookie"), ADMIN_SESSION_COOKIE);
  if (!session) return false;
  return verifyAdminSessionValue(envToken, session);
}
