import { cookies } from "next/headers";

export const ADMIN_COOKIE = "mf_admin";
export const MEMBER_COOKIE = "mf_member";
export const STAFF_COOKIE = "mf_staff"; // 강사·관리자 계정(instructors.id)

// 고정 관리자 계정 (복구용).
// 비밀번호를 코드에 두지 않는다 — Vercel 환경변수 MERRYFIT_ADMIN_ID / MERRYFIT_ADMIN_PW 로만 켠다.
// 둘 중 하나라도 비어 있으면 고정 계정 로그인은 꺼지고, instructors 테이블의 관리자 계정만 쓸 수 있다.
export const ADMIN_ID = process.env.MERRYFIT_ADMIN_ID ?? "";
export const ADMIN_PW = process.env.MERRYFIT_ADMIN_PW ?? "";
export const FIXED_ADMIN_ENABLED = ADMIN_ID.length > 0 && ADMIN_PW.length >= 8;

export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get(ADMIN_COOKIE)?.value === "1";
}

export async function currentMemberId(): Promise<string | null> {
  const c = await cookies();
  return c.get(MEMBER_COOKIE)?.value ?? null;
}

// 로그인한 강사(또는 관리자 계정)의 instructors.id
export async function currentStaffId(): Promise<string | null> {
  const c = await cookies();
  return c.get(STAFF_COOKIE)?.value ?? null;
}
