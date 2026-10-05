// 메리핏 예약 레이어 — 데이터 타입 정의

export type Branch = "1호점" | "2호점";

// 손님에게 보여줄 지점 이름. 내부 키(DB)는 그대로 두고 화면에서만 바꾼다.
export const BRANCH_LABEL: Record<Branch, string> = {
  "1호점": "남구점",
  "2호점": "북구점",
};

export type ProgramName =
  | "기구 필라테스"
  | "리포머"
  | "체어"
  | "캐딜락"
  | "바레"
  | "필라테스"
  | "필라웨이트"
  | "요가"
  | "아로마"
  | "상담신청"
  | "단체수업";

export interface Member {
  id: string;
  name: string;
  phone: string;
  branch: Branch; // 주 소속(기본 표시) 지점
  points: number; // 적립금(원)
  memo?: string; // 관리자 메모
  birthdate?: string; // 생년월일 YYYY-MM-DD
  address?: string; // 주소
  createdAt?: string; // 가입일 (관리자)
  kakaoId?: string; // 카카오 로그인 연결 (auth user id)
  hasPassword?: boolean; // 본인이 비밀번호를 정했는가 (관리자가 미리 넣은 회원은 false)
  cafe24Id?: string; // 쇼핑몰(카페24) 회원아이디 — 적립금 자동 반영에 필요
  pointsSynced?: number; // points 중 이미 쇼핑몰에 올린 금액
  priorVisits?: number; // 앱 도입 전 다른 시스템에서 쌓은 출석 (등급 계산에만 씀)
  importedFrom?: string; // 이관 출처. 직접 가입한 회원은 없음
}

// 수강권 사용 가능 지점 범위
export type PassScope = "both" | "1호점" | "2호점";

export interface Pass {
  id: string;
  memberId: string;
  type: string; // 예: "자유수강권 20회"
  total: number;
  remaining: number;
  scope: PassScope; // both = 두 지점 공용
  monthly: boolean; // 매달 횟수가 다시 채워지는 정기권
  periodStart?: string; // 이번 주기 시작일 (매달 이 날 갱신)
  expiresAt?: string; // 정기권 종료일. 없으면 해지할 때까지 계속
}

// 시간표 슬롯. date 가 없으면 '매주 반복', 있으면 그 날짜 1회성.
export interface ScheduleSlot {
  id: string;
  branch: Branch;
  program: ProgramName;
  dayOfWeek: number; // 0=일 .. 6=토 (1회성도 배치용으로 채움)
  time: string; // HH:mm
  capacity: number;
  date?: string; // 있으면 1회성(YYYY-MM-DD), 없으면 매주 반복
}

export type ReservationStatus = "booked" | "attended" | "cancelled";

// 특정 주차의 슬롯 1회 신청
export interface Reservation {
  id: string;
  slotId: string;
  memberId: string;
  date: string; // 해당 회차 날짜 YYYY-MM-DD
  status: ReservationStatus;
  passId?: string; // 차감한 수강권 (취소 시 복구용)
}

export interface DB {
  members: Member[];
  passes: Pass[];
  slots: ScheduleSlot[];
  reservations: Reservation[];
}

export const ATTEND_POINT = 5000; // 출석 1회 적립금

// 기본 지점 — 2호점 오픈 이후 신규 회원은 2호점을 먼저 본다.
export const DEFAULT_BRANCH: Branch = "2호점";

// 예약을 열어주는 날(KST, YYYY-MM-DD). 이 날이 되기 전에는 시간표만 보이고
// 예약 버튼이 막힌다. 북구점은 공사·오픈 준비가 끝나는 10월 19일부터 받는다.
// 남구점은 이미 운영 중이라 제한이 없다.
// 테스트할 때는 BUKGU_OPEN_AT 를 오늘 날짜로 두면 바로 열린다.
// 환경변수를 쓰는 이유: 코드를 고쳐 배포했다가 되돌리는 걸 잊으면
// 준비 안 된 지점이 손님에게 열려버린다.
export const BRANCH_OPEN_AT: Partial<Record<Branch, string>> = {
  "2호점": process.env.BUKGU_OPEN_AT || "2026-10-12",  // 가오픈일부터 예약을 받는다
};

// 가입 시 자동으로 들어가는 수강권.
// 가입 직후 아무것도 못 하고 빈 화면만 보는 구간을 없앤다.
export const WELCOME_PASS = { type: "체험 1회권", total: 1, scope: "both" as PassScope };

// 적립금 전환 신청
export type PointRequestStatus = "pending" | "done" | "rejected";
export interface PointRequest {
  id: string;
  memberId: string;
  points: number;
  status: PointRequestStatus;
  memo?: string;
  createdAt?: string;
}
