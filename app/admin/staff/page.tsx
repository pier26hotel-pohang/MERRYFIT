import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import {
  addInstructorAction,
  setRatesAction,
  setStaffPasswordAction,
  setStaffActiveAction,
} from "@/lib/actions";
import * as staff from "@/lib/staff";

export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm";
const input = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm";

export default async function AdminStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; ok?: string }>;
}) {
  if (!(await isAdmin())) redirect("/login?e=admin");
  const { e, ok } = await searchParams;

  const people = await staff.listInstructors(true);
  const rates = await Promise.all(people.map((p) => staff.getRates(p.id)));

  return (
    <main className="pb-16 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">강사 관리</h1>
          <p className="text-sm text-neutral-500">계정 · 수업 단가</p>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link href="/admin" className="text-neutral-500">관리자</Link>
          <Link href="/admin/payroll" className="text-emerald-700">급여 정산</Link>
        </nav>
      </header>

      {e === "dup" && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          이미 쓰고 있는 로그인 아이디입니다. 다른 아이디로 만들어 주세요.
        </p>
      )}
      {e === "input" && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          이름 · 아이디는 필수이고, 비밀번호는 4자 이상이어야 합니다.
        </p>
      )}
      {ok && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {ok === "pw" ? "비밀번호를 변경했습니다." : "강사 계정을 만들었습니다."}
        </p>
      )}

      {/* 강사 추가 */}
      <section className={`${card} mb-4`}>
        <h2 className="mb-3 font-semibold">강사 계정 만들기</h2>
        <form action={addInstructorAction} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input name="name" placeholder="이름" className={input} required />
            <input name="phone" placeholder="연락처" className={input} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input name="loginId" placeholder="로그인 아이디 (영문·숫자)" className={input} required />
            <input name="password" type="text" placeholder="초기 비밀번호 (4자 이상)" className={input} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select name="branch" className={input} defaultValue="1호점">
              <option>1호점</option>
              <option>2호점</option>
            </select>
            <select name="role" className={input} defaultValue="instructor">
              <option value="instructor">강사</option>
              <option value="admin">관리자</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input name="bank" placeholder="은행 (급여 이체용)" className={input} />
            <input name="account" placeholder="계좌번호" className={input} />
          </div>
          <button className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
            계정 만들기
          </button>
          <p className="text-xs text-neutral-400">
            초기 비밀번호는 이 화면에서만 보입니다. 저장 후에는 다시 볼 수 없으니 선생님께 바로 전달하세요.
          </p>
        </form>
      </section>

      {/* 강사별 단가 */}
      {people.map((p, i) => (
        <section key={p.id} className={`${card} mb-3`}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                {p.name}
                {p.role === "admin" && (
                  <span className="ml-1.5 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">관리자</span>
                )}
                {!p.active && (
                  <span className="ml-1.5 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">비활성</span>
                )}
              </h3>
              <p className="text-xs text-neutral-400">
                {p.loginId} · {p.branch ?? "지점 미지정"}
                {p.bank && ` · ${p.bank} ${p.account ?? ""}`}
              </p>
            </div>
            <form action={setStaffActiveAction}>
              <input type="hidden" name="instructorId" value={p.id} />
              <input type="hidden" name="active" value={p.active ? "0" : "1"} />
              <button className="text-xs text-neutral-400 hover:text-neutral-700">
                {p.active ? "비활성화" : "활성화"}
              </button>
            </form>
          </div>

          <form action={setRatesAction} className="mb-2">
            <input type="hidden" name="instructorId" value={p.id} />
            <div className="grid grid-cols-3 gap-2">
              {staff.RATE_KINDS.map(({ kind, label }) => (
                <label key={kind} className="block">
                  <span className="mb-0.5 block text-xs text-neutral-500">{label}</span>
                  <input
                    name={kind}
                    type="number"
                    step="500"
                    defaultValue={rates[i][kind]}
                    className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
            </div>
            <button className="mt-2 w-full rounded-lg bg-neutral-800 py-2 text-sm font-semibold text-white">
              단가 저장
            </button>
          </form>

          <form action={setStaffPasswordAction} className="flex gap-2">
            <input type="hidden" name="instructorId" value={p.id} />
            <input name="password" placeholder="비밀번호 재설정 (4자 이상)" className={input} />
            <button className="whitespace-nowrap rounded-lg border border-neutral-300 px-3 text-sm">변경</button>
          </form>
        </section>
      ))}

      {people.length === 0 && (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          아직 등록된 강사가 없습니다. 위에서 계정을 만들어 주세요.
        </p>
      )}
    </main>
  );
}
