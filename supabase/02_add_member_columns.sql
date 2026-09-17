-- =====================================================================
-- members 테이블 누락 컬럼 보강
-- =====================================================================
-- 회원가입(lib/store.ts addMember)은 birthdate / address 를 함께 저장한다.
-- 초기 스키마에 두 컬럼이 없어서 insert 가 실패했고, 오류를 확인하지 않아
-- "가입 버튼을 눌러도 아무 일도 안 일어나는" 증상으로 나타났다.
-- =====================================================================

alter table members add column if not exists birthdate date;
alter table members add column if not exists address   text;

-- 확인용
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'members'
order by ordinal_position;
