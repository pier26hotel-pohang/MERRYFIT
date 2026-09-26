// 강사 계정 · 수업 단가 · 급여 정산
//
// 급여는 "슬롯에 배정된 강사 + 그 회차의 실제 예약 인원"에서 자동으로 나온다.
// 인원 구간마다 단가가 다르므로(2명 수업과 6명 수업의 값이 다름),
// 강사별로 구간 단가를 두고 회차마다 구간을 판정한다.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "./supabase";
import { DB, Branch } from "./types";

// ---------- 단가 구간 ----------
export type RateKind = "private" | "g2" | "g3" | "g4" | "g6" | "outside";

export const RATE_KINDS: { kind: RateKind; label: string }[] = [
  { kind: "private", label: "프라이빗(1명)" },
  { kind: "g2", label: "2명" },
  { kind: "g3", label: "3명" },
  { kind: "g4", label: "4~5명" },
  { kind: "g6", label: "6명 이상" },
  { kind: "outside", label: "외부출강" },
];

// 관리자가 바꾸기 전까지 쓰는 기본 단가 (실제 지급 이력의 평균대에 맞춤)
export const DEFAULT_RATES: Record<RateKind, number> = {
  private: 35000,
  g2: 25000,
  g3: 30000,
  g4: 35000,
  g6: 37500,
  outside: 40000,
};

// 예약 인원 → 단가 구간
export function rateKindFor(headcount: number, isOutside = false): RateKind {
  if (isOutside) return "outside";
  if (headcount <= 1) return "private";
  if (headcount === 2) return "g2";
  if (headcount === 3) return "g3";
  if (headcount <= 5) return "g4";
  return "g6";
}

// 프리랜서 원천징수 3.3% (소득세 3% + 지방소득세 0.3%)
export const TAX_INCOME = 0.03;
export const TAX_LOCAL = 0.003;

