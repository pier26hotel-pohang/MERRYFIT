-- =====================================================================
-- 강사 계정 · 수업 단가 · 급여 정산
-- =====================================================================
-- 강사마다 로그인 계정을 주고, 본인 수업 시수 → 시급 → 3.3% 원천징수까지
-- 자동으로 계산해서 보여주기 위한 테이블.
-- =====================================================================

create table if not exists instructors (
  id            text primary key,
  name          text not null,
  login_id      text not null unique,        -- 로그인 아이디
  password_hash text not null,               -- scrypt 해시 (평문 저장 안 함)
  password_salt text not null,
  role          text not null default 'instructor',  -- 'admin' | 'instructor'
  branch        text,
  phone         text,
  bank          text,                        -- 급여 이체용
  account       text,
  active        boolean not null default true,
  created_at    timestamptz default now()
);

-- 강사별 수업 단가. kind 는 수업 인원 구간.
--   private = 1명(프라이빗) / g2 = 2명 / g3 = 3명 / g4 = 4~5명 / g6 = 6명 이상
--   outside = 외부출강
create table if not exists instructor_rates (
  instructor_id text not null references instructors(id) on delete cascade,
  kind          text not null,
  amount        integer not null,
  primary key (instructor_id, kind)
);

-- 수업(슬롯)에 담당 강사를 연결한다. 급여는 여기서부터 집계된다.
alter table slots add column if not exists instructor_id text;
create index if not exists idx_slot_instructor on slots (instructor_id);

alter table instructors      enable row level security;
alter table instructor_rates enable row level security;

select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name in ('instructors','instructor_rates')
order by table_name, ordinal_position;
