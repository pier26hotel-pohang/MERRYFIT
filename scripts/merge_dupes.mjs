// 이관하면서 생긴 중복 회원 합치기
//
//   미리보기:  node --env-file=.env.local scripts/merge_dupes.mjs
//   실제 반영:  node --env-file=.env.local scripts/merge_dupes.mjs --apply
//
// 왜 생겼나
//   앱으로 가입한 회원은 연락처가 "01012345678" 로, 이관분은 "010-1234-5678" 로
//   저장됐다. import_namgu.mjs 가 두 값을 문자열 그대로 비교해서 같은 사람을
//   못 알아보고 레코드를 하나 더 만들었다. 앱의 getMemberByPhone 은 숫자만
//   뽑아 비교하므로 멀쩡하다 — 이관 스크립트만의 문제였다.
//
// 어떻게 합치나
//   본인이 쓰고 있는 계정(가입완료)을 남기고, 이관분의 누적 이용·수강권·예약을
//   그쪽으로 옮긴 뒤 이관 레코드를 지운다. 적립금은 건드리지 않는다.
//
// 이름이 다르면 손대지 않는다. 번호만 같고 사람이 다를 수 있다.
// 다만 "회원" 처럼 이름 자리에 기본값이 들어간 계정은 비교 대상에서 뺀다.
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const digits = (p) => String(p ?? "").replace(/\D/g, "");
const PLACEHOLDER = /^(회원|고객|무명)$/;
// 표기 차이만 무시한다. "황은정" 과 "황은정(강사님)" 은 같은 사람으로 본다.
const nameKey = (n) => String(n ?? "").replace(/\s+/g, "").replace(/\(.*?\)/g, "");

const { data: all } = await sb
  .from("members")
  .select("id,name,phone,branch,points,prior_visits,imported_from,password_hash,auth_user_id");

const groups = new Map();
for (const m of all) {
  const k = digits(m.phone);
  if (!k) continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(m);
}

const merges = [];
const skips = [];

for (const [phone, list] of groups) {
  if (list.length < 2) continue;
  const live = list.find((m) => m.password_hash || m.auth_user_id);
  const stub = list.find((m) => m.imported_from && !m.password_hash && !m.auth_user_id);
  if (!live || !stub || live.id === stub.id) {
    skips.push({ phone, why: "합칠 짝을 못 찾음", list });
    continue;
  }
  const a = nameKey(live.name);
  const b = nameKey(stub.name);
  const samePerson = a === b || PLACEHOLDER.test(live.name);
  if (!samePerson) {
    skips.push({ phone, why: `이름이 다름 (${live.name} / ${stub.name})`, list });
    continue;
  }
  merges.push({ phone, live, stub });
}

console.log(`중복 ${merges.length + skips.length}쌍 — 합칠 것 ${merges.length} · 손대지 않을 것 ${skips.length}\n`);

for (const { phone, live, stub } of merges) {
  console.log(`${phone}`);
  console.log(`  남길 계정 ${live.id} ${live.name} (${live.branch}) ${live.points}P`);
  console.log(`  합칠 이관 ${stub.id} ${stub.name} 누적 ${stub.prior_visits ?? 0}회`);
  if (PLACEHOLDER.test(live.name)) console.log(`  → 이름을 "${stub.name}" 으로 채움`);
}
if (skips.length) {
  console.log("\n손대지 않음 — 직접 확인 필요");
  for (const s of skips) {
    console.log(`  ${s.phone}  ${s.why}`);
    for (const m of s.list) console.log(`     ${m.id} ${m.name} ${m.imported_from ? "이관" : "직접"} 누적 ${m.prior_visits ?? 0}회`);
  }
}

if (!APPLY) {
  console.log("\n— 미리보기입니다. 합치려면 --apply 를 붙이세요. —");
  process.exit(0);
}

console.log("\n합칩니다...");
for (const { live, stub } of merges) {
  await sb.from("passes").update({ member_id: live.id }).eq("member_id", stub.id);
  await sb.from("reservations").update({ member_id: stub.id === live.id ? stub.id : live.id }).eq("member_id", stub.id);

  const patch = {
    // 누적 이용은 큰 쪽을 남긴다 — 앱에서 쌓은 분이 이미 있을 수 있다.
    prior_visits: Math.max(live.prior_visits ?? 0, stub.prior_visits ?? 0),
    imported_from: stub.imported_from,
  };
  if (PLACEHOLDER.test(live.name)) patch.name = stub.name;

  const { error } = await sb.from("members").update(patch).eq("id", live.id);
  if (error) { console.error(`  ${live.name} 갱신 실패: ${error.message}`); continue; }

  const { error: dErr } = await sb.from("members").delete().eq("id", stub.id);
  if (dErr) { console.error(`  ${stub.name} 정리 실패: ${dErr.message}`); continue; }
  console.log(`  ${patch.name ?? live.name} — 누적 ${patch.prior_visits}회 이어붙임`);
}

const { count } = await sb.from("members").select("*", { count: "exact", head: true });
console.log(`\n완료 — 회원 ${count}명`);
