// 메리핏 예약 레이어 — 파일 기반 데이터 저장소 (프로토타입용)
// 실제 운영 단계에서 Supabase 등 공유 DB로 교체합니다.
import fs from "fs";
import path from "path";
import { DB, Member, Pass, ScheduleSlot, Branch, ProgramName, PassScope, ATTEND_POINT } from "./types";
import { BRANCH_GEO, ENFORCE_GEOFENCE, distanceM } from "./branches";
import { DOW_LABEL, WEEK_ORDER } from "./week-constants";
export { DOW_LABEL, WEEK_ORDER };

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function uid(prefix: string): string {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}

// 프로그램·지점별 기본 정원
export function programCapacity(program: ProgramName, branch: Branch): number {
  if (branch === "2호점") return 12;
  if (program === "기구 필라테스") return 4;
  if (program === "단체수업") return 12;
  return 6; // 바레 · 필라웨이트
}

// ---------- 이번 주 날짜 계산 ----------
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
// 특정 주(weekOffset: 0=이번주, 1=다음주)의 월요일
export function mondayOfWeek(weekOffset = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=일..6=토
  const diff = (dow + 6) % 7; // 월요일까지 며칠 뒤로
  d.setDate(d.getDate() - diff + weekOffset * 7);
  return d;
}
// 해당 주에서 특정 요일(dow)의 날짜(ISO)
export function occurrenceDate(dayOfWeek: number, weekOffset = 0): string {
  const mon = mondayOfWeek(weekOffset);
  const idx = (dayOfWeek + 6) % 7; // 월=0..일=6
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

// 취소 가능 여부: 당일·전날은 불가 (수업일이 오늘 기준 2일 이상 남아야 취소 가능)
export function canCancelDate(date: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date + "T00:00:00");
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  return diffDays >= 2;
}

// ---------- 시드 ----------
function seed(): DB {
  const members: Member[] = [
    { id: "m_jieun", name: "김지은", phone: "010-1111-2222", branch: "1호점", points: 15000, memo: "거북목 주의 · 오전 수업 선호" },
    { id: "m_seoyeon", name: "박서연", phone: "010-3333-4444", branch: "1호점", points: 0, memo: "" },
    { id: "m_minji", name: "이민지", phone: "010-5555-6666", branch: "1호점", points: 40000, memo: "무릎 통증 이력 · 저강도로 시작" },
  ];
  const passes: Pass[] = [
    { id: "p_1", memberId: "m_jieun", type: "자유수강권 20회", total: 20, remaining: 12, scope: "both" },
    { id: "p_2", memberId: "m_seoyeon", type: "자유수강권 10회", total: 10, remaining: 3, scope: "1호점" },
    { id: "p_3", memberId: "m_minji", type: "자유수강권 50회", total: 50, remaining: 41, scope: "both" },
  ];

  const slots: ScheduleSlot[] = [];
  const add = (dow: number, time: string, program: ProgramName) =>
    slots.push({
      id: uid("sl"),
      branch: "1호점",
      program,
      dayOfWeek: dow,
      time,
      capacity: programCapacity(program, "1호점"),
    });

  // 평일(월~금)
  for (const dow of [1, 2, 3, 4, 5]) {
    add(dow, "09:00", "기구 필라테스");
    add(dow, "10:00", "기구 필라테스");
    add(dow, "19:00", "기구 필라테스");
  }
  add(2, "20:00", "바레");
  add(4, "20:00", "바레");
  add(1, "18:00", "필라웨이트");
  add(3, "18:00", "필라웨이트");
  add(5, "18:00", "필라웨이트");
  // 토요일
  add(6, "10:00", "기구 필라테스");
  add(6, "11:00", "바레");
  // 일요일
  add(0, "10:00", "기구 필라테스");
  add(0, "11:00", "바레");

  return { members, passes, slots, reservations: [] };
}

