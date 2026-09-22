// 메리핏 예약 레이어 — Supabase 데이터 접근
// 조회: loadSnapshot()으로 전체를 한 번 읽어 순수 함수로 계산
// 변경: Supabase에 직접 쓰기(async)
import { supabaseAdmin } from "./supabase";
import { DB, Member, Pass, ScheduleSlot, Branch, BRANCH_LABEL, ProgramName, PassScope, ATTEND_POINT, WELCOME_PASS, PointRequest, PointRequestStatus } from "./types";
import { makePasswordRecord, passwordMatches } from "./password";
import { DOW_LABEL, WEEK_ORDER } from "./week-constants";
export { DOW_LABEL, WEEK_ORDER };

function uid(prefix: string): string {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}

// Supabase 쓰기 결과를 반드시 확인한다.
// 예전에는 error 를 그냥 흘려보내서, 컬럼 누락 같은 문제가
// "버튼을 눌러도 아무 일도 안 일어난다"로만 보였다.
function assertOk(label: string, res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(`${label} 실패: ${res.error.message}`);
}

// 프로그램·지점별 기본 정원
export function programCapacity(program: ProgramName, branch: Branch): number {
  if (branch === "2호점") return 12;
  if (program === "기구 필라테스") return 4;
  if (program === "단체수업") return 12;
  return 6;
}

// ---------- 날짜 계산 (순수) ----------
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function mondayOfWeek(weekOffset = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const diff = (dow + 6) % 7;
  d.setDate(d.getDate() - diff + weekOffset * 7);
  return d;
}
export function occurrenceDate(dayOfWeek: number, weekOffset = 0): string {
  const mon = mondayOfWeek(weekOffset);
  const idx = (dayOfWeek + 6) % 7;
  mon.setDate(mon.getDate() + idx);
  return toISO(mon);
}
export function todayISO(): string {
  return toISO(new Date());
}
export function weekRangeLabel(weekOffset = 0): string {
  const mon = mondayOfWeek(weekOffset);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  return `${mon.getMonth() + 1}/${mon.getDate()} ~ ${sun.getMonth() + 1}/${sun.getDate()}`;
}
export function canCancelDate(date: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date + "T00:00:00");
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  return diffDays >= 2;
}

