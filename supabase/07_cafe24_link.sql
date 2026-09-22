-- 카페24 쇼핑몰 적립금 자동 연동용
--
-- 1) members.cafe24_id
--    앱 회원과 쇼핑몰 회원을 잇는 유일한 연결고리.
--    카페24 적립금 API는 "쇼핑몰 회원아이디"로만 지급할 수 있어서,
--    연락처나 이름으로는 자동 매칭이 불가능하다.
alter table public.members
  add column if not exists cafe24_id text;

-- 2) 적립금이 실제로 쇼핑몰에 올라갔는지 기록.
--    실패하면 재시도해야 하고, 두 번 지급되는 일은 없어야 한다.
alter table public.members
  add column if not exists points_synced integer not null default 0;

-- 3) 카페24 OAuth 토큰 보관.
--    access_token 은 2시간, refresh_token 은 2주마다 갱신되므로
--    코드가 아니라 DB에 두고 계속 덮어쓴다.
create table if not exists public.integrations (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.integrations enable row level security;

-- 지급 이력 — 중복 지급 방지와 대사(對査)용
create table if not exists public.point_syncs (
  id          text primary key,
  member_id   text not null,
  amount      integer not null,
  reason      text,
  status      text not null default 'ok',   -- ok | failed
  detail      text,
  created_at  timestamptz not null default now()
);

alter table public.point_syncs enable row level security;

create index if not exists point_syncs_member_idx on public.point_syncs (member_id);
