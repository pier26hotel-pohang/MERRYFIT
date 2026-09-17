"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestPointTransferAction } from "@/lib/actions";

// 앱 적립금 → 쇼핑몰(카페24) 적립금 전환 신청.
// 두 시스템이 아직 연결돼 있지 않아, 신청 → 센터 지급 → 앱 차감으로 맞춘다.
export function PointTransferButton({ points, pending }: { points: number; pending: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  if (pending) {
    return (
      <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2.5 text-center text-sm text-amber-700">
        적립금 전환을 신청하셨어요. 확인 후 쇼핑몰에 반영해 드릴게요.
      </p>
    );
  }

  if (points <= 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() =>
          startTransition(async () => {
            const r = await requestPointTransferAction();
            setOk(r.ok);
            setMsg(r.msg);
            if (r.ok) router.refresh();
          })
        }
        disabled={busy}
        className="w-full rounded-xl border border-pink-300 py-2.5 text-sm font-semibold text-pink-600 transition hover:bg-pink-50 disabled:opacity-60"
      >
        {busy ? "신청 중..." : `쇼핑몰 적립금으로 전환 신청 (${points.toLocaleString()}원)`}
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
