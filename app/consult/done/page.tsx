import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "메리핏 북구점 · 신청 완료" };

const PHONE = "054-247-3978";
const SHOP_URL = "https://merryfitpila.cafe24.com/";

export default async function ConsultDone({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}) {
  const { n } = await searchParams;
  const name = (n ?? "").slice(0, 40);

  return (
    <main className="flex min-h-[80vh] flex-col justify-center gap-6 pt-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-800">
        ✓
      </div>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {name ? `${name}님, ` : ""}신청됐어요
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          남겨주신 내용을 보고 맞는 수업을 골라
          <br />
          <b className="text-neutral-800">보통 하루 안에</b> 연락드릴게요.
        </p>
      </div>

      <div className="rounded-2xl bg-[#1B3326] px-5 py-4 text-left text-white">
        <p className="text-xs font-bold text-[#EBD2A0]">오픈 후 3개월 한정</p>
        <p className="mt-1 text-[15px] font-bold">출석할 때마다 적립금 5,000원</p>
        <p className="mt-1 text-xs text-white/70">
          오픈 후 3개월 안에 등록하시면 첫 수업부터 바로 쌓입니다.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Link href="/signup" className="rounded-xl bg-emerald-800 py-3.5 text-base font-bold text-white">
          기다리지 않고 바로 회원가입
        </Link>
        <a
          href={`tel:${PHONE.replace(/-/g, "")}`}
          className="rounded-xl border border-neutral-300 bg-white py-3 text-sm font-semibold text-neutral-800"
        >
          급하시면 전화 주세요 · {PHONE}
        </a>
      </div>

      <div className="flex justify-center gap-4 text-xs text-neutral-500">
        <Link href="/open" className="underline underline-offset-2">북구점 소개로</Link>
        <a href={SHOP_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          메리핏 쇼핑몰
        </a>
      </div>
    </main>
  );
}
