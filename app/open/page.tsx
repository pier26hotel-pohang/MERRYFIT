import type { Metadata } from "next";
import Link from "next/link";
import { loadSnapshot } from "@/lib/store";
import { PROGRAMS, programInfo, CLASS_MINUTES } from "@/lib/programs";
import { BRANCH_INFO } from "@/lib/branch-info";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://merryfit-ftf5.vercel.app";
// 오픈일이 확정되면 "2026-10-15" 처럼 채운다 — 그때부터 D-카운트가 자동으로 뜬다.
// 비워두면 날짜 없이 "10월 오픈 예정"으로만 안내한다.
const OPEN_DATE: string = "";
const OPEN_MONTH = "10월";
const OPEN_LABEL = (() => {
  if (!OPEN_DATE) return OPEN_MONTH;
  const [, m, d] = OPEN_DATE.split("-").map(Number);
  return `${m}월 ${d}일`;
})();
const PHONE = "054-247-3978";
const SHOP_URL = "https://merryfitpila.cafe24.com/";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: `메리핏 북구점 · ${OPEN_LABEL} 그랜드 오픈`,
  description: "바레 · 필라테스 · 요가 월 10만원부터. 출석할 때마다 적립금 5,000원 오픈 이벤트. 포항 우현동.",
  openGraph: {
    title: `메리핏 북구점 · ${OPEN_LABEL} 그랜드 오픈`,
    description: "바레 · 필라테스 · 요가 월 10만원부터 · 출석마다 적립금 5,000원",
    images: [{ url: "/open/og.jpg", width: 1200, height: 630, alt: "메리핏 북구점 그랜드 오픈" }],
    type: "website",
    locale: "ko_KR",
  },
};

const PASSES = [
  { name: "루틴패스 Lite", count: "월 4회", price: "10만원", note: "주 1회" },
  { name: "루틴패스 Basic", count: "월 8회", price: "17만원", note: "주 2회" },
  { name: "루틴패스 Pro", count: "월 12회", price: "22만원", note: "주 3회" },
  { name: "루틴패스 Unlimited", count: "무제한", price: "28만원", note: "매일" },
];

const POINTS = ["바레 · 필라테스 · 요가", "체형 교정 & 자세 개선", "개인 맞춤형 프로그램", "쾌적한 프리미엄 스튜디오"];

const WEEK = [
  { dow: 1, label: "월" },
  { dow: 2, label: "화" },
  { dow: 3, label: "수" },
  { dow: 4, label: "목" },
  { dow: 5, label: "금" },
];

// 오픈일까지 남은 날 (한국 시간 기준)
function daysUntilOpen(): number | null {
  if (!OPEN_DATE) return null;
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const [y, m, d] = OPEN_DATE.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - today) / 86400000);
}

