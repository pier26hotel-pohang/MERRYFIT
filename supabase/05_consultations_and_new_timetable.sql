-- =====================================================================
-- 북구점 오픈 페이지 · 상담 신청 설문 + 새 시간표
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) 상담 신청 (오픈 페이지 설문지 응답)
-- ---------------------------------------------------------------------
create table if not exists consultations (
  id               text primary key,
  created_at       timestamptz default now(),

  name             text not null,
  phone            text not null,
  contact_time     text,              -- 연락받기 편한 시간

  goals            text[],            -- 운동 목적 (복수)
  pain_areas       text[],            -- 불편한 부위 (복수)
  pregnancy        text,              -- 임신·출산 관련
  concern          text,              -- 몸 고민 (서술)

  experience       text,              -- 운동 경험
  programs         text[],            -- 관심 수업 (복수)
  days             text[],            -- 희망 요일 (복수)
  time_slots       text[],            -- 희망 시간대 (복수)
  wish_time        text,              -- 시간표에 없는 희망 시간·수업 (서술)

  priorities       text[],            -- 센터 고를 때 중요한 것 (최대 2)
  source           text,              -- 처음 알게 된 경로 (본인 응답)
  utm_source       text,              -- 링크로 자동 기록 (?from=flyer 등)

  agree_privacy    boolean not null default false,
  agree_health     boolean not null default false,   -- 민감정보(건강) 별도 동의
  agree_marketing  boolean not null default false,

  status           text not null default 'new',   -- new / contacted / registered / closed
  memo             text
);

create index if not exists idx_consult_created on consultations (created_at desc);
create index if not exists idx_consult_status  on consultations (status);

-- 앱은 서버에서 service_role 로만 접근한다. 공개 키로는 읽을 수 없게.
alter table consultations enable row level security;


-- ---------------------------------------------------------------------
-- 2) 북구점(2호점) 새 시간표 — 월~금, 45분, 32개 수업
--    바레 12 · 필라테스 6 · 필라웨이트 6 · 아로마 5 · 요가 3
--    (내부 지점 키는 '2호점' 그대로 두고, 화면에서만 '북구점'으로 보여준다)
-- ---------------------------------------------------------------------
delete from slots where branch = '2호점' and date is null;

insert into slots (id, branch, program, day_of_week, "time", capacity) values
  -- 06:30
  ('nb_tue_0630', '2호점', '요가',       2, '06:30', 12),
  ('nb_thu_0630', '2호점', '요가',       4, '06:30', 12),
  -- 09:30
  ('nb_mon_0930', '2호점', '바레',       1, '09:30', 12),
  ('nb_tue_0930', '2호점', '필라웨이트', 2, '09:30', 12),
  ('nb_wed_0930', '2호점', '필라테스',   3, '09:30', 12),
  ('nb_thu_0930', '2호점', '바레',       4, '09:30', 12),
  ('nb_fri_0930', '2호점', '필라테스',   5, '09:30', 12),
  -- 10:30
  ('nb_mon_1030', '2호점', '바레',       1, '10:30', 12),
  ('nb_tue_1030', '2호점', '필라웨이트', 2, '10:30', 12),
  ('nb_wed_1030', '2호점', '필라테스',   3, '10:30', 12),
  ('nb_thu_1030', '2호점', '아로마',     4, '10:30', 12),
  ('nb_fri_1030', '2호점', '필라테스',   5, '10:30', 12),
  -- 14:00
  ('nb_mon_1400', '2호점', '바레',       1, '14:00', 12),
  ('nb_tue_1400', '2호점', '바레',       2, '14:00', 12),
  ('nb_wed_1400', '2호점', '아로마',     3, '14:00', 12),
  ('nb_thu_1400', '2호점', '필라웨이트', 4, '14:00', 12),
  ('nb_fri_1400', '2호점', '바레',       5, '14:00', 12),
  -- 18:30
  ('nb_mon_1830', '2호점', '아로마',     1, '18:30', 12),
  ('nb_tue_1830', '2호점', '바레',       2, '18:30', 12),
  ('nb_wed_1830', '2호점', '필라테스',   3, '18:30', 12),
  ('nb_thu_1830', '2호점', '필라웨이트', 4, '18:30', 12),
  ('nb_fri_1830', '2호점', '바레',       5, '18:30', 12),
  -- 19:30
  ('nb_mon_1930', '2호점', '바레',       1, '19:30', 12),
  ('nb_tue_1930', '2호점', '아로마',     2, '19:30', 12),
  ('nb_wed_1930', '2호점', '요가',       3, '19:30', 12),
  ('nb_thu_1930', '2호점', '필라웨이트', 4, '19:30', 12),
  ('nb_fri_1930', '2호점', '바레',       5, '19:30', 12),
  -- 20:30
  ('nb_mon_2030', '2호점', '바레',       1, '20:30', 12),
  ('nb_tue_2030', '2호점', '바레',       2, '20:30', 12),
  ('nb_wed_2030', '2호점', '필라테스',   3, '20:30', 12),
  ('nb_thu_2030', '2호점', '필라웨이트', 4, '20:30', 12),
  ('nb_fri_2030', '2호점', '아로마',     5, '20:30', 12);

-- 확인용: 프로그램별 개수
select program, count(*) from slots
where branch = '2호점' and date is null
group by program order by count(*) desc;
