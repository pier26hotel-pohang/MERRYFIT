-- =====================================================================
-- 북구점 가오픈(10/12) 사전 신청
-- =====================================================================
-- 문의만 하고 기다리던 분들에게 문자로 뿌릴 설문에서 받는 항목.
--
--  trial_slot  10/12 무료체험 중 어느 타임에 올지
--  visit_date  1:1 상담하러 오고 싶은 날
--  visit_time  그날 몇 시쯤
--  gift_optin  기념품 룰렛 참여 여부
--
-- 날짜를 date 가 아니라 text 로 두는 이유: "12일 오전", "주말이면 아무 때나"
-- 처럼 적어 내는 분이 반드시 나온다. 정규화는 센터에서 전화로 확인하면서 한다.
-- =====================================================================

alter table public.consultations add column if not exists trial_slot text;
alter table public.consultations add column if not exists visit_date text;
alter table public.consultations add column if not exists visit_time text;
alter table public.consultations add column if not exists gift_optin boolean not null default false;

comment on column public.consultations.trial_slot is '10/12 가오픈 무료체험 희망 타임';
comment on column public.consultations.visit_date is '1:1 상담 희망 날짜 (자유 입력)';
comment on column public.consultations.visit_time is '1:1 상담 희망 시간대';

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'consultations'
order by ordinal_position;
