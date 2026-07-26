import Link from "next/link";
import {
  getMember,
  memberRemaining,
  attendedCount,
  distinctTimes,
  slotForCell,
  slotBookedCount,
  getActiveReservation,
  occurrenceDate,
  weekRangeLabel,
  canCancelDate,
  todayISO,
} from "@/lib/store";
import { Branch } from "@/lib/types";
import { bookAction, cancelAction } from "@/lib/actions";
import { WeeklyGrid, programAbbrev } from "@/components/WeeklyGrid";
import { SelfCheckIn } from "@/components/SelfCheckIn";

export const dynamic = "force-dynamic";

export default async function MemberHome({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; w?: string; b?: string }>;
}) {
  const { m, w, b } = await searchParams;
  const member = m ? getMember(m) : undefined;
  const weekOffset = w === "1" ? 1 : 0;

  if (!member) {
    return (
      <main className="pt-8">
        <Link href="/" className="text-sm text-neutral-500">← 로그인</Link>
        <p className="mt-4">회원을 먼저 선택해주세요.</p>
      </main>
    );
  }

  const branch: Branch = b === "1호점" || b === "2호점" ? b : member.branch;
  const times = distinctTimes(branch);
  const link = (bb: Branch, wo: number) => `/book?m=${member.id}&b=${bb}&w=${wo}`;

  return (
    <main className="pt-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-500">← 로그아웃</Link>
      </div>

      {/* 회원 요약 카드 */}
      <section className="mb-5 rounded-2xl bg-emerald-800 p-5 text-white">
        <div className="text-lg font-bold">{member.name}님</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-emerald-700/60 py-2">
            <div className="text-xs text-emerald-100">적립금</div>
            <div className="text-base font-bold">{member.points.toLocaleString()}원</div>
          </div>
          <div className="rounded-xl bg-emerald-700/60 py-2">
            <div className="text-xs text-emerald-100">잔여 횟수</div>
            <div className="text-base font-bold">{memberRemaining(member.id)}회</div>
          </div>
          <div className="rounded-xl bg-emerald-700/60 py-2">
            <div className="text-xs text-emerald-100">출석</div>
            <div className="text-base font-bold">{attendedCount(member.id)}회</div>
          </div>
        </div>
      </section>

      {/* 메리핏 쇼핑몰 (적립금 사용) */}
      <a
        href="https://merryfitpila.cafe24.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-5 flex items-center justify-center gap-2 rounded-2xl bg-pink-500 py-3 font-semibold text-white shadow-sm transition hover:bg-pink-600"
      >
        🛍️ 메리핏 쇼핑몰 · 적립금 사용하기
      </a>

      {/* 위치 검증 셀프 체크인 */}
      <SelfCheckIn memberId={member.id} />

      {/* 지점 전환 */}
      <div className="mb-2 flex gap-2">
        {(["1호점", "2호점"] as Branch[]).map((bb) => (
          <Link
            key={bb}
            href={link(bb, weekOffset)}
            className={`flex-1 rounded-full py-1.5 text-center text-sm font-medium ${
              branch === bb ? "bg-emerald-700 text-white" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {bb}
          </Link>
        ))}
      </div>

      {/* 주차 전환 */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { o: 0, l: "이번 주" },
            { o: 1, l: "다음 주" },
          ].map(({ o, l }) => (
            <Link
              key={o}
              href={link(branch, o)}
              className={`rounded-full px-3 py-1 text-sm ${
                weekOffset === o ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {l}
            </Link>
          ))}
        </div>
        <span className="text-xs text-neutral-400">{weekRangeLabel(weekOffset)}</span>
      </div>

      <WeeklyGrid
        times={times}
        cell={(dow, time) => {
          const date = occurrenceDate(dow, weekOffset);
          const slot = slotForCell(branch, dow, time, date);
          if (!slot) return null;
          const count = slotBookedCount(slot.id, date);
          const full = count >= slot.capacity;
          const past = date < todayISO();
          const myR = getActiveReservation(slot.id, date, member.id);
          return (
            <div className="rounded-md border border-neutral-200 bg-white px-1 py-1">
              <div className="text-[11px] font-semibold leading-tight text-neutral-800">
                {programAbbrev(slot.program)}
              </div>
              <div className={`text-[10px] ${full && !myR ? "text-red-500" : "text-neutral-500"}`}>
                {count}/{slot.capacity}
              </div>
              {myR ? (
                canCancelDate(date) ? (
                  <form action={cancelAction}>
                    <input type="hidden" name="reservationId" value={myR.id} />
                    <button
                      title="누르면 예약이 취소됩니다"
                      className="mt-0.5 w-full rounded bg-pink-500 py-0.5 text-[10px] font-medium text-white hover:bg-pink-600"
                    >
                      신청됨 ✕
                    </button>
                  </form>
                ) : (
                  <div
                    title="당일·전날에는 취소할 수 없어요"
                    className="mt-0.5 rounded bg-pink-100 py-0.5 text-[10px] font-medium text-pink-600"
                  >
                    신청됨 🔒
                  </div>
                )
              ) : past ? (
                <div className="mt-0.5 rounded bg-neutral-100 py-0.5 text-[10px] text-neutral-300">
                  종료
                </div>
              ) : full ? (
                <div className="mt-0.5 rounded bg-neutral-100 py-0.5 text-[10px] text-neutral-400">
                  마감
                </div>
              ) : (
                <form action={bookAction}>
                  <input type="hidden" name="slotId" value={slot.id} />
                  <input type="hidden" name="memberId" value={member.id} />
                  <input type="hidden" name="date" value={date} />
                  <button className="mt-0.5 w-full rounded bg-emerald-700 py-0.5 text-[10px] font-medium text-white hover:bg-emerald-800">
                    신청
                  </button>
                </form>
              )}
            </div>
          );
        }}
      />
      <p className="mt-3 text-center text-xs text-neutral-400">
        신청 시 잔여 1회 차감 · 핑크 &lsquo;신청됨 ✕&rsquo; 누르면 취소(당일·전날 불가)
      </p>
    </main>
  );
}
