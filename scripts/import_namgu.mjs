// 남구점 기존 회원 이관 (스튜디오메이트 → 앱)
//
//   실행(미리보기):  node --env-file=.env.local scripts/import_namgu.mjs
//   실행(실제 반영):  node --env-file=.env.local scripts/import_namgu.mjs --apply
//
// 무엇을 옮기나
//   - 이름 · 연락처 · 누적 출석(등급용) · 현재 살아있는 수강권
// 무엇을 안 옮기나
//   - 적립금: 과거 출석에 5,000원씩 소급하면 한 명에게 180만원이 넘는다. 0부터 시작.
//   - 예약 이력: 없던 수업이 생기고 통계가 틀어진다. 횟수만 받는다.
//
// 계정은 만들지 않는다. 비밀번호도 카카오 연결도 없는 "가입 대기" 상태로 넣어두면,
// 본인이 직접 가입할 때 lib/store.ts 의 findClaimable / claimMember 가 이어받는다.
// 이어받기는 연락처와 이름이 둘 다 맞아야 한다.
//
// 몇 번을 돌려도 결과가 같다(멱등). imported_from 으로 이관분을 구분한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, "namgu_members.json");
const TAG = "namgu-20261001"; // 원본 추출일
const BRANCH = "1호점"; // 남구점
const APPLY = process.argv.includes("--apply");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("환경변수가 없습니다. --env-file=.env.local 을 붙여서 실행하세요.");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const rows = JSON.parse(fs.readFileSync(SRC, "utf8"));
console.log(`원본 ${rows.length}명\n`);

// ---------- 이미 들어있는 것 읽기 ----------
const { data: existing, error: readErr } = await sb
  .from("members")
  .select("id,name,phone,prior_visits,imported_from,password_hash,auth_user_id");
if (readErr) {
  if (/prior_visits|imported_from/.test(readErr.message)) {
    console.error();
    console.error("먼저 Supabase SQL 편집기에서 supabase/10_member_grade.sql 을 실행하세요.");
    console.error("컬럼 추가는 이 스크립트로 못 합니다 (DB 비밀번호가 필요).");
    console.error();
    process.exit(2);
  }
  console.error("회원 조회 실패:", readErr.message);
  process.exit(1);
}
const byPhone = new Map(
  existing.filter((m) => m.phone).map((m) => [String(m.phone).trim(), m])
);
console.log(`현재 DB 회원 ${existing.length}명 (이관분 ${existing.filter((m) => m.imported_from).length}명)\n`);

// ---------- 분류 ----------
const toInsert = [];
const toUpdate = [];
const skipped = [];

for (const r of rows) {
  const hit = byPhone.get(r.phone);
  if (!hit) {
    toInsert.push(r);
    continue;
  }
  // 본인이 이미 가입을 마쳤으면 이름·연락처는 건드리지 않는다.
  // 등급 승계분만 아직 안 들어갔으면 채워준다.
  const claimed = Boolean(hit.password_hash || hit.auth_user_id);
  if ((hit.prior_visits ?? 0) !== r.prior_visits) {
    toUpdate.push({ id: hit.id, name: hit.name, from: hit.prior_visits ?? 0, to: r.prior_visits, claimed });
  } else {
    skipped.push(r);
  }
}

console.log(`신규 등록   ${toInsert.length}명`);
console.log(`출석 보정   ${toUpdate.length}명`);
console.log(`변경 없음   ${skipped.length}명`);

const passCount = toInsert.reduce((n, r) => n + r.passes.length, 0);
console.log(`수강권      ${passCount}건\n`);

const dist = {};
for (const r of rows) dist[r.grade] = (dist[r.grade] ?? 0) + 1;
console.log("등급 분포:");
for (const [g, n] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${g.padEnd(12)} ${String(n).padStart(4)}명`);
}

if (!APPLY) {
  console.log("\n— 미리보기입니다. 실제로 넣으려면 --apply 를 붙이세요. —");
  process.exit(0);
}

// ---------- 반영 ----------
console.log("\n반영합니다...");

const rand = () => Math.random().toString(36).slice(2, 9);
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

let inserted = 0;
let passes = 0;

for (const group of chunk(toInsert, 200)) {
  const memberRows = [];
  const passRows = [];

  for (const r of group) {
    const id = "m_" + rand();
    memberRows.push({
      id,
      name: r.name,
      phone: r.phone,
      branch: BRANCH,
      points: 0, // 적립금은 승계하지 않는다
      memo: r.memo ?? "",
      prior_visits: r.prior_visits,
      imported_from: TAG,
      password_hash: null, // 본인이 가입할 때 채워진다 = "가입 대기"
      password_salt: null,
      auth_user_id: null,
    });
    for (const p of r.passes) {
      passRows.push({
        id: "p_" + rand(),
        member_id: id,
        type: p.type,
        total: p.total,
        remaining: p.remaining,
        scope: BRANCH, // 남구점에서 산 수강권
        monthly: p.monthly,
        period_start: p.period_start ?? null,
        expires_at: p.expires_at ?? null,
      });
    }
  }

  const { error: mErr } = await sb.from("members").insert(memberRows);
  if (mErr) {
    console.error("회원 등록 실패:", mErr.message);
    process.exit(1);
  }
  inserted += memberRows.length;

  if (passRows.length) {
    const { error: pErr } = await sb.from("passes").insert(passRows);
    if (pErr) {
      console.error("수강권 등록 실패:", pErr.message);
      process.exit(1);
    }
    passes += passRows.length;
  }
  process.stdout.write(`  ${inserted}/${toInsert.length}\r`);
}

for (const u of toUpdate) {
  const { error } = await sb.from("members").update({ prior_visits: u.to }).eq("id", u.id);
  if (error) console.error(`  ${u.name} 보정 실패: ${error.message}`);
}

console.log(`\n\n완료 — 회원 ${inserted}명 · 수강권 ${passes}건 · 출석 보정 ${toUpdate.length}명`);
console.log(`되돌리려면: delete from members where imported_from = '${TAG}';`);
