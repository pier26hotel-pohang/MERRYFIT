"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selfCheckInAction } from "@/lib/actions";

export function SelfCheckIn({ memberId }: { memberId: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);
  const router = useRouter();

  function handleClick() {
    setMsg(null);
    if (!("geolocation" in navigator)) {
      setOk(false);
      setMsg("이 기기에서는 위치를 사용할 수 없어요.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        startTransition(async () => {
          const r = await selfCheckInAction(
            memberId,
            pos.coords.latitude,
            pos.coords.longitude
          );
          setOk(r.ok);
          setMsg(r.msg);
          if (r.ok) router.refresh();
        });
      },
      () => {
        setLocating(false);
        setOk(false);
        setMsg("위치 권한을 허용해야 출석할 수 있어요.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const busy = pending || locating;

  return (
    <div className="mb-5">
      <button
        onClick={handleClick}
        disabled={busy}
        className="w-full rounded-2xl bg-emerald-600 py-3 text-center font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? "확인 중..." : "📍 출석하기 (센터에 도착하면 누르세요)"}
      </button>
      {msg && (
        <p
          className={`mt-2 rounded-lg px-3 py-2 text-center text-sm ${
            ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