export interface Instructor {
  id: string;
  name: string;
  loginId: string;
  role: "admin" | "instructor";
  branch?: Branch;
  phone?: string;
  bank?: string;
  account?: string;
  active: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapInstructor(r: any): Instructor {
  return {
    id: r.id,
    name: r.name,
    loginId: r.login_id,
    role: r.role === "admin" ? "admin" : "instructor",
    branch: r.branch ?? undefined,
    phone: r.phone ?? undefined,
    bank: r.bank ?? undefined,
    account: r.account ?? undefined,
    active: r.active !== false,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function assertOk(label: string, res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(`${label} 실패: ${res.error.message}`);
}

function uid(prefix: string): string {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}

// ---------- 비밀번호 ----------
// 평문은 저장하지 않는다. scrypt + 계정별 salt.
function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString("hex");
}

export function makePasswordRecord(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  return { hash: hashPassword(password, salt), salt };
}

function passwordMatches(password: string, hash: string, salt: string): boolean {
  const a = Buffer.from(hashPassword(password, salt), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// 로그인 아이디는 대소문자를 구분하지 않는다(현장에서 헷갈림).
function normLoginId(s: string): string {
  return s.trim().toLowerCase();
}

// ---------- 조회 ----------
export async function listInstructors(includeInactive = false): Promise<Instructor[]> {
  const sb = supabaseAdmin();
  let q = sb.from("instructors").select("*");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) {
    console.error("[listInstructors]", error.message);
    return [];
  }
  return (data ?? []).map(mapInstructor).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export async function getInstructor(id: string): Promise<Instructor | null> {
  const { data, error } = await supabaseAdmin().from("instructors").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapInstructor(data);
}

export async function verifyLogin(loginId: string, password: string): Promise<Instructor | null> {
  const { data, error } = await supabaseAdmin()
    .from("instructors").select("*").eq("login_id", normLoginId(loginId)).maybeSingle();
  if (error || !data || data.active === false) return null;
  if (!passwordMatches(password, data.password_hash, data.password_salt)) return null;
  return mapInstructor(data);
}

/** 관리자 계정이 하나라도 있는지 — 최초 설정 화면을 열어둘지 판단한다. */
export async function adminAccountExists(): Promise<boolean> {
  const { count, error } = await supabaseAdmin()
    .from("instructors").select("id", { count: "exact", head: true })
    .eq("role", "admin").eq("active", true);
  // 조회에 실패하면 "있다"로 본다 — 설정 화면이 실수로 열리는 쪽이 더 위험하다.
  if (error) {
    console.error("[adminAccountExists]", error.message);
    return true;
  }
  return (count ?? 0) > 0;
}

// ---------- 등록 · 수정 ----------
export async function addInstructor(input: {
  name: string; loginId: string; password: string; role?: "admin" | "instructor";
  branch?: Branch; phone?: string; bank?: string; account?: string;
}): Promise<string> {
  const { hash, salt } = makePasswordRecord(input.password);
  const id = uid("in");
  assertOk("강사 등록", await supabaseAdmin().from("instructors").insert({
    id,
    name: input.name,
    login_id: normLoginId(input.loginId),
    password_hash: hash,
    password_salt: salt,
    role: input.role ?? "instructor",
    branch: input.branch ?? null,
    phone: input.phone || null,
    bank: input.bank || null,
    account: input.account || null,
    active: true,
  }));
  // 기본 단가를 함께 깔아준다 — 단가가 없으면 급여가 0으로 보인다.
  assertOk("기본 단가 설정", await supabaseAdmin().from("instructor_rates").insert(
    (Object.keys(DEFAULT_RATES) as RateKind[]).map((kind) => ({
      instructor_id: id, kind, amount: DEFAULT_RATES[kind],
    }))
  ));
  return id;
}

export async function setPassword(instructorId: string, password: string): Promise<void> {
  const { hash, salt } = makePasswordRecord(password);
  assertOk("비밀번호 변경", await supabaseAdmin()
    .from("instructors").update({ password_hash: hash, password_salt: salt }).eq("id", instructorId));
}

export async function setActive(instructorId: string, active: boolean): Promise<void> {
  assertOk("강사 상태 변경", await supabaseAdmin().from("instructors").update({ active }).eq("id", instructorId));
}

export async function setRates(instructorId: string, rates: Partial<Record<RateKind, number>>): Promise<void> {
  const rows = (Object.keys(rates) as RateKind[])
    .filter((k) => Number.isFinite(rates[k]))
    .map((kind) => ({ instructor_id: instructorId, kind, amount: Math.max(0, Math.round(rates[kind]!)) }));
  if (!rows.length) return;
  assertOk("단가 저장", await supabaseAdmin()
    .from("instructor_rates").upsert(rows, { onConflict: "instructor_id,kind" }));
}

export async function getRates(instructorId: string): Promise<Record<RateKind, number>> {
  const { data, error } = await supabaseAdmin()
    .from("instructor_rates").select("kind,amount").eq("instructor_id", instructorId);
  if (error) console.error("[getRates]", error.message);
  const out = { ...DEFAULT_RATES };
  for (const r of data ?? []) out[r.kind as RateKind] = r.amount;
  return out;
}

export async function assignInstructor(slotId: string, instructorId: string | null): Promise<void> {
  assertOk("강사 배정", await supabaseAdmin()
    .from("slots").update({ instructor_id: instructorId }).eq("id", slotId));
}

// ---------- 급여 집계 ----------
export interface LessonRow {
  date: string; // YYYY-MM-DD
  time: string;
  branch: string;
  program: string;
  headcount: number; // 취소를 뺀 실제 인원
  attended: number; // 그중 출석 처리된 인원
  kind: RateKind;
  rate: number;
  amount: number;
}

export interface Payroll {
  instructor: Instructor;
  month: string; // YYYY-MM
  lessons: LessonRow[];
  byKind: { kind: RateKind; label: string; count: number; rate: number; amount: number }[];
  lessonCount: number;
  emptyCount: number; // 예약 0명이라 진행되지 않은 회차
  gross: number;
  incomeTax: number;
  localTax: number;
  net: number;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
}

export function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

// 최근 12개월 (선택 목록용)
export function recentMonths(n = 12): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

// 매주 반복 슬롯이 해당 월에 실제로 몇 번 열렸는지 날짜로 펼친다.
function occurrencesInMonth(dayOfWeek: number, from: string, to: string): string[] {
  const out: string[] = [];
  const end = new Date(to + "T00:00:00");
  for (const d = new Date(from + "T00:00:00"); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === dayOfWeek) out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return out;
}

// 한 강사의 한 달치 급여를 계산한다.
// 인원 0인 회차(폐강)는 금액에 넣지 않고 건수만 따로 센다.
export function computePayroll(
  db: DB,
  instructor: Instructor,
  month: string,
  rates: Record<RateKind, number>,
  slotInstructor: Map<string, string | null>
): Payroll {
  const { from, to } = monthRange(month);
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const mine = db.slots.filter((s) => slotInstructor.get(s.id) === instructor.id);
  const lessons: LessonRow[] = [];
  let emptyCount = 0;

  for (const slot of mine) {
    const dates = slot.date
      ? slot.date >= from && slot.date <= to
        ? [slot.date]
        : []
      : occurrencesInMonth(slot.dayOfWeek, from, to);

    for (const date of dates) {
      if (date > todayISO) continue; // 아직 오지 않은 수업은 집계하지 않는다
      const rows = db.reservations.filter(
        (r) => r.slotId === slot.id && r.date === date && r.status !== "cancelled"
      );
      const headcount = rows.length;
      if (headcount === 0) {
        emptyCount += 1;
        continue;
      }
      const kind = rateKindFor(headcount);
      const rate = rates[kind] ?? 0;
      lessons.push({
        date,
        time: slot.time,
        branch: slot.branch,
        program: slot.program,
        headcount,
        attended: rows.filter((r) => r.status === "attended").length,
        kind,
        rate,
        amount: rate,
      });
    }
  }

  lessons.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));

  const byKind = RATE_KINDS.map(({ kind, label }) => {
    const hit = lessons.filter((l) => l.kind === kind);
    return { kind, label, count: hit.length, rate: rates[kind] ?? 0, amount: hit.reduce((s, l) => s + l.amount, 0) };
  }).filter((r) => r.count > 0);

  const gross = lessons.reduce((s, l) => s + l.amount, 0);
  // 10원 미만 절사 — 실제 이체 금액과 맞추기 위해.
  const incomeTax = Math.floor((gross * TAX_INCOME) / 10) * 10;
  const localTax = Math.floor((gross * TAX_LOCAL) / 10) * 10;

  return {
    instructor,
    month,
    lessons,
    byKind,
    lessonCount: lessons.length,
    emptyCount,
    gross,
    incomeTax,
    localTax,
    net: gross - incomeTax - localTax,
  };
}

// 슬롯 → 담당 강사 맵 (slots 테이블의 instructor_id)
export async function slotInstructorMap(): Promise<Map<string, string | null>> {
  const { data, error } = await supabaseAdmin().from("slots").select("id,instructor_id");
  if (error) {
    console.error("[slotInstructorMap]", error.message);
    return new Map();
  }
  return new Map((data ?? []).map((r) => [r.id as string, (r.instructor_id ?? null) as string | null]));
}