export function getDB(): DB {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const s = seed();
    fs.writeFileSync(DB_PATH, JSON.stringify(s, null, 2), "utf-8");
    return s;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as DB;
}
export function saveDB(db: DB): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// ---------- 조회 ----------
export function listMembers(): Member[] {
  return getDB().members;
}
export function getMember(id: string): Member | undefined {
  return getDB().members.find((m) => m.id === id);
}
export function memberRemaining(memberId: string): number {
  return getDB()
    .passes.filter((p) => p.memberId === memberId)
    .reduce((s, p) => s + p.remaining, 0);
}
export function attendedCount(memberId: string): number {
  return getDB().reservations.filter(
    (r) => r.memberId === memberId && r.status === "attended"
  ).length;
}
export function listSlots(branch?: Branch): ScheduleSlot[] {
  const slots = getDB().slots;
  return branch ? slots.filter((s) => s.branch === branch) : slots;
}
// 시간표에 나타나는 시간대(열) 목록
export function distinctTimes(branch?: Branch): string[] {
  const set = new Set(listSlots(branch).map((s) => s.time));
  return [...set].sort();
}
export function slotAt(branch: Branch, dow: number, time: string): ScheduleSlot | undefined {
  return getDB().slots.find(
    (s) => s.branch === branch && !s.date && s.dayOfWeek === dow && s.time === time
  );
}
// 특정 날짜 칸에 들어갈 수업: 1회성(날짜 일치) 우선, 없으면 매주 반복(요일 일치)
export function slotForCell(
  branch: Branch,
  dow: number,
  time: string,
  date: string
): ScheduleSlot | undefined {
  const slots = getDB().slots.filter((s) => s.branch === branch && s.time === time);
  return (
    slots.find((s) => s.date === date) ||
    slots.find((s) => !s.date && s.dayOfWeek === dow)
  );
}
export function listOneTimeSlots(): ScheduleSlot[] {
  return getDB()
    .slots.filter((s) => s.date)
    .sort((a, b) => (a.date! + a.time).localeCompare(b.date! + b.time));
}
export function slotReservations(slotId: string, date: string) {
  return getDB().reservations.filter(
    (r) => r.slotId === slotId && r.date === date && r.status !== "cancelled"
  );
}
export function slotBookedCount(slotId: string, date: string): number {
  return slotReservations(slotId, date).length;
}
export function isBooked(slotId: string, date: string, memberId: string): boolean {
  return slotReservations(slotId, date).some((r) => r.memberId === memberId);
}
export function getActiveReservation(slotId: string, date: string, memberId: string) {
  return getDB().reservations.find(
    (r) => r.slotId === slotId && r.date === date && r.memberId === memberId && r.status !== "cancelled"
  );
}

