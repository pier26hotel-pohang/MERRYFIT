import Link from "next/link";
import Image from "next/image";
import { memberPhoneLoginAction, adminLoginAction } from "@/lib/actions";
import { KakaoButton } from "@/components/KakaoButton";

export const dynamic = "force-dynamic";

const inputCls = "w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;

  return (
    <main className="pt-12">
      <header className="mb-8 flex flex-col items-center text-center">
        <Image src="/logo.png" alt="메리핏" width={60} height={60} priority />
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">MERRY FIT</h1>
        <p className="mt-1 text-sm text-neutral-500">모든 날, 모든 순간을 즐겁게</p>
      </header>

      {e === "member" && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
          등록된 연락처를 찾을 수 없어요. 회원가입 해주세요.
        </p>
      )}
      {e === "admin" && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
          관리자 아이디/비밀번호가 올바르지 않습니다.
        </p>
      )}

      {/* 회원 로그인 */}
      <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">회원 로그인</h2>
        <KakaoButton />
        <div className="my-3 flex items-center gap-2 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" /> 또는 연락처로 <span className="h-px flex-1 bg-neutral-200" />
        </div>
        <form action={memberPhoneLoginAction} className="space-y-2">
          <input name="phone" type="tel" placeholder="연락처 (예: 010-1234-5678)" className={inputCls} required />
          <button className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
            연락처로 로그인
          </button>
        </form>
        <p className="mt-3 text-center text-sm text-neutral-500">
          처음이신가요?{" "}
          <Link href="/signup" className="font-semibold text-emerald-700 hover:underline">회원가입</Link>
        </p>
      </section>

      {/* 관리자 로그인 */}
      <details className="rounded-2xl border border-neutral-200 bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold text-neutral-500">관리자 로그인</summary>
        <form action={adminLoginAction} className="mt-3 space-y-2">
          <input name="id" placeholder="아이디" className={inputCls} autoComplete="username" />
          <input name="pw" type="password" placeholder="비밀번호" className={inputCls} autoComplete="current-password" />
          <button className="w-full rounded-lg bg-neutral-800 py-2.5 text-sm font-semibold text-white hover:bg-neutral-900">
            관리자 로그인
          </button>
        </form>
      </details>
    </main>
  );
}
