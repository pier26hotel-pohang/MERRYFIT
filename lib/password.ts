// 비밀번호 해시 — 회원(연락처 로그인)과 강사 계정이 함께 쓴다.
// 평문은 어디에도 저장하지 않는다.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

function hash(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString("hex");
}

export function makePasswordRecord(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  return { hash: hash(password, salt), salt };
}

export function passwordMatches(password: string, storedHash: string, salt: string): boolean {
  if (!storedHash || !salt) return false;
  const a = Buffer.from(hash(password, salt), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// 최소 길이. 현장에서 쓰는 계정이라 너무 빡빡하게 두지 않는다.
export const MIN_PASSWORD = 4;
// 관리자·강사 계정은 회원 전체의 개인정보와 결제 내역을 볼 수 있으므로 더 길게 받는다.
export const MIN_STAFF_PASSWORD = 8;
