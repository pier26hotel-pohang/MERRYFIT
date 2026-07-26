# 메리핏 MERRY FIT — 예약 앱

포항 메리핏 필라테스 회원 예약·출석·수강권·시간표 웹앱 (Next.js PWA).

## 기능
- 주간 시간표(요일×시간, 지점·주차 전환), 예약/취소(당일·전날 취소 금지)
- 정원 관리(1호점 4/6명, 2호점 12명), 수강권 지점범위(공용/전용)
- 위치 검증 셀프 체크인(지오펜스), 적립금·출석 관리
- 관리자: 통계·시간표 편집(매주반복/1회성)·회원 상세·메모·수강권 발급
- 공개 시간표 `/timetable` (카페24 임베드용)
- PWA(홈 화면 앱 설치)

## 개발 실행
```
npm install
npm run dev      # http://localhost:3000
```

## 데이터 저장
- 현재: 파일 기반 `data/db.json` (프로토타입)
- 배포 시: **Supabase(PostgreSQL)** — `supabase/schema.sql` 참고, `.env.local.example` 로 키 설정

## 배포
- GitHub → Vercel 자동 배포, 환경변수에 Supabase 키 입력
- 로그인: Supabase Auth 카카오 provider
- 카페24: `/timetable` 을 iframe 임베드

## 구조
- `app/` 페이지(회원 `/book`, 직원 `/checkin`, 관리자 `/admin`, 공개 `/timetable`)
- `lib/store.ts` 데이터·비즈니스 로직 · `lib/actions.ts` 서버 액션
- `components/` UI(시간표 격자·셀프체크인·취소 버튼·수업추가 폼)
