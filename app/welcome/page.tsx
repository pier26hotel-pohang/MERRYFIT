import { redirect } from "next/navigation";
import { currentMemberId } from "@/lib/auth";
import { savePhoneAction } from "@/lib/actions";
import { loadSnapshot, getMember } from "@/lib/store";

export const dynamic = "force-dynamic";

// 카카오는 실명을 주지 않는다. 닉네임이 그대로 들어와서
// "JSY22110189♡7121123☆" 같은 이름이 출석부에 뜬 적이 있다.
// 닉네임으로 보이면 입력칸을 비워 다시 적게 한다.
function looksLikeNickname(name: string): boolean {
  return /[0-9]{3,}|[^가-힣a-zA-Z\s]/.test(String(name ?? ""));
}

// 카카오로 들어온 회원의 연락처를 받는 화면.
//
// 카카오는 전화번호를 주지 않는다. 연락처가 없으면 센터에서 전화를 걸 수도 없고,
// 관리자가 미리 넣어둔 기존 회원 기록과 이어붙일 수도 없다.
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/login");

  const db = await loadSnapshot();
  const me = getMember(db, memberId);
  if (!me) redirect("/login");
  // 이미 연락처가 있으면 이 화면은 필요 없다.
  if (me.phone) redirect("/book");

  const { e } = await searchParams;
  const error =
    e === "phone" ? "연락처를 정확히 입력해 주세요."
    : e === "dup" ? "이미 사용 중인 연락처입니다. 센터로 연락 주세요."
    : e === "name2" ? "이름을 적어주세요."
    : e === "name" ? "등록된 이름과 달라요. 센터로 연락 주시면 바로 확인해 드릴게요."
    : e === "save" ? "저장하지 못했습니다. 잠시 후 다시 시도해 주세요."
    : null;

  const input =
    "w-full rounded-xl border border-neutral-300 px-3.5 py-3 text-base outline-none focus:border-emerald-700";

  return (
    <main className="mx-auto max-w-sm pb-20 pt-12">
      <h1 className="text-2xl font-extrabold tracking-tight">{me.name}님, 반가워요</h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
        연락처만 남겨주시면 끝납니다.
        <br />
        수업 변경이나 휴관 안내를 드릴 때 씁니다.
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <form action={savePhoneAction} className="mt-5 flex flex-col gap-2.5">
        <label htmlFor="w-name" className="sr-only">이름</label>
        <input
          id="w-name"
          name="name"
          placeholder="이름 (실명으로 적어주세요)"
          className={input}
          autoComplete="name"
          defaultValue={looksLikeNickname(me.name) ? "" : me.name}
          required
          maxLength={40}
        />
        <label htmlFor="w-phone" className="sr-only">연락처</label>
        <input
          id="w-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="010-0000-0000"
          className={input}
          autoComplete="tel"
          required
          maxLength={20}
        />
        <button className="rounded-xl bg-emerald-800 py-3.5 text-base font-bold text-white">
          시작하기
        </button>
      </form>

      <p className="mt-5 text-xs leading-relaxed text-neutral-400">
        출석부와 상담 기록에 쓰이니 실명으로 적어주세요.
        <br />
        이미 센터에 등록된 번호라면 기존 수강권과 적립금이 그대로 이어집니다.
      </p>
    </main>
  );
}
