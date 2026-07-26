import Link from "next/link";
import { getDB, getMember, todayISO, DOW_LABEL } from "@/lib/store";
import { checkInAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default function CheckinPage() {
  const db = getDB();
  const today = todayISO();
  const todayDow = new Date().getDay();
  const slots = db.slots
    .filter((s) => s.dayOfWeek === todayDow)
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <main className="pt-8">
      <Link href="/" className="text-sm text-neutral-500">← 홈</Link>
      <h1 className="mt-3 mb-1 text-2xl font-bold text-emerald-800">출석 체크인</h1>
      <p className="mb-6 text-sm text-neutral-500">
        오늘 ({DOW_LABEL[todayDow]}요일) 수업 · 출석 시 수강권 1회 차감 + 5,000원 적립
      </p>

      {slots.length === 0 && <p className="text-neutral-500">오늘 열리는 수업이 없습니다.</p>}

      <div className="space-y-5">
        {slots.map((s) => {
          const rsvs = db.reservations.filter(
            (r) => r.slotId === s.id && r.date === today && r.status !== "cancelled"
          );
          return (
            <section key={s.id}>
              <h2 className="mb-2 text-sm font-semibold text-neutral-700">
                {s.time} · {s.program}{" "}
                <span className="font-normal text-neutral-400">
                  ({rsvs.length}/{s.capacity}) · {s.branch}
                </span>
              </h2>
              {rsvs.length === 0 ? (
                <p className="pl-1 text-sm text-neutral-400">예약자 없음</p>
              ) : (
                <div className="space-y-2">
                  {rsvs.map((r) => {
                    const mem = getMember(r.memberId);
                    return (
                      <div key={r.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3">
                        <span className="font-medium">{mem?.name ?? "?"}</span>
                        {r.status === "attended" ? (
                          <span className="rounded-lg bg-emerald-100 px-3 py-1 text-sm text-emerald-700">출석완료</span>
                        ) : (
                          <form action={checkInAction}>
                            <input type="hidden" name="reservationId" value={r.id} />
                            <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">출석</button>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
