-- 회원별 결제 이력
--
-- 수강권(passes)은 "지금 쓸 수 있는 것"만 들고 있다.
-- 언제 얼마를 냈고 언제부터 언제까지인지는 여기에 쌓아서, 나중에 지워도
-- 기록이 남고 매출 집계도 여기서 뽑을 수 있게 한다.
create table if not exists public.payments (
  id          text primary key,
  member_id   text not null,
  pass_id     text,                       -- 이 결제로 발급된 수강권 (연결용, 없을 수 있음)
  product     text not null,              -- 상품명 (예: 루틴패스 Basic)
  amount      integer not null default 0, -- 결제 금액(원)
  paid_at     date not null,              -- 결제일
  starts_at   date,                       -- 이용 시작일
  ends_at     date,                       -- 이용 종료일 (비우면 계속)
  method      text,                       -- 카드 · 계좌이체 · 현금 등
  memo        text,
  created_at  timestamptz not null default now()
);

alter table public.payments enable row level security;

create index if not exists payments_member_idx on public.payments (member_id, paid_at desc);
