import Link from "next/link";
import Image from "next/image";
import { signupAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

const inputCls = "w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  return (
    <main className="pt-10">
      <Link href="/login" className="text-sm text-neutral-500">← 로그인</Link>
      <header className="mb-6 mt-3 flex flex-col items-center text-center">
        <Image src="/logo.png" alt="메리핏" width={52} height={52} />
        <h1 className="mt-2 text-xl font-extrabold tracking-tight">회원가입</h1>
        <p className="mt-1 text-sm text-neutral-500">메리핏에 오신 걸 환영해요 :)</p>
      </header>

      {e === "dup" && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
          이미 가입된 연락처예요. 로그인해주세요.
        </p>
      )}
      {e === "save" && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
          저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      {e === "pw" && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
          비밀번호는 4자 이상이어야 합니다.
        </p>
      )}
      {e === "1" && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
          이름과 연락처는 필수입니다.
        </p>
      )}

      <form action={signupAction} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">이름 *</label>
          <input name="name" placeholder="이름" className={inputCls} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">연락처 *</label>
          <input name="phone" type="tel" placeholder="010-1234-5678" className={inputCls} required />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">비밀번호 *</label>
          <input name="password" type="password" placeholder="4자 이상" className={inputCls}
            autoComplete="new-password" minLength={4} required />
          <p className="mt-1 text-xs text-neutral-400">다음에 연락처와 이 비밀번호로 로그인합니다.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">생년월일</label>
          <input name="birthdate" type="date" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">주소</label>
          <input name="address" placeholder="주소" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">지점</label>
          <select name="branch" className={inputCls} defaultValue="2호점">
            <option>1호점</option>
            <option>2호점</option>
          </select>
        </div>
        <button className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
          가입하고 시작하기
        </button>
      </form>
      <p className="mt-3 text-center text-xs text-neutral-400">
        가입하시면 <b className="text-emerald-700">체험 1회권</b>이 바로 들어갑니다. 가입일과 메모는 센터(관리자)에서 관리됩니다.
      </p>
    </main>
  );
}
