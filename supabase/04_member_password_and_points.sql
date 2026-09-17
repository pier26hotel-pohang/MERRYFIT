-- =====================================================================
-- 회원 비밀번호 로그인 + 적립금 전환 신청
-- =====================================================================
-- 1) 연락처만으로 로그인되던 것을 연락처 + 비밀번호로 바꾼다.
--    (전화번호만 알면 남의 계정에 들어갈 수 있던 문제)
-- 2) 앱 적립금과 카페24 쇼핑몰 적립금이 별개라, 회원이 전환을 신청하고
--    관리자가 카페24에서 지급한 뒤 완료 처리하는 흐름을 만든다.
-- =====================================================================

alter table members add column if not exists password_hash text;
alter table members add column if not exists password_salt text;

-- 적립금 전환 신청
--   pending = 신청됨 / done = 카페24 지급 완료(앱 포인트 차감됨) / rejected = 반려
create table if not exists point_requests (
  id         text primary key,
  member_id  text not null references members(id) on delete cascade,
  points     integer not null,
  status     text not null default 'pending',
  memo       text,
  created_at timestamptz default now(),
  done_at    timestamptz
);

create index if not exists idx_point_req_status on point_requests (status, created_at);
create index if not exists idx_point_req_member on point_requests (member_id);

alter table point_requests enable row level security;

select column_name from information_schema.columns
where table_schema='public' and table_name='members' order by ordinal_position;
