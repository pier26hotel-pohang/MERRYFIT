import Link from "next/link";
import {
  getDB,
  listMembers,
  memberRemaining,
  distinctTimes,
  slotForCell,
  slotBookedCount,
  occurrenceDate,
  listOneTimeSlots,
  DOW_LABEL,
} from "@/lib/store";
import { Branch } from "@/lib/types";
import {
  addMemberAction,
  issuePassAction,
  deleteSlotAction,
  setMemoAction,
} from "@/lib/actions";
import { WeeklyGrid, programAbbrev } from "@/components/WeeklyGrid";
import { AddClassForm } from "@/components/AddClassForm";

export const dynamic = "force-dynamic";

const inputCls = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm";
const btnCls = "w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800";
const cardCls = "rounded-2xl border border-neutral-200 bg-white p-4";

function scopeLabel(scope: string) {
  return scope === "both" ? "공용" : scope;
}
function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}(${DOW_LABEL[d.getDay()]})`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string }>;
}) {
  const { b } = await searchParams;
  const branch: Branch = b === "2호점" ? "2호점" : "1호점";
  const db = getDB();
  const members = listMembers();
  const times = distinctTimes(branch);
  const oneTimes = listOneTimeSlots().filter((s) => s.branch === branch);

  return (
    <main className="pt-8">
      <Link href="/" className="text-sm text-neutral-500">← 홈</Link>
      <h1 className="mt-3 mb-1 text-2xl font-bold text-emerald-800">관리자</h1>
      <p className="mb-5 text-sm text-neutral-500">
        회원 {members.length} · 수업 슬롯 {db.slots.length}
      </p>

      {/* 지점 전환 */}
      <div className="mb-3 flex gap-2">
        {(["1호점", "2호점"] as Branch[]).map((bb) => (
          <Link
            key={bb}
            href={`/admin?b=${bb}`}
            className={`rounded-full px-4 py-1.5 text-sm ${
              branch === bb ? "bg-emerald-700 text-white" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {bb}
          </Link>
        ))}
      </div>

      {/* 시간표 편집 */}
      <section className="mb-4">
        <h2 className="mb-2 font-semibold">{branch} 시간표 <span className="text-xs font-normal text-neutral-400">(매주 반복 · 이번 주 기준)</span></h2>
        <WeeklyGrid
          times={times}
          cell={(dow, time) => {
            const date = occurrenceDate(dow);
            const slot = slotForCell(branch, dow, time, date);
            if (!slot) return null;
            const count = slotBookedCount(slot.id, date);
            return (
              <div className={`relative rounded-md border px-1 py-1 ${slot.date ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white"}`}>
                <form action={deleteSlotAction} className="absolute right-0 top-0">
                  <input type="hidden" name="slotId" value={slot.id} />
                  <button className="px-1 text-[10px] text-red-400 hover:text-red-600">×</button>
                </form>
                <div className="text-[11px] font-semibold text-neutral-800">
                  {programAbbrev(slot.program)}
                </div>
                <div className="text-[10px] text-neutral-500">{count}/{slot.capacity}</div>
              </div>
            );
          }}
        />
        <p className="mt-1 text-xs text-neutral-400">노란 칸 = 1회성 수업</p>
      </section>

      {/* 수업 추가 (매주 반복 / 1회성) */}
      <section className={`${cardCls} mb-4`}>
        <h2 className="mb-3 font-semibold">수업 추가</h2>
        <AddClassForm branch={branch} />
      </section>

      {/* 1회성 수업 목록 */}
      {oneTimes.length > 0 && (
        <section className={`${cardCls} mb-4`}>
          <h2 className="mb-3 font-semibold">1회성 수업 ({branch})</h2>
          <div className="space-y-1 text-sm">
            {oneTimes.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-neutral-100 py-1.5 last:border-0">
                <span>{fmtDate(s.date!)} {s.time} · {s.program}</span>
                <form action={deleteSlotAction}>
                  <input type="hidden" name="slotId" value={s.id} />
                  <button className="text-xs text-red-500 hover:underline">삭제</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 회원 추가 */}
      <section className={`${cardCls} mb-4`}>
        <h2 className="mb-3 font-semibold">회원 추가</h2>
        <form action={addMemberAction} className="space-y-2">
          <input name="name" placeholder="이름" className={inputCls} required />
          <input name="phone" placeholder="연락처" className={inputCls} />
          <select name="branch" className={inputCls} defaultValue="1호점">
            <option>1호점</option>
            <option>2호점</option>
          </select>
          <button className={btnCls}>회원 추가</button>
        </form>
      </section>

      {/* 수강권 발급 (지점 범위 선택) */}
      <section className={`${cardCls} mb-4`}>
        <h2 className="mb-3 font-semibold">수강권 발급</h2>
        <form action={issuePassAction} className="space-y-2">
          <select name="memberId" className={inputCls}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <input name="type" placeholder="예: 자유수강권 20회" className={inputCls} required />
          <div className="flex gap-2">
            <input type="number" name="total" placeholder="총 횟수" className={inputCls} required min={1} />
            <select name="scope" className={inputCls} defaultValue="both">
              <option value="both">두 지점 공용</option>
              <option value="1호점">1호점 전용</option>
              <option value="2호점">2호점 전용</option>
            </select>
          </div>
          <button className={btnCls}>수강권 발급</button>
        </form>
      </section>

      {/* 회원 목록 + 메모 */}
      <section className={cardCls}>
        <h2 className="mb-3 font-semibold">회원 목록 & 메모</h2>
        <div className="space-y-4">
          {members.map((m) => {
            const passes = db.passes.filter((p) => p.memberId === m.id);
            return (
              <div key={m.id} className="border-b border-neutral-100 pb-4 last:border-0">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{m.name} <span className="text-neutral-400">· {m.branch}</span></span>
                  <span className="text-neutral-500">잔여 {memberRemaining(m.id)}회 · {m.points.toLocaleString()}P</span>
                </div>
                {passes.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {passes.map((p) => (
                      <span key={p.id} className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                        {p.type} ({scopeLabel(p.scope)}) {p.remaining}/{p.total}
                      </span>
                    ))}
                  </div>
                )}
                <form action={setMemoAction} className="mt-2 flex gap-2">
                  <input type="hidden" name="memberId" value={m.id} />
                  <input
                    name="memo"
                    defaultValue={m.memo ?? ""}
                    placeholder="회원 메모 (예: 통증 이력, 선호 시간)"
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
                  />
                  <button className="rounded-lg bg-neutral-700 px-3 py-1.5 text-sm text-white hover:bg-neutral-800">
                    저장
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
