"use client";
import { useEffect, useState } from "react";
import { BRANCH_INFO } from "@/lib/branch-info";
import { CANCEL_RULES, CLASS_GUIDE } from "@/lib/guide-content";

// 우측 상단 ⓘ 버튼 → 수업 안내 · 취소 규정 · 오시는 길.
// 회원이 매번 물어보는 것들을 한 곳에 모아 항상 꺼내볼 수 있게 한다.
export function GuidePanel() {
  const [open, setOpen] = useState(false);

  // 열려 있는 동안 뒤 배경이 스크롤되지 않게.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="이용 안내"
        className="flex h-7 items-center gap-1 rounded-full border border-neutral-300 px-2.5 text-xs font-semibold text-neutral-600 transition hover:border-emerald-600 hover:text-emerald-700"
      >
        <span aria-hidden>ⓘ</span> 안내
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="이용 안내"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-3">
              <h2 className="font-extrabold tracking-tight">이용 안내</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-2xl leading-none text-neutral-400 hover:text-neutral-700"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 px-5 py-5 text-sm">
              {/* 수업 안내 */}
              <section>
                <h3 className="mb-2 font-bold text-emerald-800">수업 안내</h3>
                <ul className="space-y-1.5 text-neutral-600">
                  {CLASS_GUIDE.map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-600" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 취소 규정 */}
              <section>
                <h3 className="mb-2 font-bold text-emerald-800">예약 취소 규정</h3>
                <ul className="space-y-1.5 text-neutral-600">
                  {CANCEL_RULES.map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-pink-500" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 오시는 길 */}
              <section>
                <h3 className="mb-2 font-bold text-emerald-800">오시는 길</h3>
                <div className="space-y-3">
                  {BRANCH_INFO.map((b) => (
                    <div key={b.name} className="rounded-xl border border-neutral-200 p-3.5">
                      <div className="font-semibold text-neutral-800">{b.name}</div>
                      <div className="mt-1 text-neutral-600">{b.address}</div>
                      {b.landmark && <div className="mt-0.5 text-xs text-neutral-500">{b.landmark}</div>}
                      {b.parking && <div className="mt-0.5 text-xs text-neutral-500">🚗 {b.parking}</div>}
                      <div className="mt-2.5 flex gap-2">
                        <a
                          href={b.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          지도 보기
                        </a>
                        <a
                          href={`tel:${b.tel.replace(/-/g, "")}`}
                          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700"
                        >
                          {b.tel}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <p className="pb-2 text-center text-xs text-neutral-400">
                궁금한 점은 센터로 편하게 연락 주세요.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