// ---------- 스냅샷 로드 (DB→앱 타입 매핑) ----------
/* eslint-disable @typescript-eslint/no-explicit-any */
function mapMember(r: any): Member {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone ?? "",
    branch: r.branch,
    points: r.points ?? 0,
    memo: r.memo ?? "",
    birthdate: r.birthdate ?? undefined,
    address: r.address ?? undefined,
    createdAt: r.created_at ?? undefined,
    kakaoId: r.auth_user_id ?? undefined,
  };
}
function mapPass(r: any): Pass {
  return { id: r.id, memberId: r.member_id, type: r.type, total: r.total, remaining: r.remaining, scope: r.scope };
}
function mapSlot(r: any): ScheduleSlot {
  return { id: r.id, branch: r.branch, program: r.program, dayOfWeek: r.day_of_week, time: r.time, capacity: r.capacity, date: r.date ?? undefined };
}
function mapRes(r: any): DB["reservations"][number] {
  return { id: r.id, slotId: r.slot_id, memberId: r.member_id, date: r.date, status: r.status, passId: r.pass_id ?? undefined };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function loadSnapshot(): Promise<DB> {
  const sb = supabaseAdmin();
  const [m, p, s, r] = await Promise.all([
    sb.from("members").select("*"),
    sb.from("passes").select("*"),
    sb.from("slots").select("*"),
    sb.from("reservations").select("*"),
  ]);
  // 조회 실패는 화면을 죽이지 않되(공개 시간표), 서버 로그에는 반드시 남긴다.
  for (const [label, res] of [["members", m], ["passes", p], ["slots", s], ["reservations", r]] as const) {
    if (res.error) console.error(`[loadSnapshot] ${label}: ${res.error.message}`);
  }
  return {
    members: (m.data ?? []).map(mapMember),
    passes: (p.data ?? []).map(mapPass),
    slots: (s.data ?? []).map(mapSlot),
    reservations: (r.data ?? []).map(mapRes),
  };
}

// ---------- 조회 (순수: 스냅샷 db를 받아 계산) ----------
export function listMembers(db: DB): Member[] {
  return [...db.members].sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
export function getMember(db: DB, id: string): Member | undefined {
  return db.members.find((m) => m.id === id);
}
export function getMemberByPhone(db: DB, phone: string): Member | undefined {
  const norm = (s: string) => s.replace(/[^0-9]/g, "");
  const p = norm(phone);
  return db.members.find((m) => norm(m.phone) === p);
}
export function memberPasses(db: DB, memberId: string): Pass[] {
  return db.passes.filter((p) => p.memberId === memberId);
}
export function memberRemaining(db: DB, memberId: string): number {
  return db.passes.filter((p) => p.memberId === memberId).reduce((s, p) => s + p.remaining, 0);
}
export function attendedCount(db: DB, memberId: string): number {
  return db.reservations.filter((r) => r.memberId === memberId && r.status === "attended").length;
}
export function listSlots(db: DB, branch?: Branch): ScheduleSlot[] {
  return branch ? db.slots.filter((s) => s.branch === branch) : db.slots;
}
export function distinctTimes(db: DB, branch?: Branch): string[] {
  const set = new Set(listSlots(db, branch).map((s) => s.time));
  return [...set].sort();
}
export function slotForCell(db: DB, branch: Branch, dow: number, time: string, date: string): ScheduleSlot | undefined {
  const slots = db.slots.filter((s) => s.branch === branch && s.time === time);
  return slots.find((s) => s.date === date) || slots.find((s) => !s.date && s.dayOfWeek === dow);
}
export function listOneTimeSlots(db: DB): ScheduleSlot[] {
  return db.slots.filter((s) => s.date).sort((a, b) => (a.date! + a.time).localeCompare(b.date! + b.time));
}
export function slotReservations(db: DB, slotId: string, date: string) {
  return db.reservations.filter((r) => r.slotId === slotId && r.date === date && r.status !== "cancelled");
}
export function slotBookedCount(db: DB, slotId: string, date: string): number {
  return slotReservations(db, slotId, date).length;
}
export function getActiveReservation(db: DB, slotId: string, date: string, memberId: string) {
  return db.reservations.find(
    (r) => r.slotId === slotId && r.date === date && r.memberId === memberId && r.status !== "cancelled"
  );
}
export function reservationsWithSlot(db: DB, memberId: string) {
  return db.reservations
    .filter((r) => r.memberId === memberId && r.status !== "cancelled")
    .map((r) => ({ r, slot: db.slots.find((s) => s.id === r.slotId) }))
    .filter((x) => x.slot) as { r: DB["reservations"][number]; slot: ScheduleSlot }[];
}
export function upcomingReservations(db: DB, memberId: string) {
  const today = todayISO();
  return reservationsWithSlot(db, memberId)
    .filter((x) => x.r.status === "booked" && x.r.date >= today)
    .sort((a, b) => (a.r.date + a.slot.time).localeCompare(b.r.date + b.slot.time));
}
export function adminStats(db: DB) {
  const today = todayISO();
  const monday = mondayOfWeek(0);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const weekStart = toISO(monday);
  const weekEnd = toISO(sunday);
  const active = db.reservations.filter((r) => r.status !== "cancelled");
  return {
    members: db.members.length,
    todayBooked: active.filter((r) => r.date === today).length,
    weekAttended: db.reservations.filter((r) => r.status === "attended" && r.date >= weekStart && r.date <= weekEnd).length,
    totalRemaining: db.passes.reduce((s, p) => s + p.remaining, 0),
  };
}

// ---------- 변경 (Supabase 쓰기) ----------
export async function book(slotId: string, memberId: string, date: string): Promise<{ ok: boolean; msg: string }> {
  const sb = supabaseAdmin();
  const { data: slot } = await sb.from("slots").select("*").eq("id", slotId).maybeSingle();
  if (!slot) return { ok: false, msg: "수업을 찾을 수 없습니다." };
  if (date < todayISO()) return { ok: false, msg: "지난 수업입니다." };
  const { data: existing } = await sb
    .from("reservations").select("*").eq("slot_id", slotId).eq("date", date).neq("status", "cancelled");
  const ex = existing ?? [];
  if (ex.some((r) => r.member_id === memberId)) return { ok: false, msg: "이미 예약함" };
  if (ex.length >= slot.capacity) return { ok: false, msg: "정원 마감" };
  const { data: passes } = await sb.from("passes").select("*").eq("member_id", memberId).gt("remaining", 0);
  const eligible = (passes ?? [])
    .filter((p) => p.scope === "both" || p.scope === slot.branch)
    .sort((a, b) => (a.scope === "both" ? 1 : 0) - (b.scope === "both" ? 1 : 0));
  const pass = eligible[0];
  if (!pass) return { ok: false, msg: `${BRANCH_LABEL[slot.branch as Branch] ?? slot.branch}에서 쓸 수 있는 잔여가 없어요.` };
  assertOk("수강권 차감", await sb.from("passes").update({ remaining: pass.remaining - 1 }).eq("id", pass.id));
  assertOk("예약 등록", await sb.from("reservations").insert({ id: uid("r"), slot_id: slotId, member_id: memberId, date, status: "booked", pass_id: pass.id }));
  return { ok: true, msg: "예약 완료" };
}

export async function cancel(reservationId: string): Promise<{ ok: boolean; msg: string }> {
  const sb = supabaseAdmin();
  const { data: r } = await sb.from("reservations").select("*").eq("id", reservationId).maybeSingle();
  if (!r || r.status !== "booked") return { ok: false, msg: "취소할 수 없습니다." };
  if (!canCancelDate(r.date)) return { ok: false, msg: "당일·전날에는 취소할 수 없어요." };
  assertOk("예약 취소", await sb.from("reservations").update({ status: "cancelled" }).eq("id", reservationId));
  // 차감했던 수강권 복구
  let passId = r.pass_id;
  if (!passId) {
    const { data: anyPass } = await sb.from("passes").select("id").eq("member_id", r.member_id).limit(1).maybeSingle();
    passId = anyPass?.id;
  }
  if (passId) {
    const { data: p } = await sb.from("passes").select("remaining").eq("id", passId).maybeSingle();
    if (p) assertOk("수강권 복구", await sb.from("passes").update({ remaining: p.remaining + 1 }).eq("id", passId));
  }
  return { ok: true, msg: "예약이 취소되었습니다." };
}

export async function checkIn(reservationId: string): Promise<{ ok: boolean; msg: string }> {
  const sb = supabaseAdmin();
  const { data: r } = await sb.from("reservations").select("*").eq("id", reservationId).maybeSingle();
  if (!r) return { ok: false, msg: "예약 없음" };
  if (r.status !== "booked") return { ok: false, msg: "이미 처리됨" };
  assertOk("출석 처리", await sb.from("reservations").update({ status: "attended" }).eq("id", reservationId));
  const { data: m } = await sb.from("members").select("points").eq("id", r.member_id).maybeSingle();
  if (m) assertOk("포인트 적립", await sb.from("members").update({ points: (m.points ?? 0) + ATTEND_POINT }).eq("id", r.member_id));
  return { ok: true, msg: "출석 처리" };
}

export async function selfCheckIn(memberId: string, lat: number, lng: number): Promise<{ ok: boolean; msg: string }> {
  const sb = supabaseAdmin();
  const { BRANCH_GEO, ENFORCE_GEOFENCE, distanceM } = await import("./branches");
  const { data: member } = await sb.from("members").select("*").eq("id", memberId).maybeSingle();
  if (!member) return { ok: false, msg: "회원을 찾을 수 없습니다." };
  const today = todayISO();
  const { data: rows } = await sb
    .from("reservations").select("*").eq("member_id", memberId).eq("date", today).eq("status", "booked");
  const { data: slots } = await sb.from("slots").select("*");
  const slotMap = new Map((slots ?? []).map((s) => [s.id, s]));
  const todays = (rows ?? [])
    .map((r) => ({ r, slot: slotMap.get(r.slot_id) }))
    .filter((x) => x.slot) as { r: { id: string }; slot: { time: string; program: string; branch: string } }[];
  if (todays.length === 0) return { ok: false, msg: "오늘 예약된 수업이 없어요." };
  todays.sort((a, b) => a.slot.time.localeCompare(b.slot.time));
  const target = todays[0];
  if (ENFORCE_GEOFENCE) {
    // 회원이 등록된 지점이 아니라 "지금 들으러 온 수업의 지점"을 기준으로 잰다.
    // 남구점 회원이 북구점 수업을 예약해 오는 경우가 있고, 카카오 가입자는
    // 지점이 기본값으로 들어가 있어서 member.branch 로 재면 엉뚱한 곳과 비교하게 된다.
    const geo = BRANCH_GEO[target.slot.branch];
    if (!geo) {
      // 좌표가 없는 지점이면 막지 않는다 — 설정 누락으로 회원을 돌려보내지 않는다.
      console.error("[selfCheckIn] 지오펜스 좌표 없음:", target.slot.branch);
    } else {
      const dist = distanceM(lat, lng, geo.lat, geo.lng);
      if (dist > geo.radiusM) {
        return { ok: false, msg: `${BRANCH_LABEL[target.slot.branch as Branch] ?? target.slot.branch}에서 약 ${Math.round(dist)}m 떨어져 있어요. 센터에 도착해서 눌러주세요.` };
      }
    }
  }
  const res = await checkIn(target.r.id);
  if (!res.ok) return res;
  return { ok: true, msg: `${target.slot.time} ${target.slot.program} 출석 완료! +${ATTEND_POINT.toLocaleString()}P 적립 🎉` };
}

export async function addMember(
  name: string,
  phone: string,
  branch: Branch,
  birthdate?: string,
  address?: string,
  password?: string
): Promise<string> {
  const id = uid("m");
  const pw = password ? makePasswordRecord(password) : null;
  assertOk("회원 등록", await supabaseAdmin().from("members").insert({
    id, name, phone, branch, points: 0, memo: "",
    birthdate: birthdate || null,
    address: address || null,
    password_hash: pw?.hash ?? null,
    password_salt: pw?.salt ?? null,
  }));
  // 가입 직후 아무것도 못 하는 구간이 없도록 체험 수강권을 바로 넣어준다.
  await issuePass(id, WELCOME_PASS.type, WELCOME_PASS.total, WELCOME_PASS.scope);
  return id;
}

// 연락처 + 비밀번호 로그인.
//   null  = 그런 연락처 없음
//   "nopw" = 회원은 있는데 비밀번호가 설정되지 않음(카카오 가입자·기존 회원)
//   "bad"  = 비밀번호 불일치
export async function verifyMemberLogin(
  phone: string,
  password: string
): Promise<{ id: string } | "nopw" | "bad" | null> {
  const digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const { data, error } = await supabaseAdmin().from("members").select("id,phone,password_hash,password_salt");
  if (error) {
    console.error("[verifyMemberLogin]", error.message);
    return null;
  }
  const m = (data ?? []).find((r) => String(r.phone ?? "").replace(/[^0-9]/g, "") === digits);
  if (!m) return null;
  if (!m.password_hash || !m.password_salt) return "nopw";
  return passwordMatches(password, m.password_hash, m.password_salt) ? { id: m.id } : "bad";
}

export async function setMemberPassword(memberId: string, password: string): Promise<void> {
  const pw = makePasswordRecord(password);
  assertOk("비밀번호 설정", await supabaseAdmin()
    .from("members").update({ password_hash: pw.hash, password_salt: pw.salt }).eq("id", memberId));
}

export async function memberHasPassword(memberId: string): Promise<boolean> {
  const { data } = await supabaseAdmin().from("members").select("password_hash").eq("id", memberId).maybeSingle();
  return Boolean(data?.password_hash);
}

// ---------- 적립금 전환 신청 ----------
/* eslint-disable @typescript-eslint/no-explicit-any */
function mapPointRequest(r: any): PointRequest {
  return {
    id: r.id, memberId: r.member_id, points: r.points,
    status: r.status as PointRequestStatus, memo: r.memo ?? undefined,
    createdAt: r.created_at ?? undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function requestPointTransfer(memberId: string): Promise<{ ok: boolean; msg: string }> {
  const sb = supabaseAdmin();
  const { data: m } = await sb.from("members").select("points").eq("id", memberId).maybeSingle();
  const points = m?.points ?? 0;
  if (points <= 0) return { ok: false, msg: "전환할 적립금이 없어요." };

  const { data: dup } = await sb
    .from("point_requests").select("id").eq("member_id", memberId).eq("status", "pending").maybeSingle();
  if (dup) return { ok: false, msg: "이미 신청하신 건이 처리 중이에요." };

  assertOk("전환 신청", await sb.from("point_requests").insert({
    id: uid("pr"), member_id: memberId, points, status: "pending",
  }));
  return { ok: true, msg: `${points.toLocaleString()}원 전환을 신청했어요. 확인 후 쇼핑몰에 반영해 드릴게요.` };
}

export async function listPointRequests(status?: PointRequestStatus): Promise<PointRequest[]> {
  let q = supabaseAdmin().from("point_requests").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) {
    console.error("[listPointRequests]", error.message);
    return [];
  }
  return (data ?? []).map(mapPointRequest);
}

export async function pendingPointRequest(memberId: string): Promise<PointRequest | null> {
  const { data } = await supabaseAdmin()
    .from("point_requests").select("*").eq("member_id", memberId).eq("status", "pending").maybeSingle();
  return data ? mapPointRequest(data) : null;
}

// 쇼핑몰에 지급 완료 → 앱 포인트를 그만큼 차감한다(두 곳에서 중복으로 보이지 않게).
export async function completePointRequest(requestId: string, memo?: string): Promise<void> {
  const sb = supabaseAdmin();
  const { data: req } = await sb.from("point_requests").select("*").eq("id", requestId).maybeSingle();
  if (!req || req.status !== "pending") return;
  const { data: m } = await sb.from("members").select("points").eq("id", req.member_id).maybeSingle();
  const left = Math.max(0, (m?.points ?? 0) - req.points);
  assertOk("포인트 차감", await sb.from("members").update({ points: left }).eq("id", req.member_id));
  assertOk("전환 완료", await sb.from("point_requests")
    .update({ status: "done", done_at: new Date().toISOString(), memo: memo || null }).eq("id", requestId));
}

export async function rejectPointRequest(requestId: string, memo?: string): Promise<void> {
  assertOk("전환 반려", await supabaseAdmin().from("point_requests")
    .update({ status: "rejected", done_at: new Date().toISOString(), memo: memo || null }).eq("id", requestId));
}
export async function setMemberMemo(memberId: string, memo: string): Promise<void> {
  assertOk("메모 저장", await supabaseAdmin().from("members").update({ memo }).eq("id", memberId));
}
export async function issuePass(memberId: string, type: string, total: number, scope: PassScope): Promise<void> {
  assertOk("수강권 발급", await supabaseAdmin().from("passes").insert({ id: uid("p"), member_id: memberId, type, total, remaining: total, scope }));
}
export async function addSlot(branch: Branch, program: ProgramName, dayOfWeek: number, time: string): Promise<void> {
  const sb = supabaseAdmin();
  const { data: dup } = await sb.from("slots").select("id").eq("branch", branch).eq("day_of_week", dayOfWeek).eq("time", time).is("date", null).maybeSingle();
  if (dup) return;
  assertOk("시간표 추가", await sb.from("slots").insert({ id: uid("sl"), branch, program, day_of_week: dayOfWeek, time, capacity: programCapacity(program, branch), date: null }));
}
export async function addOneTimeSlot(branch: Branch, program: ProgramName, date: string, time: string): Promise<void> {
  const dow = new Date(date + "T00:00:00").getDay();
  assertOk("특강 추가", await supabaseAdmin().from("slots").insert({ id: uid("sl"), branch, program, day_of_week: dow, time, capacity: programCapacity(program, branch), date }));
}
export async function deleteSlot(slotId: string): Promise<void> {
  assertOk("시간표 삭제", await supabaseAdmin().from("slots").delete().eq("id", slotId));
}
