import { cookies } from "next/headers";

export const ADMIN_COOKIE = "mf_admin";
export const MEMBER_COOKIE = "mf_member";

// 관리자 고정 계정
export const ADMIN_ID = "merryfit";
export const ADMIN_PW = "2026";

export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get(ADMIN_COOKIE)?.value === "1";
}

export async function currentMemberId(): Promise<string | null> {
  const c = await cookies();
  return c.get(MEMBER_COOKIE)?.value ?? null;
}
