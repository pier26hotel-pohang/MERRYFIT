// 카페24 쇼핑몰 적립금 연동
//
// 앱에서 출석으로 쌓인 적립금을 쇼핑몰 적립금으로 자동으로 올린다.
// 공식 문서: POST /api/v2/admin/points  (scope: WRITE_MILEAGE)
//
// 켜려면 환경변수 4개가 필요하다. 하나라도 없으면 연동은 꺼진 상태로 두고,
// 기존의 수동 전환 신청 흐름이 그대로 동작한다.
//   CAFE24_MALL_ID        쇼핑몰 아이디 (merryfitpila)
//   CAFE24_CLIENT_ID      개발자센터 앱의 Client ID
//   CAFE24_CLIENT_SECRET  개발자센터 앱의 Client Secret
//   CAFE24_REFRESH_TOKEN  최초 1회 OAuth 인증으로 받은 refresh token
//
// ⚠ 앱에 "적립금 쓰기(WRITE_MILEAGE)" 권한이 승인돼 있어야 한다.
import { supabaseAdmin } from "./supabase";

const MALL_ID = process.env.CAFE24_MALL_ID ?? "";
const CLIENT_ID = process.env.CAFE24_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.CAFE24_CLIENT_SECRET ?? "";
const SEED_REFRESH = process.env.CAFE24_REFRESH_TOKEN ?? "";

const API_VERSION = "2026-09-01";
const TOKEN_KEY = "cafe24_token";

export function cafe24Enabled(): boolean {
  return Boolean(MALL_ID && CLIENT_ID && CLIENT_SECRET && SEED_REFRESH);
}

/** 연동이 왜 꺼져 있는지 관리자에게 보여줄 문구 */
export function cafe24Status(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!MALL_ID) missing.push("CAFE24_MALL_ID");
  if (!CLIENT_ID) missing.push("CAFE24_CLIENT_ID");
  if (!CLIENT_SECRET) missing.push("CAFE24_CLIENT_SECRET");
  if (!SEED_REFRESH) missing.push("CAFE24_REFRESH_TOKEN");
  return { ok: missing.length === 0, missing };
}

interface TokenSet {
  accessToken: string;
  refreshToken: string;
  /** access token 만료 시각 (epoch ms) */
  expiresAt: number;
}

async function readToken(): Promise<TokenSet | null> {
  const { data } = await supabaseAdmin()
    .from("integrations").select("value").eq("key", TOKEN_KEY).maybeSingle();
  return (data?.value as TokenSet | undefined) ?? null;
}

async function writeToken(t: TokenSet): Promise<void> {
  await supabaseAdmin()
    .from("integrations")
    .upsert({ key: TOKEN_KEY, value: t, updated_at: new Date().toISOString() });
}

/**
 * refresh token 으로 access token 을 새로 받는다.
 * 카페24는 refresh token 도 함께 회전시키므로 받은 값을 반드시 저장해야 한다.
 * 저장에 실패하면 다음 호출 때 인증이 깨지므로 저장까지 끝낸 뒤 반환한다.
 */
async function refresh(refreshToken: string): Promise<TokenSet> {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`https://${MALL_ID}.cafe24api.com/api/v2/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`카페24 토큰 갱신 실패 (${res.status}): ${body.slice(0, 300)}`);
  const j = JSON.parse(body) as { access_token: string; refresh_token: string; expires_in?: number };
  const t: TokenSet = {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    // 만료 1분 전에는 미리 갱신한다.
    expiresAt: Date.now() + ((j.expires_in ?? 7200) - 60) * 1000,
  };
  await writeToken(t);
  return t;
}

async function accessToken(): Promise<string> {
  const saved = await readToken();
  if (saved && saved.expiresAt > Date.now()) return saved.accessToken;
  // 저장된 게 없으면 환경변수의 최초 refresh token 으로 시작한다.
  const t = await refresh(saved?.refreshToken ?? SEED_REFRESH);
  return t.accessToken;
}

export interface GiveResult {
  ok: boolean;
  msg: string;
}

/**
 * 쇼핑몰 회원에게 적립금을 지급한다.
 * cafe24Id 는 쇼핑몰 로그인 아이디 — 앱 회원 정보에 미리 연결돼 있어야 한다.
 */
export async function givePoints(cafe24Id: string, amount: number, reason: string): Promise<GiveResult> {
  if (!cafe24Enabled()) return { ok: false, msg: "카페24 연동이 설정되지 않았습니다." };
  if (!cafe24Id) return { ok: false, msg: "쇼핑몰 아이디가 연결되지 않은 회원입니다." };
  if (amount <= 0) return { ok: false, msg: "지급할 금액이 없습니다." };
  // 문서상 1회 최대 100만원.
  if (amount > 1_000_000) return { ok: false, msg: "1회 지급 한도(100만원)를 넘었습니다." };

  try {
    const token = await accessToken();
    const res = await fetch(`https://${MALL_ID}.cafe24api.com/api/v2/admin/points`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Cafe24-Api-Version": API_VERSION,
      },
      body: JSON.stringify({
        shop_no: 1,
        request: {
          member_id: cafe24Id,
          amount: amount.toFixed(2),
          type: "increase",
          reason: reason.slice(0, 100),
        },
      }),
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, msg: `쇼핑몰 적립 실패 (${res.status}): ${body.slice(0, 200)}` };
    return { ok: true, msg: `쇼핑몰에 ${amount.toLocaleString()}원 적립했습니다.` };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 아직 쇼핑몰에 올리지 않은 적립금만 올린다.
 * members.points 는 누계, points_synced 는 그중 이미 올린 금액이다.
 * 둘의 차이만 보내므로, 중간에 실패해도 다음에 다시 시도하면 되고
 * 두 번 실행해도 중복 지급되지 않는다.
 */
export async function syncMemberPoints(memberId: string): Promise<GiveResult> {
  const sb = supabaseAdmin();
  const { data: m } = await sb
    .from("members").select("id,name,points,points_synced,cafe24_id").eq("id", memberId).maybeSingle();
  if (!m) return { ok: false, msg: "회원을 찾을 수 없습니다." };

  const pending = (m.points ?? 0) - (m.points_synced ?? 0);
  if (pending <= 0) return { ok: true, msg: "이미 모두 반영되어 있습니다." };
  if (!m.cafe24_id) return { ok: false, msg: "쇼핑몰 아이디가 연결되지 않았습니다." };

  const r = await givePoints(m.cafe24_id, pending, "메리핏 출석 적립금");
  const id = "ps_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await sb.from("point_syncs").insert({
    id, member_id: memberId, amount: pending,
    reason: "출석 적립금", status: r.ok ? "ok" : "failed", detail: r.msg,
  });
  if (r.ok) {
    await sb.from("members").update({ points_synced: (m.points_synced ?? 0) + pending }).eq("id", memberId);
  }
  return r;
}
