// 메리핏 예약 레이어 — 데이터 타입 정의

export type Branch = "1호점" | "2호점";

export type ProgramName = "기구 필라테스" | "바레" | "필라웨이트" | "단체수업";

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
