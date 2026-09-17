"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function KakaoButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function login() {
    setErr(null);
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${location.origin}/auth/callback`,
          // 카카오 개발자 콘솔의 동의항목과 반드시 일치해야 한다.
          // 설정되지 않은 항목을 요청하면 KOE205(설정하지 않은 동의항목)로 막힌다.
          // 현재 앱(메리핏 Check-in)은 비즈 앱이라 account_email 이 필수 동의로
          // 열려 있고, Supabase 가 기본 스코프에 이미 포함시켜 보낸다.
          scopes: "profile_nickname profile_image",
        },
      });
      if (error) {
        console.error("[kakao-login]", error);
        setErr(`로그인을 시작하지 못했습니다. (${error.message})`);
        setBusy(false);
      }
      // 성공 시 카카오로 리디렉션됨
    } catch (e) {
      // 서버(Supabase)에 아예 닿지 못하는 경우가 여기로 온다.
      console.error("[kakao-login]", e);
      const msg = e instanceof Error ? e.message : String(e);
      setErr(`서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요. (${msg})`);
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={login}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3 font-semibold text-[#191600] transition hover:brightness-95 disabled:opacity-60"
      >
        {busy ? "이동 중..." : "카카오로 시작하기"}
      </button>
      {err && <p className="mt-1 text-center text-xs text-amber-600">{err}</p>}
    </div>
  );
}
