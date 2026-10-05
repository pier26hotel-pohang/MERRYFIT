"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestPointTransferAction, linkShopAccountAction } from "@/lib/actions";

const SHOP_SIGNUP = "https://merryfitpila.cafe24.com/member/join.html";

// 앱 적립금 → 쇼핑몰(카페24) 적립금 전환.
//
// 쇼핑몰 계정이 없으면 적립금을 보낼 곳이 없다. 그래서 전환을 누르면
// 먼저 가입 페이지로 보내고, 돌아와서 "가입했어요" 를 누르면 연락처로
// 쇼핑몰 계정을 찾아 자동으로 붙인다.
export function PointTransferButton({
  points,
  pending,
  linked,
}: {
  points: number;
  pending: boolean;
  linked: boolean;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [step, setStep] = useState<"idle" | "join">("idle");
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

  const note = (
    <>
      {msg && (
        <p
          className={`mt-2 rounded-lg px-3 py-2 text-center text-sm ${
            ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {msg}
        </p>
      )}
    </>
  );

  // 쇼핑몰 계정이 아직 없을 때 — 가입부터 안내한다.
  if (!linked && step === "join") {
    return (
      <div className="mb-4 rounded-xl border border-pink-200 bg-pink-50/60 p-3.5">
        <p className="text-sm font-semibold text-pink-700">쇼핑몰 가입이 먼저 필요해요</p>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">
          적립금은 메리핏 쇼핑몰 계정으로 들어갑니다.
          <br />
          <b>앱과 같은 연락처</b>로 가입해 주시면 자동으로 연결됩니다.
        </p>

        <a
          href={SHOP_SIGNUP}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block rounded-xl bg-pink-500 py-2.5 text-center text-sm font-semibold text-white hover:bg-pink-600"
        >
          쇼핑몰 회원가입 하러 가기
        </a>

        <button
          onClick={() =>
            startTransition(async () => {
              const r = await linkShopAccountAction();
              setOk(r.ok);
              setMsg(r.msg);
              if (r.ok) {
                setStep("idle");
                router.refresh();
              }
            })
          }
          disabled={busy}
          className="mt-2 w-full rounded-xl border border-pink-300 py-2.5 text-sm font-semibold text-pink-600 hover:bg-pink-50 disabled:opacity-60"
        >
          {busy ? "확인 중..." : "가입했어요 · 연결하기"}
        </button>

        <button
          onClick={() => { setStep("idle"); setMsg(null); }}
          className="mt-1.5 w-full py-1.5 text-xs text-neutral-400"
        >
          나중에 할게요
        </button>
        {note}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => {
          if (!linked) { setStep("join"); setMsg(null); return; }
          startTransition(async () => {
            const r = await requestPointTransferAction();
            setOk(r.ok);
            setMsg(r.msg);
            if (r.ok) router.refresh();
          });
        }}
        disabled={busy}
        className="w-full rounded-xl border border-pink-300 py-2.5 text-sm font-semibold text-pink-600 transition hover:bg-pink-50 disabled:opacity-60"
      >
        {busy ? "신청 중..." : `쇼핑몰 적립금으로 전환 신청 (${points.toLocaleString()}원)`}
      </button>
      {note}
    </div>
  );
}
