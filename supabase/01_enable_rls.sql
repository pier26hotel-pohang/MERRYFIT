-- =====================================================================
-- 메리핏 앱 · 행 수준 보안(RLS) 활성화
-- =====================================================================
-- 앱의 모든 데이터 접근은 서버에서 service_role 키로 이루어진다(lib/store.ts).
-- service_role 은 RLS 를 우회하므로, 정책을 하나도 두지 않고 RLS 만 켜면
--   · 앱 동작: 그대로
--   · 브라우저에 공개된 anon 키로의 직접 접근: 전면 차단
-- 이 된다. 회원 이름·연락처가 들어가는 테이블이므로 반드시 켜둔다.
-- =====================================================================

alter table members      enable row level security;
alter table passes       enable row level security;
alter table slots        enable row level security;
alter table reservations enable row level security;

-- 확인용
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
