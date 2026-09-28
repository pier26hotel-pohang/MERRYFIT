-- 월 정기 수강권
--
-- monthly      매달 횟수가 다시 채워지는 정기권인가
-- period_start 이번 주기가 시작된 날. 이 날짜에 매달 갱신된다.
-- expires_at   정기권 종료일. 이 날까지는 쓸 수 있고, 지나면 갱신도 멈춘다.
--              null 이면 해지할 때까지 계속 갱신된다.
alter table public.passes
  add column if not exists monthly boolean not null default false;

alter table public.passes
  add column if not exists period_start date;

alter table public.passes
  add column if not exists expires_at date;

-- 무제한권은 횟수를 세지 않는다. 기존 데이터와 섞이지 않게 표시만 해둔다.
comment on column public.passes.monthly is '매달 remaining 이 total 로 리셋되는 정기권';
