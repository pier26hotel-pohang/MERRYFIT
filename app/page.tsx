import Link from "next/link";
import Image from "next/image";
import { loadSnapshot, listMembers, memberRemaining } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const db = await loadSnapshot();
  const members = listMembers(db);
  return (
    <main className="pt-14">
      <header className="mb-10 flex flex-col items-center text-center">
        <Image src="/logo.png" alt="메리핏" width={64} height={64} priority />
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-neutral-900">
          MERRY FIT
        </h1>
        <p className="mt-1 text-sm text-neutral-500">모든 날, 모든 순간을 즐겁게</p>
      </header>

      <p className="mb-3 text-center text-sm font-medium text-neutral-600">
        로그인할 회원을 선택하세요
      </p>
      <div className="space-y-2.5">
        {members.map((m) => (
          <Link
            key={m.id}
            href={`/book?m=${m.id}`}
            className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition active:scale-[0.99] hover:border-emerald-300 hover:shadow"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                {m.name.slice(0, 1)}
              </span>
              <span className="font-semibold text-neutral-900">{m.name}</span>
            </span>
            <span className="text-sm text-neutral-500">
              {m.branch} · 잔여 {memberRemaining(db, m.id)}회
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-2 text-center text-xs text-neutral-400">
        (프로토타입 — 실제 로그인·회원가입은 배포 단계에서)
      </p>

      <div className="mt-10 flex justify-center gap-5 text-sm text-neutral-400">
        <Link href="/timetable" className="hover:text-emerald-700">전체 시간표</Link>
        <Link href="/checkin" className="hover:text-emerald-700">출석 체크인(직원)</Link>
        <Link href="/admin" className="hover:text-emerald-700">관리자</Link>
      </div>
    </main>
  );
}
