// 이관 회원 이름에서 옛 시스템 꼬리표를 떼어낸다
//   미리보기: node --env-file=.env.local scripts/clean_names.mjs
//   반영:     node --env-file=.env.local scripts/clean_names.mjs --apply
//
// "백옥희 아이코젠" 같은 표기는 프로그램명이지 이름이 아니다. 출석부와
// 상담 화면에 그대로 뜨면 보기 안 좋고, 회원 본인도 어색해한다.
// 동명이인 구분용 접미(박효진B)는 지우면 두 사람이 섞이므로 남긴다.
import { createClient } from "@supabase/supabase-js";
const APPLY = process.argv.includes("--apply");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TAG = /\s*(아이코젠|산모님|선생님|원장님|강사님|회원님)$/;
const { data } = await sb.from("members").select("id,name,phone,memo").eq("imported_from","namgu-20261001");

const plan = [];
for (const m of data) {
  const clean = m.name.replace(/\s+/g, " ").trim().replace(TAG, "").trim();
  if (clean && clean !== m.name) plan.push({ m, clean, tag: m.name.slice(clean.length).trim() });
}
console.log(`꼬리표가 붙은 이름 ${plan.length}건\n`);
for (const p of plan.slice(0, 30)) console.log(`   ${p.m.name.padEnd(18)} → ${p.clean}   (뗀 표시: ${p.tag})`);
if (plan.length > 30) console.log(`   ... 외 ${plan.length-30}건`);

const dupAfter = {};
for (const p of plan) dupAfter[p.clean] = (dupAfter[p.clean] ?? 0) + 1;
const collide = Object.entries(dupAfter).filter(([, n]) => n > 1);
if (collide.length) console.log(`\n주의 — 떼고 나면 같은 이름이 되는 경우: ${collide.map(([n,c])=>`${n}×${c}`).join(", ")}`);

console.log("\n동명이인 접미(A·B·C)는 그대로 둡니다 — 떼면 두 사람이 섞입니다.");

if (!APPLY) { console.log("\n— 미리보기입니다. --apply 를 붙이세요. —"); process.exit(0); }

for (const p of plan) {
  // 뗀 표시는 메모에 남겨 둔다. 나중에 "아이코젠 회원이었나" 를 물을 수 있다.
  const memo = [p.m.memo, `이관 표기: ${p.tag}`].filter(Boolean).join(" · ");
  await sb.from("members").update({ name: p.clean, memo }).eq("id", p.m.id);
}
console.log(`\n완료 — ${plan.length}건 정리`);
