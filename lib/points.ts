// 출석 적립금 — 지점별로 요율이 다르고, 무제한권은 적립되지 않는다.
//
// 금액이나 기준을 바꿀 일이 생기면 BRANCH_TIERS 한 곳만 고치면 된다.
import { ATTEND_POINT, Branch } from "./types";

export interface PointTier {
  name: string;
  /** 누적 출석 횟수가 이 값 이상이면 이 등급 */
  minAttend: number;
  /** 출석 1회당 적립금 */
  point: number;
  /** 회원 화면에 보여줄 한 줄 설명 */
  note: string;
}

// 각 배열은 minAttend 오름차순.
//
// 북구점: 오픈 이벤트라 처음부터 5,000원으로 시작한다.
// 남구점: 이미 운영 중인 지점이라 2,000원에서 시작해 100회에 5,000원이 된다.
//         오래 다닌 회원에게만 북구점과 같은 대우를 해주는 구조다.
export const BRANCH_TIERS: Record<Branch, PointTier[]> = {
  "2호점": [
    { name: "웰컴", minAttend: 0, point: ATTEND_POINT, note: "출석할 때마다 5,000원" },
    { name: "루틴", minAttend: 12, point: 6000, note: "12회부터 6,000원" },
    { name: "코어", minAttend: 36, point: 7000, note: "36회부터 7,000원" },
    { name: "메리", minAttend: 72, point: 9000, note: "72회부터 9,000원" },
  ],
  "1호점": [
    { name: "시작", minAttend: 0, point: 2000, note: "출석할 때마다 2,000원" },
    { name: "루틴", minAttend: 30, point: 3000, note: "30회부터 3,000원" },
    { name: "코어", minAttend: 60, point: 4000, note: "60회부터 4,000원" },
    { name: "메리", minAttend: 100, point: ATTEND_POINT, note: "100회부터 5,000원" },
  ],
};

// 한 달에 적립이 붙는 출석 횟수 상한. 0 이면 상한 없음(현재 값).
// 무제한권을 적립에서 빼면서 가장 큰 비용 요인은 사라졌지만, 필요하면 여기서 조인다.
export const MONTHLY_POINT_CAP = 0;

/** 이번 달 적립 대상인지 — 상한이 0 이면 항상 true */
export function withinMonthlyCap(attendsThisMonth: number): boolean {
  return MONTHLY_POINT_CAP === 0 || attendsThisMonth <= MONTHLY_POINT_CAP;
}

/**
 * 무제한권으로 들은 수업은 적립하지 않는다.
 * 무제한권은 많이 나올수록 회당 단가가 내려가는데 적립까지 붙으면
 * 회비보다 적립금이 커지는 구간이 생긴다.
 *
 * 수강권 이름은 관리자가 직접 입력하므로 한글·영문 표기를 모두 본다.
 * ("무제한", "루틴패스 Unlimited" 등)
 */
export function isUnlimitedPass(passType: string | null | undefined): boolean {
  if (!passType) return false;
  const t = passType.toLowerCase();
  return t.includes("무제한") || t.includes("unlimited");
}

function tiers(branch: Branch): PointTier[] {
  return BRANCH_TIERS[branch] ?? BRANCH_TIERS["2호점"];
}

/** 해당 지점 기준, 누적 n회인 회원의 현재 등급 */
export function tierFor(branch: Branch, attendCount: number): PointTier {
  let cur = tiers(branch)[0];
  for (const t of tiers(branch)) {
    if (attendCount >= t.minAttend) cur = t;
  }
  return cur;
}

/** 다음 등급과 남은 출석 횟수. 최고 등급이면 null. */
export function nextTier(branch: Branch, attendCount: number): { tier: PointTier; remaining: number } | null {
  const next = tiers(branch).find((t) => attendCount < t.minAttend);
  return next ? { tier: next, remaining: next.minAttend - attendCount } : null;
}