export default async function OpenPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const tag = from && /^[a-z0-9_-]{1,32}$/i.test(from) ? from : "";
  const consultHref = tag ? `/consult?from=${tag}` : "/consult";

  const db = await loadSnapshot();
  const slots = db.slots.filter((s) => s.branch === "2호점" && !s.date);
  const times = [...new Set(slots.map((s) => s.time))].sort();
  const cell = (dow: number, time: string) => slots.find((s) => s.dayOfWeek === dow && s.time === time);

  const dday = daysUntilOpen();
  const branch = BRANCH_INFO[0];

  return (
    <main className="-mx-4 pb-24">
      {/* ── 히어로 ── */}
      <section className="relative isolate overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/open/hero.jpg"
          alt="메리핏 북구점 공간 — 라탄 조명과 식물이 가득한 스튜디오 (예정 모습)"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/10 via-black/25 to-[#0E1A13]/90" />
        <div className="flex min-h-[27rem] flex-col justify-end px-5 pb-7 pt-24">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#EBD2A0] px-3 py-1 text-xs font-bold text-[#1B2B20]">
              {dday === null
                ? `${OPEN_MONTH} 오픈 예정`
                : dday > 0
                  ? `오픈 D-${dday}`
                  : dday === 0
                    ? "오늘 오픈!"
                    : "지금 운영 중"}
            </span>
            <span className="text-xs font-medium text-white/80">포항 우현동 · 북구점</span>
          </div>
          <p className="text-sm font-semibold tracking-wide text-[#EBD2A0]">메리핏 바레 웰니스</p>
          <h1 className="mt-1 text-[2.35rem] font-extrabold leading-[1.12] tracking-tight text-white [text-wrap:balance]">
            {dday === null || dday >= 0 ? (
              <>
                {dday === 0 ? "오늘" : OPEN_LABEL}
                <br />
                그랜드 오픈
              </>
            ) : (
              <>
                북구점
                <br />
                오픈했습니다
              </>
            )}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/85">
            건강한 움직임, 아름다운 변화의 시작.
            <br />
            식물과 라탄 조명 아래에서 운동하는 웰니스 스튜디오입니다.
          </p>
          {(dday === null || dday >= 0) && (
            <p className="mt-3 text-[11px] text-white/55">※ 위 사진은 완공 예정 모습입니다.</p>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-9 px-4 pt-7">
        {/* ── 가격 ── */}
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">Membership</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
            월 <span className="text-emerald-800">10만원</span>부터
          </h2>
          <p className="mt-1 text-sm text-neutral-500">주 1회부터 매일까지, 내 속도에 맞춰 고르세요.</p>
          <ul className="mt-4 divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {PASSES.map((p, i) => (
              <li key={p.name} className={`flex items-center gap-3 px-4 py-3 ${i === 0 ? "bg-emerald-50/60" : ""}`}>
                <div className="flex-1">
                  <div className="text-[15px] font-bold text-neutral-900">{p.name}</div>
                  <div className="text-xs text-neutral-500">
                    {p.count} · {p.note}
                  </div>
                </div>
                <div className="text-right text-lg font-extrabold tabular-nums text-neutral-900">{p.price}</div>
              </li>
            ))}
          </ul>
          <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2">
            {POINTS.map((t) => (
              <li key={t} className="flex items-start gap-1.5 text-[13px] text-neutral-700">
                <span className="mt-[1px] font-bold text-emerald-700">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* ── 오픈 이벤트 ── */}
        <section className="relative overflow-hidden rounded-2xl bg-[#1B3326] px-5 py-5 text-white">
          <span className="inline-block rounded-full bg-[#EBD2A0] px-2.5 py-0.5 text-[11px] font-extrabold text-[#1B2B20]">
            오픈 후 3개월 한정
          </span>
          <h2 className="mt-3 text-xl font-extrabold leading-snug tracking-tight">
            출석할 때마다
            <br />
            적립금 <span className="text-[#EBD2A0]">5,000원</span>
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            센터에 도착해 앱에서 출석 버튼만 누르면 바로 쌓입니다.
            <br />
            모인 적립금은 메리핏 쇼핑몰 적립금으로 바꿔드려요.
          </p>
          <p className="mt-3 text-[11px] text-white/45">
            오픈 후 3개월 안에 등록하신 분께 드리는 혜택입니다.
          </p>
        </section>

        {/* ── 시간표 ── */}
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">Timetable</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">북구점 시간표</h2>
          <p className="mt-1 text-sm text-neutral-500">
            월~금 · 수업 {CLASS_MINUTES}분 · 정원제
          </p>

          <ul className="mt-4 grid grid-cols-1 gap-1.5">
            {PROGRAMS.map((p) => (
              <li key={p.name} className="flex items-center gap-2 text-[13px]">
                <span
                  className="inline-flex min-w-[3.1rem] justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold"
                  style={{ background: p.bg, color: p.fg }}
                >
                  {p.short}
                </span>
                <span className="font-semibold text-neutral-800">{p.name}</span>
                <span className="text-neutral-500">{p.desc}</span>
              </li>
            ))}
          </ul>

          {times.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-neutral-300 p-5 text-center text-sm text-neutral-400">
              시간표를 준비하고 있어요.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <table className="w-full table-fixed border-collapse text-center">
                <thead>
                  <tr className="bg-neutral-50">
                    <th className="w-12 py-2 text-[11px] font-medium text-neutral-400">시간</th>
                    {WEEK.map((d) => (
                      <th key={d.dow} className="py-2 text-xs font-bold text-neutral-700">
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {times.map((t) => (
                    <tr key={t} className="border-t border-neutral-100">
                      <th className="py-1.5 text-[11px] font-semibold tabular-nums text-neutral-600">{t}</th>
                      {WEEK.map((d) => {
                        const s = cell(d.dow, t);
                        if (!s) return <td key={d.dow} className="p-0.5" />;
                        const info = programInfo(s.program);
                        return (
                          <td key={d.dow} className="p-0.5">
                            <div
                              className="rounded-md py-1.5 text-[11px] font-bold leading-none"
                              style={{ background: info.bg, color: info.fg }}
                              title={info.name}
                            >
                              {info.short}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-neutral-400">
            원하시는 시간이 없나요? 상담 신청서에 적어주세요. 신청이 모이면 시간표에 반영합니다.
          </p>
        </section>

        {/* ── 상담 신청 ── */}
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-6 text-center">
          <h2 className="text-xl font-extrabold tracking-tight text-emerald-900">
            나에게 맞는 수업,
            <br />
            먼저 상담받아 보세요
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900/70">
            몸 상태와 원하는 시간을 알려주시면
            <br />
            맞는 수업을 골라 연락드립니다. 2분이면 끝나요.
          </p>
          <Link
            href={consultHref}
            className="mt-5 block rounded-xl bg-emerald-800 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-900"
          >
            상담 신청하기
          </Link>
          <a
            href={`tel:${PHONE.replace(/-/g, "")}`}
            className="mt-2 block rounded-xl border border-emerald-800/25 bg-white py-3 text-sm font-semibold text-emerald-900"
          >
            전화로 문의하기 · {PHONE}
          </a>
          <div className="mt-4 flex justify-center gap-4 text-xs text-emerald-900/60">
            <Link href="/signup" className="underline underline-offset-2">
              바로 회원가입
            </Link>
            <a href={SHOP_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              메리핏 쇼핑몰
            </a>
          </div>
        </section>

        {/* ── 오시는 길 ── */}
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">Location</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">오시는 길</h2>
          <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="text-[15px] font-bold text-neutral-900">{branch.address}</p>
            {branch.landmark && <p className="mt-1 text-sm text-neutral-600">{branch.landmark}</p>}
            {branch.parking && <p className="mt-1 text-sm text-neutral-600">🚗 {branch.parking}</p>}
            <div className="mt-3 flex gap-2">
              <a
                href={branch.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-center text-sm font-semibold text-white"
              >
                네이버 지도
              </a>
              <a
                href={`tel:${PHONE.replace(/-/g, "")}`}
                className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-center text-sm font-semibold text-neutral-800"
              >
                전화하기
              </a>
            </div>
          </div>
        </section>

        <footer className="pb-2 text-center text-xs text-neutral-400">
          메리핏 바레 웰니스 북구점 · (주)더블에스
        </footer>
      </div>

      {/* ── 하단 고정 버튼 ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-2 px-4 py-2.5">
          <a
            href={`tel:${PHONE.replace(/-/g, "")}`}
            aria-label="전화 문의"
            className="flex w-14 items-center justify-center rounded-xl border border-neutral-300 text-lg"
          >
            📞
          </a>
          <Link
            href={consultHref}
            className="flex-1 rounded-xl bg-emerald-800 py-3 text-center text-base font-bold text-white"
          >
            상담 신청하기
          </Link>
        </div>
      </div>
    </main>
  );
}
