// 출석 적립금 등급 — 많이 나온 회원일수록 1회 적립금이 올라간다.
//
// 금액을 바꿀 일이 생기면 POINT_TIERS 한 곳만 고치면 된다.
// 오픈 이벤트로 "출석할 때마다 5,000원"을 공지했으므로 시작 등급은 5,000원이다.
import { ATTEND_POINT } from "./types";

export interface PointTier {
  name: string;
  /** 누적 출석 횟수가 이 값 이상이면 이 등급 */
  minAttend: number;
  /** 출석 1회당 적립금 */
  point: number;
  /** 회원 화면에 보여줄 한 줄 설명 */
  note: string;
}

// minAttend 오름차순으로 둔다.
export const POINT_TIERS: PointTier[] = [
  { name: "웰컴", minAttend: 0, point: ATTEND_POINT, note: "출석할 때마다 5,000원" },
  { name: "루틴", minAttend: 12, point: 6000, note: "12회부터 6,000원" },
  { name: "코어", minAttend: 36, point: 7000, note: "36회부터 7,000원" },
  { name: "메리", minAttend: 72, point: 9000, note: "72회부터 9,000원" },
];

// 한 달에 적립이 붙는 출석 횟수 상한. 0 이면 상한 없음(현재 값).
//
// 무제한 회원이 주 5~6회 나오면 1년에 200만원 넘는 적립금이 쌓여 회비의 절반을
// 넘어선다. 그때 이 값을 8~12 로 두면 일반 회원은 영향이 없고 극단적인 경우만
// 막힌다. 지금은 "출석할 때마다 5,000원"으로 공지했으므로 상한을 두지 않는다.
export const MONTHLY_POINT_CAP = 0;

/** 이번 달 적립 대상인지 — 상한이 0 이면 항상 true */
export function withinMonthlyCap(attendsThisMonth: number): boolean {
  return MONTHLY_POINT_CAP === 0 || attendsThisMonth <= MONTHLY_POINT_CAP;
}

/** 누적 출석 n회인 회원의 현재 등급 */
export function tierFor(attendCount: number): PointTier {
  let cur = POINT_TIERS[0];
  for (const t of POINT_TIERS) {
    if (attendCount >= t.minAttend) cur = t;
  }
  return cur;
}

/** 다음 등급과 남은 출석 횟수. 최고 등급이면 null. */
export function nextTier(attendCount: number): { tier: PointTier; remaining: number } | null {
  const next = POINT_TIERS.find((t) => attendCount < t.minAttend);
  return next ? { tier: next, remaining: next.minAttend - attendCount } : null;
}

/**
 * 이번 출석으로 받을 적립금.
 * 출석을 반영하기 "전"의 누적 횟수를 넘긴다 — 12회째 출석에서 루틴 등급이 되도록
 * 0-based 로 세면 12번째 출석 시점의 이전 횟수가 11이 되어 한 번 밀린다.
 * 그래서 이번 출석을 포함한 횟수(attendCount + 1)로 등급을 판단한다.
 */
export function pointForAttend(attendCountBefore: number): number {
  return tierFor(attendCountBefore + 1).point;
}
