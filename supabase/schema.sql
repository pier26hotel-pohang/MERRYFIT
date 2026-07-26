-- 메리핏 앱 데이터베이스 스키마 (Supabase SQL 편집기에 붙여넣고 실행)

-- 회원
create table if not exists members (
  id text primary key,
  auth_user_id uuid,                 -- 카카오 로그인 사용자 연결(선택)
  name text not null,
  phone text,
  branch text not null default '1호점',
  points integer not null default 0,
  memo text default '',
  created_at timestamptz default now()
);

-- 수강권 (scope: both=공용 / 1호점 / 2호점)
create table if not exists passes (
  id text primary key,
  member_id text references members(id) on delete cascade,
  type text not null,
  total integer not null,
  remaining integer not null,
  scope text not null default 'both'
);

-- 시간표 슬롯 (date 가 없으면 '매주 반복', 있으면 그 날짜 1회성)
create table if not exists slots (
  id text primary key,
  branch text not null,
  program text not null,
  day_of_week integer not null,      -- 0=일 .. 6=토
  "time" text not null,              -- HH:mm
  capacity integer not null,
  date date
);

-- 예약 (status: booked / attended / cancelled)
create table if not exists reservations (
  id text primary key,
  slot_id text references slots(id) on delete cascade,
  member_id text references members(id) on delete cascade,
  date date not null,
  status text not null default 'booked',
  pass_id text
);

-- 조회 성능용 인덱스
create index if not exists idx_res_slot_date on reservations (slot_id, date);
create index if not exists idx_res_member on reservations (member_id);
create index if not exists idx_pass_member on passes (member_id);
create index if not exists idx_slot_branch on slots (branch);

-- ⚠️ 보안(RLS: 행 수준 접근제어)은 로그인 붙일 때 함께 설정합니다.
