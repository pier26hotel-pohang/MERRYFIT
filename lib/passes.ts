// 수강권 상품과 월 정기 갱신 규칙
//
// 정기권은 매달 같은 날 횟수가 다시 채워진다. 예를 들어 3월 5일에 8회권을
// 끊었다면 4월 5일, 5월 5일에 각각 8회로 리셋된다. 남은 횟수는 이월되지 않는다.
//
// 갱신은 따로 도는 작업(크론) 없이, 조회·예약 시점에 "지금이 몇 번째 주기인지"를
// 계산해서 판단한다. 서버가 멈춰 있던 동안에도 날짜만 맞으면 그대로 맞아떨어진다.
import { PassScope } from "./types";

/** 판매 중인 수강권. 관리자가 매번 이름과 횟수를 타이핑하지 않도록 목록으로 둔다. */
export interface PassProduct {
  type: string;
  /** 월 이용 횟수. 무제한권은 0 */
  count: number;
  price: number;
  /** 매달 횟수가 다시 채워지는 정기권인가 */
  monthly: boolean;
  note?: string;
}

export const PASS_PRODUCTS: PassProduct[] = [
  { type: "1회 체험", count: 1, price: 30000, monthly: false, note: "등록 시 적립금 제공" },
  { type: "1주 무제한 체험권", count: 0, price: 80000, monthly: false, note: "1주간 모든 수업" },
  { type: "루틴패스 Lite", count: 4, price: 100000, monthly: true, note: "월 4회 · 주 1회" },
  { type: "루틴패스 Basic", count: 8, price: 170000, monthly: true, note: "월 8회 · 주 2회" },
  { type: "루틴패스 Pro", count: 12, price: 220000, monthly: true, note: "월 12회 · 주 3회" },
  { type: "루틴패스 Unlimited", count: 0, price: 280000, monthly: true, note: "무제한 · 정상가 35만원" },
];

export function findProduct(type: string): PassProduct | undefined {
  return PASS_PRODUCTS.find((p) => p.type === type);
}

// ---------- 날짜 계산 (모두 한국 날짜 문자열 "YYYY-MM-DD" 기준, 순수 함수) ----------

function parse(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

function fmt(y: number, m: number, d: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${y}-${p(m)}-${p(d)}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * 시작일에서 n개월 뒤. 그 달에 없는 날짜면 그 달의 마지막 날로 당긴다.
 * (1월 31일 시작 → 2월은 28일 또는 29일)
 */
export function addMonths(date: string, n: number): string {
  const { y, m, d } = parse(date);
  const total = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return fmt(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** a < b 이면 음수, 같으면 0, a > b 이면 양수 */
export function cmpDate(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * 오늘이 몇 번째 주기인지 — 시작일부터 몇 달이 지났나.
 * 시작일 당일이면 0.
 */
export function periodsElapsed(startDate: string, today: string): number {
  if (cmpDate(today, startDate) < 0) return 0;
  const s = parse(startDate);
  const t = parse(today);
  let n = (t.y - s.y) * 12 + (t.m - s.m);
  // 이번 달 갱신일이 아직 안 지났으면 한 주기 전이다.
  if (n > 0 && cmpDate(today, addMonths(startDate, n)) < 0) n -= 1;
  return Math.max(0, n);
}

/** 지금 주기의 시작일 */
export function currentPeriodStart(startDate: string, today: string): string {
  return addMonths(startDate, periodsElapsed(startDate, today));
}

/** 다음 갱신일 */
export function nextRenewal(startDate: string, today: string): string {
  return addMonths(startDate, periodsElapsed(startDate, today) + 1);
}

export interface RenewablePass {
  total: number;
  remaining: number;
  monthly: boolean;
  /** 이번 주기가 시작된 날. 정기권이 아니면 무시된다. */
  periodStart?: string;
  /** 정기권 종료일. 이 날이 지나면 더 갱신되지 않는다. null 이면 계속 */
  expiresAt?: string;
}

/** 만료됐는가 — 종료일 당일까지는 쓸 수 있다. */
export function isExpired(pass: RenewablePass, today: string): boolean {
  return Boolean(pass.expiresAt) && cmpDate(today, pass.expiresAt!) > 0;
}

/**
 * 지금 실제로 쓸 수 있는 횟수.
 * 정기권이고 갱신일이 지났으면 DB 값과 상관없이 total 로 돌아온다.
 * (DB 는 실제로 예약할 때 맞춰 쓴다 — 조회만으로 값을 바꾸지 않기 위해서다.)
 */
export function effectiveRemaining(pass: RenewablePass, today: string): number {
  if (isExpired(pass, today)) return 0;
  if (!pass.monthly || !pass.periodStart) return pass.remaining;
  return periodsElapsed(pass.periodStart, today) > 0 && pass.periodStart !== currentPeriodStart(pass.periodStart, today)
    ? pass.total
    : pass.remaining;
}

/** 이번 주기로 넘어왔는지 — 넘어왔으면 DB 의 period_start 와 remaining 을 고쳐야 한다. */
export function needsRollover(pass: RenewablePass, today: string): boolean {
  if (!pass.monthly || !pass.periodStart || isExpired(pass, today)) return false;
  return currentPeriodStart(pass.periodStart, today) !== pass.periodStart;
}

/**
 * 지금 이 수강권으로 예약할 수 있는가.
 * 무제한권은 횟수를 세지 않으므로 만료만 보면 된다.
 */
export function canUse(pass: RenewablePass & { type: string }, today: string): boolean {
  if (isExpired(pass, today)) return false;
  if (isUnlimited(pass.type)) return true;
  return effectiveRemaining(pass, today) > 0;
}

/** 수강권 이름으로 무제한권을 알아본다 (적립 제외·횟수 무제한 판단에 쓴다) */
export function isUnlimited(passType: string | null | undefined): boolean {
  if (!passType) return false;
  const t = passType.toLowerCase();
  return t.includes("무제한") || t.includes("unlimited");
}

export type { PassScope };
