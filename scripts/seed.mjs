// Supabase 초기 데이터 시드 (한 번 실행)
// 실행: node --env-file=.env.local scripts/seed.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("환경변수 없음");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

function programCapacity(program, branch) {
  if (branch === "2호점") return 12;
  if (program === "기구 필라테스") return 4;
  if (program === "단체수업") return 12;
  return 6;
}

const members = [
  { id: "m_jieun", name: "김지은", phone: "010-1111-2222", branch: "1호점", points: 15000, memo: "거북목 주의 · 오전 수업 선호" },
  { id: "m_seoyeon", name: "박서연", phone: "010-3333-4444", branch: "1호점", points: 0, memo: "" },
  { id: "m_minji", name: "이민지", phone: "010-5555-6666", branch: "1호점", points: 40000, memo: "무릎 통증 이력 · 저강도로 시작" },
];
const passes = [
  { id: "p_1", member_id: "m_jieun", type: "자유수강권 20회", total: 20, remaining: 12, scope: "both" },
  { id: "p_2", member_id: "m_seoyeon", type: "자유수강권 10회", total: 10, remaining: 3, scope: "1호점" },
  { id: "p_3", member_id: "m_minji", type: "자유수강권 50회", total: 50, remaining: 41, scope: "both" },
];

const slots = [];
let n = 0;
const add = (dow, time, program) =>
  slots.push({
    id: "sl_" + ++n,
    branch: "1호점",
    program,
    day_of_week: dow,
    time,
    capacity: programCapacity(program, "1호점"),
    date: null,
  });
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
add(6, "10:00", "기구 필라테스");
add(6, "11:00", "바레");
add(0, "10:00", "기구 필라테스");
add(0, "11:00", "바레");

async function main() {
  // 기존 데이터 정리 (FK 순서)
  await db.from("reservations").delete().neq("id", "");
  await db.from("passes").delete().neq("id", "");
  await db.from("slots").delete().neq("id", "");
  await db.from("members").delete().neq("id", "");

  let e;
  ({ error: e } = await db.from("members").insert(members));
  if (e) throw e;
  ({ error: e } = await db.from("passes").insert(passes));
  if (e) throw e;
  ({ error: e } = await db.from("slots").insert(slots));
  if (e) throw e;

  const { count } = await db.from("slots").select("*", { count: "exact", head: true });
  console.log("시드 완료: 회원", members.length, "수강권", passes.length, "슬롯", slots.length, "(DB 슬롯 수:", count, ")");
}
main().catch((err) => {
  console.error("시드 실패:", err.message || err);
  process.exit(1);
});
