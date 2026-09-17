import Link from "next/link";
import { redirect } from "next/navigation";
import { currentStaffId } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import * as store from "@/lib/store";
import * as staff from "@/lib/staff";

export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm";

function won(n: number) {
  return n.toLocaleString() + "원";
}

function monthLabel(m: string) {
  const [y, mm] = m.split("-");
  return `${y}년 ${Number(mm)}월`;
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const staffId = await currentStaffId();
  if (!staffId) redirect("/login?e=staff");

  const me = await staff.getInstructor(staffId);
  if (!me) redirect("/login?e=staff");

  const { m } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : staff.thisMonth();

  const [db, rates, slotMap] = await Promise.all([
    store.loadSnapshot(),
    staff.getRates(me.id),
    staff.slotInstructorMap(),
  ]);
  const pay = staff.computePayroll(db, me, month, rates, slotMap);
  const months = staff.recentMonths(12);

  return (
    <main className="pb-16 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{me.name} 선생님</h1>
          <p className="text-sm text-neutral-500">
            내 수업 · 급여 {me.role === "admin" && <span className="text-emerald-700">· 관리자</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {me.role === "admin" && (
            <Link href="/admin" className="text-sm text-emerald-700">
              관리자
            </Link>
          )}
          <form action={logoutAction}>
            <button className="text-sm text-neutral-400 hover:text-neutral-600">로그아웃</button>
          </form>
        </div>
      </header>

      {/* 월 선택 */}
      <form className="mb-4 flex items-center gap-2">
        <select
          name="m"
          defaultValue={month}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          {months.map((mm) => (
            <option key={mm} value={mm}>
              {monthLabel(mm)}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-neutral-800 px-3 py-2 text-sm font-semibold text-white">보기</button>
      </form>

      {/* 요약 */}
      <section className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-emerald-700 p-4 text-white">
          <div className="text-xs text-emerald-100">{monthLabel(month)} 수업</div>
          <div className="text-2xl font-extrabold">{pay.lessonCount}회</div>
        </div>
        <div className="rounded-2xl bg-neutral-900 p-4 text-white">
          <div className="text-xs text-neutral-300">실지급액</div>
          <div className="text-2xl font-extrabold">{won(pay.net)}</div>
        </div>
      </section>

      {/* 정산 내역 */}
      <section className={`${card} mb-4`}>
        <h2 className="mb-3 font-semibold">정산</h2>
        <table className="w-full text-sm">
          <tbody>
            {pay.byKind.map((r) => (
              <tr key={r.kind} className="border-b border-neutral-100">
                <td className="py-1.5 text-neutral-500">{r.label}</td>
                <td className="py-1.5 text-right text-neutral-500">
                  {r.count}회 × {won(r.rate)}
                </td>
                <td className="py-1.5 text-right font-medium">{won(r.amount)}</td>
              </tr>
            ))}
            {pay.byKind.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-neutral-400">
                  이 달에 집계된 수업이 없습니다.
                </td>
              </tr>
            )}
            <tr className="border-b border-neutral-200">
              <td className="py-2 font-semibold" colSpan={2}>
                총 지급액
              </td>
              <td className="py-2 text-right font-bold">{won(pay.gross)}</td>
            </tr>
            <tr>
              <td className="py-1.5 text-neutral-500" colSpan={2}>
                소득세 3%
              </td>
              <td className="py-1.5 text-right text-neutral-500">-{won(pay.incomeTax)}</td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="py-1.5 text-neutral-500" colSpan={2}>
                지방소득세 0.3%
              </td>
              <td className="py-1.5 text-right text-neutral-500">-{won(pay.localTax)}</td>
            </tr>
            <tr>
              <td className="py-2 font-semibold text-emerald-800" colSpan={2}>
                실지급액
              </td>
              <td className="py-2 text-right text-lg font-extrabold text-emerald-800">{won(pay.net)}</td>
            </tr>
          </tbody>
        </table>
        {pay.emptyCount > 0 && (
          <p className="mt-3 text-xs text-neutral-400">
            예약이 없어 진행되지 않은 회차 {pay.emptyCount}건은 집계에서 제외했습니다.
          </p>
        )}
        {me.bank && (
          <p className="mt-2 text-xs text-neutral-400">
            입금 계좌: {me.bank} {me.account}
          </p>
        )}
      </section>

      {/* 수업 목록 */}
      <section className={card}>
        <h2 className="mb-3 font-semibold">수업 내역</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                <th className="py-1.5 text-left">날짜</th>
                <th className="py-1.5 text-left">시간</th>
                <th className="py-1.5 text-left">수업</th>
                <th className="py-1.5 text-right">인원</th>
                <th className="py-1.5 text-right">금액</th>
              </tr>
            </thead>
            <tbody>
              {pay.lessons.map((l, i) => (
                <tr key={`${l.date}-${l.time}-${i}`} className="border-b border-neutral-100">
                  <td className="py-1.5">{l.date.slice(5).replace("-", "/")}</td>
                  <td className="py-1.5">{l.time}</td>
                  <td className="py-1.5 text-neutral-600">
                    {l.program}
                    <span className="ml-1 text-xs text-neutral-400">{l.branch}</span>
                  </td>
                  <td className="py-1.5 text-right">
                    {l.headcount}명
                    {l.attended < l.headcount && (
                      <span className="ml-1 text-xs text-amber-600">(출석 {l.attended})</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right">{won(l.amount)}</td>
                </tr>
              ))}
              {pay.lessons.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-neutral-400">
                    수업 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-neutral-400">
          수업은 시간표에 배정된 담당 강사 기준으로 집계됩니다. 빠진 수업이 있으면 센터에 알려주세요.
        </p>
      </section>
    </main>
  );
}
