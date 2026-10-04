// 북구점 가오픈 주간(10/12~10/18) 특별 편성
//
//   미리보기:  node --env-file=.env.local scripts/bukgu_openweek.mjs
//   실제 반영:  node --env-file=.env.local scripts/bukgu_openweek.mjs --apply
//
// 10/12(월) 가오픈 — 바레 10:30 / 14:00 / 19:30 세 타임만 연다.
// 10/13~16(화~금) — 저녁(18:30·19:30·20:30)만 수업하고,
//                   오전과 14시는 1:1 상담 자리로 바꾼다(2명까지).
//
// 매주 반복 시간표는 그대로 두고 그 주 날짜로만 덮어쓴다.
// 1회성 수업이 있는 날은 매주 반복 대신 그쪽이 뜬다(lib/store.ts slotsForCell).
// 그래서 이 주가 지나면 원래 시간표로 알아서 돌아온다.
//
// 닫는 시간은 정원 0 으로 둔다 — 화면에 "휴무"로 뜨고 예약이 막힌다.
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const BRANCH = "2호점";
const TAG = "openweek";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const rand = () => Math.random().toString(36).slice(2, 9);
const DOW_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

// 가오픈 주간 날짜
const WEEK = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"];
const dowOf = (d) => new Date(d + "T00:00:00Z").getUTCDay();

const EVENING = ["18:30", "19:30", "20:30"];
const CONSULT = ["06:30", "09:30", "10:30", "14:00"]; // 상담으로 돌릴 시간대
const TRIAL = ["10:30", "14:00", "19:30"]; // 10/12 무료체험

// 지금 돌고 있는 매주 반복 시간표를 읽어서, 그 주에 무엇을 덮을지 정한다.
const { data: weekly } = await sb
  .from("slots").select("*").eq("branch", BRANCH).is("date", null);

const plan = [];
for (const date of WEEK) {
  const dow = dowOf(date);
  const todays = (weekly ?? []).filter((s) => s.day_of_week === dow);
  if (!todays.length) continue;

  for (const s of todays) {
    if (date === "2026-10-12") {
      // 가오픈 날 — 세 타임만, 전부 바레. 나머지는 닫는다.
      plan.push(TRIAL.includes(s.time)
        ? { date, time: s.time, program: "바레", capacity: 14, why: "무료체험" }
        : { date, time: s.time, program: s.program, capacity: 0, why: "휴무" });
      continue;
    }
    if (EVENING.includes(s.time)) continue;             // 저녁은 원래대로
    if (CONSULT.includes(s.time)) {
      plan.push({ date, time: s.time, program: "상담신청", capacity: 2, why: "1:1 상담" });
      continue;
    }
    plan.push({ date, time: s.time, program: s.program, capacity: 0, why: "휴무" });
  }
}
plan.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

console.log(`가오픈 주간 덮어쓸 칸 ${plan.length}개\n`);
let cur = "";
for (const p of plan) {
  if (p.date !== cur) { cur = p.date; console.log(`  ${cur} (${DOW_LABEL[dowOf(cur)]})`); }
  const cap = p.capacity === 0 ? "   —" : `정원${String(p.capacity).padStart(2)}`;
  console.log(`    ${p.time}  ${p.program.padEnd(6)} ${cap}  ${p.why}`);
}

const kept = (weekly ?? []).filter((s) => EVENING.includes(s.time)).length;
console.log(`\n저녁 수업은 그대로 둡니다 (매주 반복 ${kept}개가 그 주에도 그대로 뜸)`);

if (!APPLY) {
  console.log("\n— 미리보기입니다. 넣으려면 --apply 를 붙이세요. —");
  process.exit(0);
}

// 이 주에 이미 깔아둔 1회성이 있으면 지우고 다시 — 몇 번 돌려도 같은 결과
const { data: old } = await sb.from("slots").select("id").eq("branch", BRANCH).in("date", WEEK);
const oldIds = (old ?? []).map((s) => s.id);
if (oldIds.length) {
  await sb.from("reservations").delete().in("slot_id", oldIds);
  await sb.from("slots").delete().in("id", oldIds);
  console.log(`\n기존 1회성 ${oldIds.length}개 정리`);
}

const rows = plan.map((p) => ({
  id: `sl_${TAG}_${rand()}`,
  branch: BRANCH,
  program: p.program,
  day_of_week: dowOf(p.date),
  time: p.time,
  capacity: p.capacity,
  date: p.date,
}));

const { error } = await sb.from("slots").insert(rows);
if (error) { console.error("등록 실패:", error.message); process.exit(1); }

const n = (w) => rows.filter((r) => r.program === w).length;
console.log(`\n완료 — ${rows.length}칸 (무료체험 바레 ${rows.filter((r) => r.capacity === 14).length} · 상담신청 ${n("상담신청")} · 휴무 ${rows.filter((r) => r.capacity === 0).length})`);
console.log(`되돌리려면: delete from slots where id like 'sl_${TAG}_%';`);
