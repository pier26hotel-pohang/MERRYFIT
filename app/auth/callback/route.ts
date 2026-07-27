import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { MEMBER_COOKIE } from "@/lib/auth";

// 카카오 로그인 콜백: 코드 교환 → 회원 찾기/생성 → 세션 쿠키
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const cookieStore = await cookies();

  if (code) {
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
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    const user = data?.user;
    if (user) {
      const admin = supabaseAdmin();
      const { data: existing } = await admin.from("members").select("id").eq("auth_user_id", user.id).maybeSingle();
      let memberId = existing?.id as string | undefined;
      if (!memberId) {
        memberId = "m_" + Math.random().toString(36).slice(2, 9);
        const name =
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.preferred_username ||
          "회원";
        await admin.from("members").insert({
          id: memberId, name, phone: "", branch: "1호점", points: 0, memo: "", auth_user_id: user.id,
        });
      }
      cookieStore.set(MEMBER_COOKIE, memberId, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
    }
  }
  return NextResponse.redirect(new URL("/book", req.url));
}
