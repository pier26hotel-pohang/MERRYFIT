import Link from "next/link";
import { notFound } from "next/navigation";
import {
  loadSnapshot,
  getMember,
  slotReservations,
  occurrenceDate,
  todayISO,
  DOW_LABEL,
  isConsultSlot,
  isClosedSlot,
} from "@/lib/store";
import { BRANCH_LABEL, Branch } from "@/lib/types";
import { programInfo } from "@/lib/programs";
import { deleteSlotAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

// 앞으로 몇 회차까지 보여줄지 (매주 반복 수업)
const AHEAD = 4;

export default async function SlotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ d?: string; confirm?: string }>;
}) {
  const { id } = await params;
  const { d, confirm } = await searchParams;

  const db = await loadSnapshot();
  const slot = db.slots.find((s) => s.id === id);
  if (!slot) notFound();

  // 1회성은 그 날짜 하나뿐이고, 매주 반복은 앞으로 몇 주를 고를 수 있다.
  const dates = slot.date
    ? [slot.date]
    : Array.from({ length: AHEAD }, (_, w) => occurrenceDate(slot.dayOfWeek, w));
  const date = d && dates.includes(d) ? d : dates[0];

  const rows = slotReservations(db, slot.id, date);
  const info = programInfo(slot.program);
  const closed = isClosedSlot(slot.capacity);
  const consult = isConsultSlot(slot.program);

  // 이 수업에 걸린 예약 전체 — 지우면 같이 사라지는 것들이다.
  const allBooked = db.reservations.filter(
    (r) => r.slotId === slot.id && r.status !== "cancelled"
  );
  const future = allBooked.filter((r) => r.date >= todayISO());

  const card = "rounded-2xl border border-neutral-200 bg-white p-4";

  return (
    <main className="mx-auto max-w-lg pt-8">
      <Link href={`/admin?b=${slot.branch}`} className="text-sm text-neutral-500">
        ← 관리자
      </Link>

      <header className="mt-3 mb-4">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-bold"
            style={{ background: info.bg, color: info.fg }}
          >
            {slot.program}
          </span>
          <span className="text-xs text-neutral-400">
            {BRANCH_LABEL[slot.branch as Branch] ?? slot.branch}
          </span>
          {slot.date && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              1회성
            </span>
          )}
          {closed && (
            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
              휴무
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          {DOW_LABEL[slot.dayOfWeek]}요일 {slot.time}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {slot.date ? `${slot.date} 하루만` : "매주 반복"} · 정원 {slot.capacity}명
          {consult && " · 수강권 차감 없음"}
        </p>
      </header>

      {/* 회차 고르기 */}
      {dates.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {dates.map((x) => (
            <Link
              key={x}
              href={`/admin/slot/${slot.id}?d=${x}`}
              className={`rounded-full px-3 py-1 text-sm ${
                x === date ? "bg-emerald-700 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {x.slice(5).replace("-", "/")}
            </Link>
          ))}
        </div>
      )}

      {/* 신청자 */}
      <section className={`${card} mb-4`}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">
            {consult ? "상담 신청자" : "신청자"}
            <span className="ml-1.5 text-sm font-normal text-neutral-400">
              {rows.length}/{slot.capacity}
            </span>
          </h2>
          <span className="text-xs text-neutral-400">{date}</span>
        </div>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">아직 신청자가 없습니다.</p>
        ) : (
          <ol className="divide-y divide-neutral-100">
            {rows.map((r, i) => {
              const m = getMember(db, r.memberId);
              return (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 shrink-0 text-xs text-neutral-300">{i + 1}</span>
                  <div className="flex-1">
                    <Link
                      href={`/admin/member/${r.memberId}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {m?.name ?? "알 수 없음"}
                    </Link>
                    <span className="ml-2 text-xs text-neutral-400">{m?.phone}</span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      r.status === "attended"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {r.status === "attended" ? "출석" : "예약"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* 삭제 — 두 번 눌러야 지워진다 */}
      <section className={card}>
        <h2 className="font-semibold text-neutral-700">수업 삭제</h2>
        {confirm !== "1" ? (
          <>
            <p className="mt-1 text-sm leading-relaxed text-neutral-500">
              {slot.date
                ? "이 날 하루만 사라집니다."
                : "매주 반복이라 앞으로의 모든 회차가 사라집니다."}
              {future.length > 0 && (
                <>
                  {" "}
                  <b className="text-red-600">
                    아직 오지 않은 예약 {future.length}건도 함께 지워집니다.
                  </b>{" "}
                  그분들에게는 알림이 가지 않습니다.
                </>
              )}
            </p>
            <Link
              href={`/admin/slot/${slot.id}?d=${date}&confirm=1`}
              className="mt-3 inline-block rounded-xl border border-red-300 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              삭제하기
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm font-medium text-red-600">
              정말 지울까요? 되돌릴 수 없습니다.
            </p>
            <div className="mt-3 flex gap-2">
              <form action={deleteSlotAction}>
                <input type="hidden" name="slotId" value={slot.id} />
                <input type="hidden" name="branch" value={slot.branch} />
                <button className="rounded-xl bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700">
                  네, 지웁니다
                </button>
              </form>
              <Link
                href={`/admin/slot/${slot.id}?d=${date}`}
                className="rounded-xl border border-neutral-300 px-3.5 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
              >
                취소
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
