-- 상담 설문에 나이대 항목 추가.
-- 기존 신청 건은 값이 없으므로 NULL 을 허용한다 (관리자 화면에서 숨겨진다).
alter table public.consultations
  add column if not exists age_group text;
