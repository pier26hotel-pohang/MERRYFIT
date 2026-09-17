-- =====================================================================
-- 메리핏 앱 · Supabase 초기 세팅 (한 번에 실행)
-- 사용법: Supabase 대시보드 → SQL Editor → 전체 붙여넣기 → Run
-- =====================================================================

-- [1] 테이블 생성
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
  birthdate date,                    -- 회원가입 폼에서 입력
  address text,                      -- 회원가입 폼에서 입력
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


-- =====================================================================
-- [2] 2호점 시간표 시드
-- =====================================================================
-- 메리핏 2호점 시간표 시드
-- 09:30 / 10:30 / 17:30 / 18:30 / 19:30 / 20:30  ·  월~토  ·  전 타임 '바레'  ·  정원 12
-- 프로그램/시간/정원은 앱의 /admin 시간표 편집에서 언제든 수정 가능

delete from slots where branch = '2호점' and date is null;

insert into slots (id, branch, program, day_of_week, "time", capacity) values
  ('sl_gwivz9r', '2호점', '바레', 1, '09:30', 12),
  ('sl_de1f8bu', '2호점', '바레', 1, '10:30', 12),
  ('sl_byac5o8', '2호점', '바레', 1, '17:30', 12),
  ('sl_br98kiu', '2호점', '바레', 1, '18:30', 12),
  ('sl_4ggfaan', '2호점', '바레', 1, '19:30', 12),
  ('sl_qjf5xqa', '2호점', '바레', 1, '20:30', 12),
  ('sl_116ogef', '2호점', '바레', 2, '09:30', 12),
  ('sl_olc2ol9', '2호점', '바레', 2, '10:30', 12),
  ('sl_40l9d8t', '2호점', '바레', 2, '17:30', 12),
  ('sl_ll2cmhf', '2호점', '바레', 2, '18:30', 12),
  ('sl_x88fxel', '2호점', '바레', 2, '19:30', 12),
  ('sl_0jt9z5m', '2호점', '바레', 2, '20:30', 12),
  ('sl_mf9vgmt', '2호점', '바레', 3, '09:30', 12),
  ('sl_7tomsyz', '2호점', '바레', 3, '10:30', 12),
  ('sl_3qfy9b2', '2호점', '바레', 3, '17:30', 12),
  ('sl_ab80vuc', '2호점', '바레', 3, '18:30', 12),
  ('sl_exypody', '2호점', '바레', 3, '19:30', 12),
  ('sl_lyp8jqb', '2호점', '바레', 3, '20:30', 12),
  ('sl_u8yhknt', '2호점', '바레', 4, '09:30', 12),
  ('sl_7mtll5e', '2호점', '바레', 4, '10:30', 12),
  ('sl_phzpgg9', '2호점', '바레', 4, '17:30', 12),
  ('sl_wcckmco', '2호점', '바레', 4, '18:30', 12),
  ('sl_fge7ea0', '2호점', '바레', 4, '19:30', 12),
  ('sl_5zlfutl', '2호점', '바레', 4, '20:30', 12),
  ('sl_455i87q', '2호점', '바레', 5, '09:30', 12),
  ('sl_cbzchqa', '2호점', '바레', 5, '10:30', 12),
  ('sl_xsupgu6', '2호점', '바레', 5, '17:30', 12),
  ('sl_rtfw1ff', '2호점', '바레', 5, '18:30', 12),
  ('sl_w87fm2l', '2호점', '바레', 5, '19:30', 12),
  ('sl_pg2w3vw', '2호점', '바레', 5, '20:30', 12),
  ('sl_m4hw8bi', '2호점', '바레', 6, '09:30', 12),
  ('sl_25w3v72', '2호점', '바레', 6, '10:30', 12),
  ('sl_f48q3cm', '2호점', '바레', 6, '17:30', 12),
  ('sl_8rhoaf4', '2호점', '바레', 6, '18:30', 12),
  ('sl_9m2lkdf', '2호점', '바레', 6, '19:30', 12),
  ('sl_2tbyoli', '2호점', '바레', 6, '20:30', 12);

-- 확인용
select day_of_week, "time", program, capacity from slots where branch='2호점' order by day_of_week, "time";

