// 회원별 결제 이력
//
// 수강권(passes)은 "지금 쓸 수 있는 것"만 들고 있어서, 만료되거나 지워지면
// 얼마를 언제 냈는지가 사라진다. 결제는 따로 쌓아두고 여기서만 읽는다.
import { supabaseAdmin } from "./supabase";

export interface Payment {
  id: string;
  memberId: string;
  passId?: string;
  product: string;
  amount: number;
  /** 결제일 */
  paidAt: string;
  /** 이용 시작일 */
  startsAt?: string;
  /** 이용 종료일. 없으면 계속 */
  endsAt?: string;
  method?: string;
  memo?: string;
}

export const PAY_METHODS = ["카드", "계좌이체", "현금", "기타"] as const;

/* eslint-disable @typescript-eslint/no-explicit-any */
function map(r: any): Payment {
  return {
    id: r.id,
    memberId: r.member_id,
    passId: r.pass_id ?? undefined,
    product: r.product,
    amount: r.amount ?? 0,
    paidAt: r.paid_at,
    startsAt: r.starts_at ?? undefined,
    endsAt: r.ends_at ?? undefined,
    method: r.method ?? undefined,
    memo: r.memo ?? undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function addPayment(input: Omit<Payment, "id">): Promise<string> {
  const id = "pay_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const { error } = await supabaseAdmin().from("payments").insert({
    id,
    member_id: input.memberId,
    pass_id: input.passId ?? null,
    product: input.product,
    amount: input.amount,
    paid_at: input.paidAt,
    starts_at: input.startsAt ?? null,
    ends_at: input.endsAt ?? null,
    method: input.method ?? null,
    memo: input.memo ?? null,
  });
  if (error) throw new Error(`결제 기록 저장 실패: ${error.message}`);
  return id;
}

/** 한 회원의 결제 이력 (최근 순) */
export async function listPayments(memberId: string): Promise<Payment[]> {
  const { data, error } = await supabaseAdmin()
    .from("payments").select("*").eq("member_id", memberId).order("paid_at", { ascending: false });
  if (error) {
    console.error("[listPayments]", error.message);
    return [];
  }
  return (data ?? []).map(map);
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("payments").delete().eq("id", id);
  if (error) throw new Error(`결제 기록 삭제 실패: ${error.message}`);
}

/** 기간별 매출 합계 — 관리자 요약용 */
export async function revenueBetween(from: string, to: string): Promise<{ total: number; count: number }> {
  const { data, error } = await supabaseAdmin()
    .from("payments").select("amount").gte("paid_at", from).lte("paid_at", to);
  if (error) {
    console.error("[revenueBetween]", error.message);
    return { total: 0, count: 0 };
  }
  const rows = data ?? [];
  return { total: rows.reduce((s, r) => s + (r.amount ?? 0), 0), count: rows.length };
}
