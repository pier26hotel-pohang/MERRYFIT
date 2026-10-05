// 북구점 담당 강사 배정
//   미리보기:  node --env-file=.env.local scripts/assign_bukgu.mjs
//   반영:      node --env-file=.env.local scripts/assign_bukgu.mjs --apply
import { createClient } from "@supabase/supabase-js";
const APPLY = process.argv.includes("--apply");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const DOW = ["일","월","화","수","목","금","토"];

// 월 1 · 화 2 · 수 3 · 목 4 · 금 5
const MORNING = ["06:30","09:30","10:30"];
const EVENING = ["18:30","19:30","20:30"];

function who(dow, time) {
  if (dow === 1) return "김슬기";                        // 월요일 전부
  if (dow === 3) return "김보경";                        // 수요일 전부
  if (time === "06:30" && (dow === 2 || dow === 4)) return "김윤화";   // 화·목 새벽 요가
  if (EVENING.includes(time) && [2,4,5].includes(dow)) return "윤가은"; // 화·목·금 저녁
  if (MORNING.includes(time) && (dow === 2 || dow === 4)) return "김슬기"; // 화·목 오전
  if (MORNING.includes(time) && dow === 5) return "김보경";            // 금 오전
  return null;                                           // 화·목·금 14:00 — 미정
}

const { data: ins } = await sb.from("instructors").select("id,name");
const byName = new Map(ins.map(i => [i.name, i.id]));
const { data: slots } = await sb.from("slots").select("*").eq("branch","2호점").order("day_of_week").order("time");

const plan = [], unknown = [];
for (const s of slots) {
  if (s.capacity === 0) continue;                        // 휴무 칸은 건너뛴다
  const name = who(s.day_of_week, s.time);
  if (!name) { unknown.push(s); continue; }
  const id = byName.get(name);
  if (!id) { console.error(`강사 "${name}" 없음`); process.exit(1); }
  plan.push({ slot: s, name, id });
}

const cnt = {};
for (const p of plan) cnt[p.name] = (cnt[p.name] ?? 0) + 1;
console.log("배정 계획");
for (const [n, c] of Object.entries(cnt).sort((a,b)=>b[1]-a[1])) console.log(`  ${n}  ${c}개`);
console.log(`\n미정 ${unknown.length}개`);
for (const s of unknown) console.log(`  ${DOW[s.day_of_week]} ${s.time} ${s.program}${s.date ? " ("+s.date+")" : ""}`);

if (!APPLY) {
  console.log("\n요일별");
  for (const d of [1,2,3,4,5]) {
    const rows = plan.filter(p => p.slot.day_of_week === d && !p.slot.date);
    if (!rows.length) continue;
    console.log(`  ${DOW[d]}요일`);
    for (const r of rows) console.log(`     ${r.slot.time} ${r.slot.program.padEnd(6)} ${r.name}`);
  }
  console.log("\n— 미리보기입니다. --apply 를 붙이세요. —");
  process.exit(0);
}

for (const p of plan) await sb.from("slots").update({ instructor_id: p.id }).eq("id", p.slot.id);
const { count } = await sb.from("slots").select("*",{count:"exact",head:true}).is("instructor_id", null);
console.log(`\n완료 — ${plan.length}개 배정 · 전체 미배정 ${count}개 남음`);
