import { redirect } from "next/navigation";
import { createFirstAdminAction } from "@/lib/actions";
import { adminAccountExists } from "@/lib/staff";
import { FIXED_ADMIN_ENABLED } from "@/lib/auth";
import { MIN_PASSWORD } from "@/lib/password";

export const dynamic = "force-dynamic";

// 최초 관리자 계정을 만드는 화면.
//
// 관리자 계정이 하나라도 생기는 순간 이 화면은 스스로 닫힌다.
// 비밀번호를 코드나 환경변수에 두지 않고, 쓰는 사람이 자기 브라우저에서
// 직접 정하게 하려는 것이다.
export default async function SetupAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  // 이미 관리자가 있으면 더 이상 열어두지 않는다.
  if ((await adminAccountExists()) || FIXED_ADMIN_ENABLED) redirect("/login");

  const { e } = await searchParams;
  const error =
    e === "input" ? "이름과 아이디를 모두 입력해 주세요."
    : e === "pw" ? `비밀번호는 ${MIN_PASSWORD}자 이상으로 정해 주세요.`
    : e === "match" ? "비밀번호 확인이 일치하지 않습니다."
    : e === "dup" ? "이미 쓰이고 있는 아이디입니다."
    : e === "taken" ? "이미 관리자 계정이 만들어졌습니다."
    : e === "save" ? "저장하지 못했습니다. 잠시 후 다시 시도해 주세요."
    : null;

  const input =
    "w-full rounded-xl border border-neutral-300 px-3.5 py-3 text-base outline-none focus:border-emerald-700";

  return (
    <main className="mx-auto max-w-sm pb-20 pt-10">
      <h1 className="text-2xl font-extrabold tracking-tight">관리자 계정 만들기</h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
        처음 한 번만 쓰는 화면입니다. 계정을 만들고 나면 이 주소는 자동으로 닫힙니다.
        <br />
        여기서 정한 아이디와 비밀번호로 관리자·강사 로그인을 합니다.
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <form action={createFirstAdminAction} className="mt-5 flex flex-col gap-2.5">
        <label htmlFor="s-name" className="sr-only">이름</label>
        <input id="s-name" name="name" placeholder="이름 (예: 전승훈)" className={input} required maxLength={20} />

        <label htmlFor="s-id" className="sr-only">아이디</label>
        <input
          id="s-id"
          name="loginId"
          placeholder="아이디 (예: merryfit)"
          className={input}
          autoComplete="username"
          required
          maxLength={20}
        />

        <label htmlFor="s-pw" className="sr-only">비밀번호</label>
        <input
          id="s-pw"
          name="password"
          type="password"
          placeholder={`비밀번호 (${MIN_PASSWORD}자 이상)`}
          className={input}
          autoComplete="new-password"
          required
        />

        <label htmlFor="s-pw2" className="sr-only">비밀번호 확인</label>
        <input
          id="s-pw2"
          name="password2"
          type="password"
          placeholder="비밀번호 확인"
          className={input}
          autoComplete="new-password"
          required
        />

        <button className="mt-2 rounded-xl bg-emerald-800 py-3.5 text-base font-bold text-white">
          만들고 바로 로그인
        </button>
      </form>

      <p className="mt-5 text-xs leading-relaxed text-neutral-400">
        비밀번호는 그대로 저장되지 않고 복원할 수 없는 형태로 바뀌어 보관됩니다.
        잊어버리면 새로 만들어야 하니 기억해 두세요.
      </p>
    </main>
  );
}
