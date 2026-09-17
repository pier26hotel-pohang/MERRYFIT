import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import * as store from "@/lib/store";
import * as staff from "@/lib/staff";

export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm";

function won(n: number) {
  return n.toLocaleString();
}

function monthLabel(m: string) {
  const [y, mm] = m.split("-");
  return `${y}년 ${Number(mm)}월`;
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  if (!(await isAdmin())) redirect("/login?e=admin");

  const { m } = await searchParams;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : staff.thisMonth();

  const [db, people, slotMap] = await Promise.all([
    store.loadSnapshot(),
    staff.listInstructors(true),
    staff.slotInstructorMap(),
  ]);

  const rows = await Promise.all(
    people.map(async (p) => staff.computePayroll(db, p, month, await staff.getRates(p.id), slotMap))
  );
  const shown = rows.filter((r) => r.lessonCount > 0 || r.instructor.active);

  const total = shown.reduce(
    (acc, r) => ({
      lessons: acc.lessons + r.lessonCount,
      gross: acc.gross + r.gross,
      tax: acc.tax + r.incomeTax + r.localTax,
      net: acc.net + r.net,
    }),
    { lessons: 0, gross: 0, tax: 0, net: 0 }
  );

  // 강사가 배정되지 않은 슬롯 — 이게 남아 있으면 급여가 실제보다 적게 잡힌다.
  const unassigned = db.slots.filter((s) => !slotMap.get(s.id)).length;

  return (
    <main className="pb-16 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">급여 정산</h1>
          <p className="text-sm text-neutral-500">{monthLabel(month)} · 프리랜서 3.3% 원천징수</p>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link href="/admin" className="text-neutral-500">관리자</Link>
          <Link href="/admin/staff" className="text-emerald-700">강사 관리</Link>
        </nav>
      </header>

      <form className="mb-4 flex items-center gap-2">
        <select name="m" defaultValue={month} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
          {staff.recentMonths(12).map((mm) => (
            <option key={mm} value={mm}>
              {monthLabel(mm)}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-neutral-800 px-3 py-2 text-sm font-semibold text-white">보기</button>
      </form>

      {unassigned > 0 && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          담당 강사가 지정되지 않은 수업이 <b>{unassigned}개</b> 있습니다. 관리자 &gt; 시간표에서 배정해야 급여에 잡힙니다.
        </p>
      )}

      <section className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-neutral-900 p-4 text-white">
          <div className="text-xs text-neutral-300">총 수업</div>
          <div className="text-xl font-extrabold">{total.lessons}회</div>
        </div>
        <div className="rounded-2xl bg-emerald-700 p-4 text-white">
          <div className="text-xs text-emerald-100">지급 총액</div>
          <div className="text-xl font-extrabold">{won(total.gross)}</div>
        </div>
        <div className="rounded-2xl bg-neutral-700 p-4 text-white">
          <div className="text-xs text-neutral-300">실지급 합계</div>
          <div className="text-xl font-extrabold">{won(total.net)}</div>
        </div>
      </section>

      <section className={card}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                <th className="py-2 text-left">강사</th>
                <th className="py-2 text-right">수업</th>
                <th className="py-2 text-right">지급액</th>
                <th className="py-2 text-right">소득세 3%</th>
                <th className="py-2 text-right">지방세 0.3%</th>
                <th className="py-2 text-right">실지급액</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.instructor.id} className="border-b border-neutral-100">
                  <td className="py-2">
                    {r.instructor.name}
                    {!r.instructor.active && <span className="ml-1 text-xs text-neutral-400">(비활성)</span>}
                    {r.instructor.bank && (
                      <div className="text-xs text-neutral-400">
                        {r.instructor.bank} {r.instructor.account}
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-right">{r.lessonCount}</td>
                  <td className="py-2 text-right">{won(r.gross)}</td>
                  <td className="py-2 text-right text-neutral-500">{won(r.incomeTax)}</td>
                  <td className="py-2 text-right text-neutral-500">{won(r.localTax)}</td>
                  <td className="py-2 text-right font-semibold">{won(r.net)}</td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-neutral-400">
                    등록된 강사가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-300 font-bold">
                <td className="py-2">합계</td>
                <td className="py-2 text-right">{total.lessons}</td>
                <td className="py-2 text-right">{won(total.gross)}</td>
                <td className="py-2 text-right" colSpan={2}>
                  {won(total.tax)}
                </td>
                <td className="py-2 text-right">{won(total.net)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 text-xs text-neutral-400">
          수업 수는 시간표에 배정된 담당 강사와 그 회차의 실제 예약 인원으로 계산합니다. 예약이 0명인 회차는 제외합니다.
          세액은 10원 미만을 버립니다.
        </p>
      </section>
    </main>
  );
}
