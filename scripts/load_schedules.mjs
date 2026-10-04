// 시간표 적재
//
//   미리보기:  node --env-file=.env.local scripts/load_schedules.mjs
//   실제 반영:  node --env-file=.env.local scripts/load_schedules.mjs --apply
//
// 북구점(2호점) — 매주 반복. 정원 14. 예약은 10/19부터(lib/types.ts BRANCH_OPEN_AT).
// 남구점(1호점) — 날짜별 1회성. 주 단위로 관리자가 바꾸는 운영이라 날짜를 박아 넣는다.
//
// 기존 슬롯은 지우고 다시 넣는다. 예약이 걸린 슬롯은 건드리지 않는다 —
// 지우면 그 예약이 사라진다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ---------- 북구점: 이미지 시간표 그대로 ----------
// 행 = 시각, 열 = 월·화·수·목·금 (토·일 없음)
const BUKGU_CAPACITY = 14;
const DOW = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5 };
const BUKGU_GRID = [
  ["06:30", { 화: "요가", 목: "요가" }],
  ["09:30", { 월: "바레", 화: "필라웨이트", 수: "필라테스", 목: "바레", 금: "필라테스" }],
  ["10:30", { 월: "바레", 화: "필라웨이트", 수: "필라테스", 목: "아로마", 금: "필라테스" }],
  ["14:00", { 월: "바레", 화: "바레", 수: "아로마", 목: "필라웨이트", 금: "바레" }],
  ["18:30", { 월: "아로마", 화: "바레", 수: "필라테스", 목: "필라웨이트", 금: "바레" }],
  ["19:30", { 월: "바레", 화: "아로마", 수: "요가", 목: "필라웨이트", 금: "바레" }],
  ["20:30", { 월: "바레", 화: "바레", 수: "필라테스", 목: "필라웨이트", 금: "아로마" }],
];

const bukgu = [];
for (const [time, row] of BUKGU_GRID) {
  for (const [day, program] of Object.entries(row)) {
    bukgu.push({
      branch: "2호점",
      program,
      day_of_week: DOW[day],
      time,
      capacity: BUKGU_CAPACITY,
      date: null, // 매주 반복
    });
  }
}

// ---------- 남구점: 엑셀에서 뽑아둔 날짜별 수업 ----------
const namgu = JSON.parse(fs.readFileSync(path.join(HERE, "namgu_schedule.json"), "utf8"));

console.log(`북구점 ${bukgu.length}개 (매주 반복, 정원 ${BUKGU_CAPACITY})`);
console.log(`남구점 ${namgu.length}개 (${namgu[0]?.date} ~ ${namgu[namgu.length - 1]?.date})\n`);

// ---------- 지금 걸려 있는 예약 확인 ----------
const { data: resv } = await sb.from("reservations").select("slot_id").neq("status", "cancelled");
const booked = new Set((resv ?? []).map((r) => r.slot_id));

const { data: old } = await sb.from("slots").select("id,branch");
const olds = old ?? [];
const removable = olds.filter((s) => !booked.has(s.id));
const kept = olds.filter((s) => booked.has(s.id));

console.log(`기존 슬롯 ${olds.length}개 → 삭제 ${removable.length}개 · 예약이 걸려 있어 유지 ${kept.length}개`);

if (!APPLY) {
  console.log("\n북구점 미리보기:");
  for (const [time, row] of BUKGU_GRID) {
    const cells = ["월", "화", "수", "목", "금"].map((d) => (row[d] ?? "").padEnd(6)).join(" ");
    console.log(`  ${time}  ${cells}`);
  }
  console.log("\n남구점 미리보기:");
  let cur = "";
  for (const s of namgu) {
    if (s.date !== cur) { cur = s.date; console.log(`  ${cur}`); }
    console.log(`    ${s.time} ${s.program} (정원 ${s.capacity})`);
  }
  console.log("\n— 미리보기입니다. 넣으려면 --apply 를 붙이세요. —");
  process.exit(0);
}

console.log("\n반영합니다...");

if (removable.length) {
  const { error } = await sb.from("slots").delete().in("id", removable.map((s) => s.id));
  if (error) { console.error("기존 슬롯 삭제 실패:", error.message); process.exit(1); }
}

const rand = () => Math.random().toString(36).slice(2, 9);
const rows = [...bukgu, ...namgu.map((s) => ({
  branch: "1호점",
  program: s.program,
  day_of_week: s.day_of_week,
  time: s.time,
  capacity: s.capacity,
  date: s.date,
}))].map((s) => ({ id: "sl_" + rand(), ...s }));

const { error } = await sb.from("slots").insert(rows);
if (error) { console.error("슬롯 등록 실패:", error.message); process.exit(1); }

console.log(`완료 — 슬롯 ${rows.length}개 (북구점 ${bukgu.length} · 남구점 ${namgu.length})`);
