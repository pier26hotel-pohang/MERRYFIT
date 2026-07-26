import Link from "next/link";
import Image from "next/image";
import {
  distinctTimes,
  slotForCell,
  slotBookedCount,
  occurrenceDate,
  weekRangeLabel,
} from "@/lib/store";
import { Branch } from "@/lib/types";
import { WeeklyGrid, programAbbrev } from "@/components/WeeklyGrid";

export const dynamic = "force-dynamic";

// 카페24 등 외부에 임베드하는 공개 읽기전용 시간표
export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string; w?: string }>;
}) {
  const { b, w } = await searchParams;
  const branch: Branch = b === "2호점" ? "2호점" : "1호점";
  const weekOffset = w === "1" ? 1 : 0;
  const times = distinctTimes(branch);
  const link = (bb: Branch, wo: number) => `/timetable?b=${bb}&w=${wo}`;

  return (
    <main className="pt-6">
      <header className="mb-4 flex items-center gap-2">
        <Image src="/logo.png" alt="메리핏" width={28} height={28} />
        <span className="text-lg font-extrabold tracking-tight">MERRY FIT</span>
        <span className="text-sm font-medium text-neutral-500">주간 시간표</span>
      </header>

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
          return (
            <div className={`rounded-md border px-1 py-1 ${slot.date ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white"}`}>
              <div className="text-[11px] font-semibold leading-tight text-neutral-800">
                {programAbbrev(slot.program)}
              </div>
              <div className={`text-[10px] ${full ? "font-medium text-red-500" : "text-neutral-500"}`}>
                {full ? "마감" : `${count}/${slot.capacity}`}
              </div>
            </div>
          );
        }}
      />
      <p className="mt-3 text-center text-xs text-neutral-400">
        메리핏 필라테스 · 예약은 회원 앱에서
      </p>
    </main>
  );
}
