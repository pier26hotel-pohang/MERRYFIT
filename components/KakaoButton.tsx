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
        options: { redirectTo: `${location.origin}/auth/callback` },
      });
      if (error) {
        setErr("카카오 로그인 준비 중입니다. (관리자: Supabase에 카카오 연결 필요)");
        setBusy(false);
      }
      // 성공 시 카카오로 리디렉션됨
    } catch {
      setErr("카카오 로그인 준비 중입니다.");
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
