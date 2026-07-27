import Link from "next/link";
import {
  loadSnapshot,
  getMember,
  memberPasses,
  memberRemaining,
  attendedCount,
  upcomingReservations,
  reservationsWithSlot,
  DOW_LABEL,
} from "@/lib/store";
import { setMemoAction, issuePassAction } from "@/lib/actions";
import { CancelButton } from "@/components/CancelButton";

export const dynamic = "force-dynamic";

function fmtD(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}(${DOW_LABEL[d.getDay()]})`;
}
function scopeLabel(s: string) {
  return s === "both" ? "공용" : s;
}
const inputCls = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm";
const cardCls = "rounded-2xl border border-neutral-200 bg-white p-4";

export default async function MemberDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await loadSnapshot();
  const member = getMember(db, id);
  if (!member) {
    return (
      <main className="pt-8">
        <Link href="/admin" className="text-sm text-neutral-500">← 관리자</Link>
        <p className="mt-4">회원을 찾을 수 없습니다.</p>
      </main>
    );
  }
  const passes = memberPasses(db, id);
  const upcoming = upcomingReservations(db, id);
  const attended = reservationsWithSlot(db, id)
    .filter((x) => x.r.status === "attended")
    .sort((a, b) => (b.r.date + b.slot.time).localeCompare(a.r.date + a.slot.time));

  return (
    <main className="pt-8">
      <Link href="/admin" className="text-sm text-neutral-500">← 관리자</Link>

      {/* 요약 */}
      <section className="mt-3 mb-4 rounded-2xl bg-emerald-800 p-5 text-white">
        <div className="text-lg font-bold">{member.name}</div>
        <div className="text-sm text-emerald-100">{member.branch} · {member.phone || "연락처 없음"}</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-emerald-700/60 py-2">
            <div className="text-xs text-emerald-100">적립금</div>
            <div className="font-bold">{member.points.toLocaleString()}원</div>
          </div>
          <div className="rounded-xl bg-emerald-700/60 py-2">
            <div className="text-xs text-emerald-100">잔여</div>
            <div className="font-bold">{memberRemaining(db, id)}회</div>
          </div>
          <div className="rounded-xl bg-emerald-700/60 py-2">
            <div className="text-xs text-emerald-100">누적 출석</div>
            <div className="font-bold">{attendedCount(db, id)}회</div>
          </div>
        </div>
      </section>

      {/* 메모 */}
      <section className={`${cardCls} mb-4`}>
        <h2 className="mb-2 font-semibold">메모</h2>
        <form action={setMemoAction} className="flex gap-2">
          <input type="hidden" name="memberId" value={member.id} />
          <input name="memo" defaultValue={member.memo ?? ""} placeholder="통증 이력·선호 시간 등" className={inputCls} />
          <button className="rounded-lg bg-neutral-700 px-3 py-2 text-sm text-white hover:bg-neutral-800">저장</button>
        </form>
      </section>

      {/* 수강권 */}
      <section className={`${cardCls} mb-4`}>
        <h2 className="mb-2 font-semibold">수강권</h2>
        {passes.length === 0 ? (
          <p className="text-sm text-neutral-400">없음</p>
        ) : (
          <div className="mb-3 space-y-1 text-sm">
            {passes.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>{p.type} <span className="text-neutral-400">({scopeLabel(p.scope)})</span></span>
                <span className="text-neutral-500">{p.remaining}/{p.total}</span>
              </div>
            ))}
          </div>
        )}
        <form action={issuePassAction} className="space-y-2 border-t border-neutral-100 pt-3">
          <input type="hidden" name="memberId" value={member.id} />
          <div className="text-xs text-neutral-500">수강권 추가 발급</div>
          <input name="type" placeholder="예: 자유수강권 20회" className={inputCls} required />
          <div className="flex gap-2">
            <input type="number" name="total" placeholder="총 횟수" className={inputCls} required min={1} />
            <select name="scope" className={inputCls} defaultValue="both">
              <option value="both">두 지점 공용</option>
              <option value="1호점">1호점 전용</option>
              <option value="2호점">2호점 전용</option>
            </select>
          </div>
          <button className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">발급</button>
        </form>
      </section>

      {/* 다가오는 예약 */}
      <section className={`${cardCls} mb-4`}>
        <h2 className="mb-2 font-semibold">다가오는 예약 ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-neutral-400">없음</p>
        ) : (
          <div className="space-y-1.5 text-sm">
            {upcoming.map(({ r, slot }) => (
              <div key={r.id} className="flex items-center justify-between">
                <span>{fmtD(r.date)} {slot.time} · {slot.program} <span className="text-neutral-400">{slot.branch}</span></span>
                <CancelButton
                  reservationId={r.id}
                  confirmText={`${member.name}님의 ${fmtD(r.date)} ${slot.time} 예약을 취소할까요?`}
                  className="rounded px-2 py-0.5 text-xs font-medium text-pink-600 hover:bg-pink-50"
                >
                  취소
                </CancelButton>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 출석 이력 */}
      <section className={cardCls}>
        <h2 className="mb-2 font-semibold">출석 이력 ({attended.length})</h2>
        {attended.length === 0 ? (
          <p className="text-sm text-neutral-400">없음</p>
        ) : (
          <div className="space-y-1 text-sm text-neutral-600">
            {attended.slice(0, 20).map(({ r, slot }) => (
              <div key={r.id} className="flex justify-between border-b border-neutral-100 py-1 last:border-0">
                <span>{fmtD(r.date)} {slot.time} · {slot.program}</span>
                <span className="text-emerald-600">출석</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
