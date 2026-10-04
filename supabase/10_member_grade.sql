-- =====================================================================
-- 회원 등급(메리 컬러) — 이전 센터 출석 승계
-- =====================================================================
-- 남구점을 스튜디오메이트로 운영하던 시절의 출석 기록을 앱으로 옮긴다.
-- 오래 다닌 회원이 앱에서 0회부터 다시 시작하면 등급이 화이트로 떨어진다.
--
-- 출석 자체(reservations)는 옮기지 않는다. 예약 이력까지 만들어내면
-- 없던 수업이 생기고 통계가 틀어진다. 등급 계산에 필요한 "횟수"만 받는다.
--
--   등급 산정용 출석 = prior_visits + 앱에서 실제로 출석한 횟수
--
-- 적립금은 옮기지 않는다. 과거 출석에 5,000원씩 소급하면 한 명에게
-- 180만원이 넘게 나간다. 등급만 이어주고 적립금은 0부터 시작한다.
-- =====================================================================

alter table public.members
  add column if not exists prior_visits integer not null default 0;

comment on column public.members.prior_visits is
  '앱 도입 전 다른 시스템에서 쌓은 누적 이용 횟수. 등급 계산에만 쓰고 적립금과는 무관.';

-- 어디서 넘어온 기록인지 — 나중에 되돌리거나 재집계할 때 필요하다.
alter table public.members
  add column if not exists imported_from text;

comment on column public.members.imported_from is
  '이관 출처. 예: namgu-20261001. 직접 가입한 회원은 null.';

create index if not exists idx_members_imported on public.members (imported_from);

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'members'
order by ordinal_position;
