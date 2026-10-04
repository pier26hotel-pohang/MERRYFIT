// 남구점 시간표를 매주 반복으로 바꾸고 담당 강사를 붙인다
//
//   미리보기:  node --env-file=.env.local scripts/namgu_weekly.mjs
//   실제 반영:  node --env-file=.env.local scripts/namgu_weekly.mjs --apply
//
// 왜 반복으로 바꾸나
//   날짜별 1회성으로 넣으면 10/10 이 지나는 순간 시간표가 빈다. 그리고
//   관리자 화면의 강사 배정은 "매주 반복" 수업만 대상으로 한다(app/admin/page.tsx).
//   그래서 날짜별로 두면 담당 강사를 아예 붙일 수가 없고, 급여도 0으로 잡힌다.
//
// 특정 주만 다르면 그 날짜로 1회성 수업을 따로 추가하면 된다 — 1회성이 있으면
// 그 날은 매주 반복 대신 1회성이 뜬다(lib/store.ts slotsForCell).
import fs from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
const BRANCH = "1호점";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const rand = () => Math.random().toString(36).slice(2, 9);
const DOW_LABEL = ["일", "월", "화", "수", "목", "금", "토"];
const RATES = { private: 35000, g2: 25000, g3: 30000, g4: 35000, g6: 37500, outside: 40000 };

const rows = JSON.parse(fs.readFileSync(path.join(HERE, "namgu_schedule.json"), "utf8"));

// 같은 요일·시각·종목·강사면 같은 수업이다. 주 1회분만 남긴다.
const seen = new Map();
for (const r of rows) {
  const key = `${r.day_of_week}|${r.time}|${r.program}|${r.instructor}`;
  if (!seen.has(key)) seen.set(key, r);
}
const weekly = [...seen.values()].sort(
  (a, b) => (a.day_of_week || 7) - (b.day_of_week || 7) || a.time.localeCompare(b.time)
);

console.log(`엑셀 ${rows.length}개 → 매주 반복 ${weekly.length}개\n`);

// ---------- 강사 맞추기 ----------
const { data: haveRows } = await sb.from("instructors").select("id,name");
const have = new Map((haveRows ?? []).map((i) => [i.name, i.id]));
const wanted = [...new Set(weekly.map((r) => r.instructor).filter(Boolean))];
const missing = wanted.filter((n) => !have.has(n));

console.log("강사");
for (const n of wanted) console.log(`  ${n.padEnd(5)} ${have.has(n) ? "계정 있음" : "계정 없음 → 새로 만듦"}`);

if (!APPLY) {
  console.log("\n반복 시간표 미리보기");
  let cur = -1;
  for (const s of weekly) {
    if (s.day_of_week !== cur) { cur = s.day_of_week; console.log(`  ${DOW_LABEL[cur]}요일`); }
    console.log(`    ${s.time}  ${s.program.padEnd(6)} ${String(s.instructor).padEnd(5)} 정원${s.capacity}`);
  }
  console.log("\n— 미리보기입니다. 넣으려면 --apply 를 붙이세요. —");
  process.exit(0);
}

console.log("\n반영합니다...");

// 계정 없는 강사는 기록만 먼저 만든다. 비밀번호는 아무도 모르는 값으로 두고,
// 관리자 > 강사 관리에서 본인 것으로 바꿔주면 그때부터 로그인된다.
for (const name of missing) {
  const salt = randomBytes(16).toString("hex");
  const id = "in_" + rand();
  const { error } = await sb.from("instructors").insert({
    id, name,
    login_id: "pending_" + rand(),
    password_hash: scryptSync(randomBytes(32).toString("hex"), salt, 32).toString("hex"),
    password_salt: salt,
    role: "instructor",
    branch: BRANCH,
    active: true,
  });
  if (error) { console.error(`  ${name} 등록 실패: ${error.message}`); continue; }
  await sb.from("instructor_rates").insert(
    Object.entries(RATES).map(([kind, amount]) => ({ instructor_id: id, kind, amount }))
  );
  have.set(name, id);
  console.log(`  강사 생성 ${name} (로그인 정보는 아직 없음)`);
}

// ---------- 기존 남구점 수업 정리 ----------
const { data: old } = await sb.from("slots").select("id").eq("branch", BRANCH);
const oldIds = (old ?? []).map((s) => s.id);
if (oldIds.length) {
  // 테스트로 걸어둔 예약이 남아 있으면 삭제가 막힌다. 같이 지운다.
  await sb.from("reservations").delete().in("slot_id", oldIds);
  const { error } = await sb.from("slots").delete().in("id", oldIds);
  if (error) { console.error("기존 수업 삭제 실패:", error.message); process.exit(1); }
  console.log(`  기존 남구점 수업 ${oldIds.length}개 삭제`);
}

// ---------- 매주 반복으로 다시 넣기 ----------
const insert = weekly.map((s) => ({
  id: "sl_" + rand(),
  branch: BRANCH,
  program: s.program,
  day_of_week: s.day_of_week,
  time: s.time,
  capacity: s.capacity,
  date: null,
  instructor_id: have.get(s.instructor) ?? null,
}));

const { error } = await sb.from("slots").insert(insert);
if (error) { console.error("수업 등록 실패:", error.message); process.exit(1); }

const assigned = insert.filter((s) => s.instructor_id).length;
console.log(`\n완료 — 남구점 매주 반복 ${insert.length}개 · 강사 배정 ${assigned}개`);
