// 상담 신청 설문 — 질문 정의 · 저장 · 조회
// 폼과 관리자 통계가 같은 선택지를 쓰도록 질문은 여기 한 곳에만 둔다.
import { supabaseAdmin } from "./supabase";

export const Q = {
  contactTime: {
    label: "연락받기 편한 시간",
    options: ["오전 (9~12시)", "점심 (12~14시)", "오후 (14~18시)", "저녁 (18시 이후)", "아무 때나 괜찮아요"],
  },
  goals: {
    label: "운동하려는 이유",
    hint: "해당하는 건 모두 골라주세요",
    options: [
      "체형 교정 · 자세 개선",
      "통증 완화",
      "다이어트 · 체중 관리",
      "근력 · 체력 키우기",
      "산전 · 산후 관리",
      "스트레스 해소 · 마음 건강",
      "유연성",
      "꾸준한 운동 습관",
    ],
  },
  painAreas: {
    label: "요즘 불편한 곳",
    hint: "수업 강도를 맞추는 데 씁니다",
    options: ["목", "어깨", "허리", "골반", "무릎", "손목", "특별히 없어요"],
  },
  pregnancy: {
    label: "임신·출산 관련",
    hint: "안전한 동작을 준비하기 위해 여쭤봅니다",
    options: ["해당 없음", "임신 중", "출산 후 1년 이내", "임신 준비 중"],
  },
  experience: {
    label: "운동 경험",
    options: ["처음이에요", "조금 해봤어요", "꾸준히 했었어요", "지금도 하고 있어요"],
  },
  programs: {
    label: "관심 있는 수업",
    hint: "모두 골라주세요",
    options: ["바레", "필라테스", "필라웨이트", "요가", "아로마", "아직 잘 모르겠어요"],
  },
  days: {
    label: "다니기 좋은 요일",
    options: ["월", "화", "수", "목", "금", "토", "일"],
  },
  timeSlots: {
    label: "다니기 좋은 시간대",
    options: ["새벽 (6~8시)", "오전 (9~12시)", "낮 (12~17시)", "저녁 (18~21시)", "밤 (21시 이후)"],
  },
  priorities: {
    label: "센터를 고를 때 가장 중요한 것",
    hint: "최대 두 개",
    max: 2,
    options: ["가격", "집·직장에서 가까움", "수업 시간", "강사 전문성", "공간 분위기", "소수 정예", "함께 운동하는 분위기"],
  },
  source: {
    label: "메리핏을 처음 어디서 알게 되셨나요?",
    options: [
      "전단지",
      "인스타그램 릴스",
      "네이버 검색 · 플레이스",
      "지나가다 간판·현수막",
      "지인 추천",
      "메리핏 1호점 회원",
      "기타",
    ],
  },
} as const;

// 링크 파라미터 → 유입 경로 표기 (?from=flyer)
export const UTM_LABEL: Record<string, string> = {
  flyer: "전단지 QR",
  reels: "인스타 릴스",
  insta: "인스타 프로필",
  place: "네이버 플레이스",
  kakao: "카카오톡 공유",
  banner: "현수막 QR",
};

export type ConsultStatus = "new" | "contacted" | "registered" | "closed";

export const STATUS_LABEL: Record<ConsultStatus, string> = {
  new: "새 신청",
  contacted: "연락함",
  registered: "등록",
  closed: "종료",
};

export interface Consultation {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  contactTime?: string;
  goals: string[];
  painAreas: string[];
  pregnancy?: string;
  concern?: string;
  experience?: string;
  programs: string[];
  days: string[];
  timeSlots: string[];
  wishTime?: string;
  priorities: string[];
  source?: string;
  utmSource?: string;
  agreeHealth: boolean;
  agreeMarketing: boolean;
  status: ConsultStatus;
  memo?: string;
}

export type ConsultInput = Omit<Consultation, "id" | "createdAt" | "status" | "memo"> & {
  agreePrivacy: boolean;
};

function uid() {
  return "cs_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// 선택지 밖의 값은 버린다 — 폼을 조작해 임의 값을 넣는 걸 막는다.
export function keepAllowed(values: string[], allowed: readonly string[], max?: number): string[] {
  const set = new Set(allowed);
  const out = values.filter((v) => set.has(v));
  return typeof max === "number" ? out.slice(0, max) : out;
}

export function keepOne(value: string | undefined, allowed: readonly string[]): string | undefined {
  return value && allowed.includes(value) ? value : undefined;
}

export async function saveConsultation(input: ConsultInput): Promise<string> {
  const id = uid();
  const { error } = await supabaseAdmin().from("consultations").insert({
    id,
    name: input.name,
    phone: input.phone,
    contact_time: input.contactTime ?? null,
    goals: input.goals,
    pain_areas: input.painAreas,
    pregnancy: input.pregnancy ?? null,
    concern: input.concern || null,
    experience: input.experience ?? null,
    programs: input.programs,
    days: input.days,
    time_slots: input.timeSlots,
    wish_time: input.wishTime || null,
    priorities: input.priorities,
    source: input.source ?? null,
    utm_source: input.utmSource || null,
    agree_privacy: input.agreePrivacy,
    agree_health: input.agreeHealth,
    agree_marketing: input.agreeMarketing,
  });
  if (error) throw new Error(`상담 신청 저장 실패: ${error.message}`);
  return id;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function map(r: any): Consultation {
  return {
    id: r.id,
    createdAt: r.created_at,
    name: r.name,
    phone: r.phone,
    contactTime: r.contact_time ?? undefined,
    goals: r.goals ?? [],
    painAreas: r.pain_areas ?? [],
    pregnancy: r.pregnancy ?? undefined,
    concern: r.concern ?? undefined,
    experience: r.experience ?? undefined,
    programs: r.programs ?? [],
    days: r.days ?? [],
    timeSlots: r.time_slots ?? [],
    wishTime: r.wish_time ?? undefined,
    priorities: r.priorities ?? [],
    source: r.source ?? undefined,
    utmSource: r.utm_source ?? undefined,
    agreeHealth: Boolean(r.agree_health),
    agreeMarketing: Boolean(r.agree_marketing),
    status: (r.status ?? "new") as ConsultStatus,
    memo: r.memo ?? undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listConsultations(): Promise<Consultation[]> {
  const { data, error } = await supabaseAdmin()
    .from("consultations").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("[listConsultations]", error.message);
    return [];
  }
  return (data ?? []).map(map);
}

export async function setConsultStatus(id: string, status: ConsultStatus, memo?: string): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (memo !== undefined) patch.memo = memo;
  const { error } = await supabaseAdmin().from("consultations").update(patch).eq("id", id);
  if (error) throw new Error(`상태 변경 실패: ${error.message}`);
}

// 선택지별 응답 수 (많은 순)
export function tally(rows: Consultation[], pick: (c: Consultation) => string[] | string | undefined) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = pick(r);
    const arr = Array.isArray(v) ? v : v ? [v] : [];
    for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