// ---------- 변경 ----------
export function book(slotId: string, memberId: string, date: string): { ok: boolean; msg: string } {
  const db = getDB();
  const slot = db.slots.find((s) => s.id === slotId);
  if (!slot) return { ok: false, msg: "수업을 찾을 수 없습니다." };
  if (date < todayISO()) return { ok: false, msg: "지난 수업입니다." };
  const existing = db.reservations.filter(
    (r) => r.slotId === slotId && r.date === date && r.status !== "cancelled"
  );
  if (existing.some((r) => r.memberId === memberId)) return { ok: false, msg: "이미 예약함" };
  if (existing.length >= slot.capacity) return { ok: false, msg: "정원 마감" };
  // 신청 시 즉시 잔여 1회 차감. 해당 지점에서 쓸 수 있는 수강권 중,
  // 지점 전용을 먼저 소진(공용 수강권을 아껴둔다).
  const eligible = db.passes
    .filter(
      (p) =>
        p.memberId === memberId &&
        p.remaining > 0 &&
        (p.scope === "both" || p.scope === slot.branch)
    )
    .sort((a, b) => (a.scope === "both" ? 1 : 0) - (b.scope === "both" ? 1 : 0));
  const pass = eligible[0];
  if (!pass) return { ok: false, msg: `${slot.branch}에서 쓸 수 있는 잔여가 없어요.` };
  pass.remaining -= 1;
  db.reservations.push({ id: uid("r"), slotId, memberId, date, status: "booked", passId: pass.id });
  saveDB(db);
  return { ok: true, msg: "예약 완료" };
}
// 취소: 당일·전날은 불가, 취소 시 잔여 1회 복구
export function cancel(reservationId: string): { ok: boolean; msg: string } {
  const db = getDB();
  const r = db.reservations.find((x) => x.id === reservationId);
  if (!r || r.status !== "booked") return { ok: false, msg: "취소할 수 없습니다." };
  if (!canCancelDate(r.date)) return { ok: false, msg: "당일·전날에는 취소할 수 없어요." };
  r.status = "cancelled";
  // 차감했던 수강권으로 정확히 복구
  const pass =
    db.passes.find((p) => p.id === r.passId) ||
    db.passes.find((p) => p.memberId === r.memberId);
  if (pass) pass.remaining += 1;
  saveDB(db);
  return { ok: true, msg: "예약이 취소되었습니다." };
}
// 출석: 신청 때 이미 차감했으므로 여기선 적립만
export function checkIn(reservationId: string): { ok: boolean; msg: string } {
  const db = getDB();
  const r = db.reservations.find((x) => x.id === reservationId);
  if (!r) return { ok: false, msg: "예약 없음" };
  if (r.status !== "booked") return { ok: false, msg: "이미 처리됨" };
  const member = db.members.find((m) => m.id === r.memberId);
  if (member) member.points += ATTEND_POINT; // 출석 적립
  r.status = "attended";
  saveDB(db);
  return { ok: true, msg: "출석 처리" };
}
// 위치 검증 셀프 체크인: 오늘 예약한 수업을, 센터 반경 안에서 출석 처리
export function selfCheckIn(
  memberId: string,
  lat: number,
  lng: number
): { ok: boolean; msg: string } {
  const db = getDB();
  const member = db.members.find((m) => m.id === memberId);
  if (!member) return { ok: false, msg: "회원을 찾을 수 없습니다." };

  const today = todayISO();
  const todays = db.reservations
    .filter((r) => r.memberId === memberId && r.date === today && r.status === "booked")
    .map((r) => ({ r, slot: db.slots.find((s) => s.id === r.slotId) }))
    .filter((x) => x.slot) as { r: (typeof db.reservations)[number]; slot: ScheduleSlot }[];

  if (todays.length === 0) return { ok: false, msg: "오늘 예약된 수업이 없어요." };

  // 거리 검증(활성화된 경우)
  if (ENFORCE_GEOFENCE) {
    const geo = BRANCH_GEO[member.branch];
    const dist = distanceM(lat, lng, geo.lat, geo.lng);
    if (dist > geo.radiusM) {
      return {
        ok: false,
        msg: `센터에서 약 ${Math.round(dist)}m 떨어져 있어요. 센터에 도착해서 눌러주세요.`,
      };
    }
  }

  // 시간이 가장 이른 예약부터 출석 처리
  todays.sort((a, b) => a.slot.time.localeCompare(b.slot.time));
  const target = todays[0];
  const res = checkIn(target.r.id);
  if (!res.ok) return res;
  return {
    ok: true,
    msg: `${target.slot.time} ${target.slot.program} 출석 완료! +${ATTEND_POINT.toLocaleString()}P 적립 🎉`,
  };
}

export function addMember(name: string, phone: string, branch: Branch): void {
  const db = getDB();
  db.members.push({ id: uid("m"), name, phone, branch, points: 0, memo: "" });
  saveDB(db);
}
export function setMemberMemo(memberId: string, memo: string): void {
  const db = getDB();
  const m = db.members.find((x) => x.id === memberId);
  if (m) {
    m.memo = memo;
    saveDB(db);
  }
}
export function issuePass(memberId: string, type: string, total: number, scope: PassScope): void {
  const db = getDB();
  db.passes.push({ id: uid("p"), memberId, type, total, remaining: total, scope });
  saveDB(db);
}
export function addSlot(branch: Branch, program: ProgramName, dayOfWeek: number, time: string): void {
  const db = getDB();
  if (db.slots.some((s) => s.branch === branch && s.dayOfWeek === dayOfWeek && s.time === time)) return;
  db.slots.push({
    id: uid("sl"),
    branch,
    program,
    dayOfWeek,
    time,
    capacity: programCapacity(program, branch),
  });
  saveDB(db);
}
export function addOneTimeSlot(
  branch: Branch,
  program: ProgramName,
  date: string,
  time: string
): void {
  const db = getDB();
  const dow = new Date(date + "T00:00:00").getDay();
  db.slots.push({
    id: uid("sl"),
    branch,
    program,
    dayOfWeek: dow,
    time,
    capacity: programCapacity(program, branch),
    date,
  });
  saveDB(db);
}
export function deleteSlot(slotId: string): void {
  const db = getDB();
  db.slots = db.slots.filter((s) => s.id !== slotId);
  saveDB(db);
}
