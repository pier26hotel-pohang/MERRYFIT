import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { MEMBER_COOKIE } from "@/lib/auth";
import { issuePass } from "@/lib/store";
import { DEFAULT_BRANCH, WELCOME_PASS } from "@/lib/types";

// 카카오 로그인 콜백: 코드 교환 → 회원 찾기/생성 → 세션 쿠키
//
// 실패해도 그냥 /book 으로 보내면 다시 /login 으로 튕겨서
// 사용자에겐 "눌러도 아무 일이 없다"로만 보인다.
// 그래서 실패 원인을 로그로 남기고 로그인 화면에 사유를 띄운다.
function fail(req: Request, reason: string, detail?: unknown) {
  console.error("[auth/callback]", reason, detail ?? "");
  const to = new URL("/login", req.url);
  to.searchParams.set("e", reason);
  return NextResponse.redirect(to);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const cookieStore = await cookies();

  // 카카오/Supabase 가 되돌려주는 오류 (동의 거부, 설정 오류 등)
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (oauthError) return fail(req, "provider", oauthError);
  if (!code) return fail(req, "nocode");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach((c) => cookieStore.set(c.name, c.value, c.options)),
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(req, "exchange", error.message);
  const user = data?.user;
  if (!user) return fail(req, "nouser");

  const admin = supabaseAdmin();
  const { data: existing, error: findErr } = await admin
    .from("members").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (findErr) return fail(req, "db", findErr.message);

  let memberId = existing?.id as string | undefined;
  if (!memberId) {
    memberId = "m_" + Math.random().toString(36).slice(2, 9);
    const name =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.preferred_username ||
      "회원";
    const { error: insErr } = await admin.from("members").insert({
      id: memberId, name, phone: "", branch: DEFAULT_BRANCH, points: 0, memo: "", auth_user_id: user.id,
    });
    if (insErr) return fail(req, "db", insErr.message);
    // 연락처 가입과 동일하게 체험 수강권을 바로 넣어준다.
    try {
      await issuePass(memberId, WELCOME_PASS.type, WELCOME_PASS.total, WELCOME_PASS.scope);
    } catch (e) {
      console.error("[auth/callback] welcome pass", e);
    }
  }

  cookieStore.set(MEMBER_COOKIE, memberId, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
  return NextResponse.redirect(new URL("/book", req.url));
}
