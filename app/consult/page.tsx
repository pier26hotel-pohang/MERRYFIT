import type { Metadata } from "next";
import Link from "next/link";
import { submitConsultAction } from "@/lib/actions";
import { Q } from "@/lib/consult";
import { LimitChecks } from "@/components/LimitChecks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "메리핏 북구점 · 상담 신청",
  description: "몸 상태와 원하는 시간을 알려주시면 맞는 수업을 골라 연락드립니다.",
};

const input =
  "w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-[15px] placeholder:text-neutral-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15";

const ERR: Record<string, string> = {
  contact: "이름과 연락처를 확인해 주세요.",
  privacy: "개인정보 수집·이용에 동의해 주셔야 신청할 수 있어요.",
  save: "저장 중 문제가 생겼어요. 잠시 후 다시 시도하거나 전화로 문의해 주세요.",
};

function Chips({
  name,
  options,
  type = "checkbox",
}: {
  name: string;
  options: readonly string[];
  type?: "checkbox" | "radio";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o} className="cursor-pointer">
          <input type={type} name={name} value={o} className="peer sr-only" />
          <span className="inline-block rounded-full border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-700 transition peer-checked:border-emerald-800 peer-checked:bg-emerald-800 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-700/40 peer-disabled:cursor-not-allowed peer-disabled:opacity-40">
            {o}
          </span>
        </label>
      ))}
    </div>
  );
}

function Block({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-3 border-0 p-0">
      <legend className="mb-3 flex items-baseline gap-2 p-0">
        <span className="text-xs font-bold tabular-nums text-emerald-700">{String(n).padStart(2, "0")}</span>
        <span className="text-base font-bold text-neutral-900">{title}</span>
        {hint && <span className="text-xs text-neutral-400">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

export default async function ConsultPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; e?: string }>;
}) {
  const { from, e } = await searchParams;
  const tag = from && /^[a-z0-9_-]{1,32}$/i.test(from) ? from : "";

  return (
    <main className="pb-10 pt-6">
      <Link href={tag ? `/open?from=${tag}` : "/open"} className="text-sm text-neutral-500">
        ← 북구점 소개
      </Link>

      <header className="mb-6 mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">메리핏 북구점</p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight">상담 신청</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          몸 상태와 원하는 시간을 알려주시면 맞는 수업을 골라 연락드려요.
          <br />
          <b className="text-neutral-800">이름과 연락처만 필수</b>이고, 나머지는 아는 만큼만 적어주세요.
        </p>
      </header>

      {e && ERR[e] && (
        <p role="alert" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {ERR[e]}
        </p>
      )}

      <form action={submitConsultAction} className="flex flex-col gap-8">
        <input type="hidden" name="from" value={tag} />

        {/* 01 기본 정보 */}
        <Block n={1} title="기본 정보">
          <div className="flex flex-col gap-2">
            <label htmlFor="c-name" className="sr-only">이름</label>
            <input id="c-name" name="name" placeholder="이름" className={input} autoComplete="name" required maxLength={40} />
            <label htmlFor="c-phone" className="sr-only">연락처</label>
            <input
              id="c-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              placeholder="연락처 (010-0000-0000)"
              className={input}
              autoComplete="tel"
              required
              maxLength={20}
            />
          </div>
          <p className="text-xs text-neutral-500">{Q.ageGroup.label}</p>
          <Chips name="ageGroup" options={Q.ageGroup.options} type="radio" />
          <p className="text-xs text-neutral-500">{Q.contactTime.label}</p>
          <Chips name="contactTime" options={Q.contactTime.options} type="radio" />
        </Block>

        {/* 02 목적 */}
        <Block n={2} title={Q.goals.label} hint={Q.goals.hint}>
          <Chips name="goals" options={Q.goals.options} />
        </Block>

        {/* 03 몸 상태 */}
        <Block n={3} title="몸 상태" hint="수업 강도를 맞추는 데만 씁니다">
          <p className="text-xs text-neutral-500">{Q.painAreas.label}</p>
          <Chips name="painAreas" options={Q.painAreas.options} />
          <p className="mt-2 text-xs text-neutral-500">
            {Q.pregnancy.label} <span className="text-neutral-400">· {Q.pregnancy.hint}</span>
          </p>
          <Chips name="pregnancy" options={Q.pregnancy.options} type="radio" />
          <label htmlFor="c-concern" className="mt-2 text-xs text-neutral-500">
            요즘 몸에서 가장 신경 쓰이는 부분을 편하게 적어주세요
          </label>
          <textarea
            id="c-concern"
            name="concern"
            rows={3}
            maxLength={1000}
            placeholder="예) 오래 앉아 있으면 허리가 뻐근해요. 출산 후 골반이 틀어진 느낌이에요."
            className={`${input} resize-y`}
          />
        </Block>

        {/* 04 경험 */}
        <Block n={4} title={Q.experience.label}>
          <Chips name="experience" options={Q.experience.options} type="radio" />
        </Block>

        {/* 05 희망 수업·시간 */}
        <Block n={5} title="원하는 수업과 시간">
          <p className="text-xs text-neutral-500">
            {Q.programs.label} <span className="text-neutral-400">· {Q.programs.hint}</span>
          </p>
          <Chips name="programs" options={Q.programs.options} />
          <p className="mt-2 text-xs text-neutral-500">{Q.days.label}</p>
          <Chips name="days" options={Q.days.options} />
          <p className="mt-2 text-xs text-neutral-500">{Q.timeSlots.label}</p>
          <Chips name="timeSlots" options={Q.timeSlots.options} />
          <label htmlFor="c-wish" className="mt-2 text-xs text-neutral-500">
            시간표에 없지만 원하는 시간이나 수업이 있다면
          </label>
          <textarea
            id="c-wish"
            name="wishTime"
            rows={2}
            maxLength={500}
            placeholder="예) 토요일 오전 요가, 평일 12시 점심시간 수업"
            className={`${input} resize-y`}
          />
          <p className="text-xs text-neutral-400">신청이 모이는 시간대는 시간표에 반영합니다.</p>
        </Block>

        {/* 06 선택 기준 */}
        <Block n={6} title={Q.priorities.label} hint={Q.priorities.hint}>
          <LimitChecks name="priorities" max={Q.priorities.max}>
            <Chips name="priorities" options={Q.priorities.options} />
          </LimitChecks>
        </Block>

        {/* 07 유입 경로 */}
        <Block n={7} title={Q.source.label}>
          <Chips name="source" options={Q.source.options} type="radio" />
        </Block>

        {/* 동의 */}
        <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input type="checkbox" name="agreePrivacy" required className="mt-1 h-4 w-4 accent-emerald-800" />
            <span className="text-sm text-neutral-800">
              <b>[필수]</b> 개인정보 수집·이용에 동의합니다
            </span>
          </label>
          <details className="ml-6 text-xs leading-relaxed text-neutral-500">
            <summary className="cursor-pointer text-neutral-400">내용 보기</summary>
            <div className="mt-2 flex flex-col gap-1">
              <p>· 수집 항목: 이름, 연락처, 연락 희망 시간, 운동 목적·경험, 희망 수업·요일·시간대, 선택 기준, 유입 경로</p>
              <p>· 이용 목적: 상담 연락 및 수업 안내</p>
              <p>· 보유 기간: 신청일로부터 1년 (요청 시 즉시 파기)</p>
              <p>· 동의를 거부할 수 있으나, 거부하시면 상담 신청이 어렵습니다.</p>
            </div>
          </details>

          <label className="flex cursor-pointer items-start gap-2.5 border-t border-neutral-100 pt-3">
            <input type="checkbox" name="agreeHealth" className="mt-1 h-4 w-4 accent-emerald-800" />
            <span className="text-sm text-neutral-800">
              <b>[선택]</b> 건강 정보 수집·이용에 동의합니다
            </span>
          </label>
          <p className="ml-6 text-xs leading-relaxed text-neutral-500">
            03번의 불편한 곳·임신 여부·몸 고민은 법적으로 민감정보라 따로 동의를 받습니다. 동의하지 않으시면 이 항목은{" "}
            <b className="text-neutral-700">저장하지 않습니다</b>. 수업 강도 조절에만 쓰고, 신청일로부터 1년 후 파기합니다.
          </p>

          <label className="flex cursor-pointer items-start gap-2.5 border-t border-neutral-100 pt-3">
            <input type="checkbox" name="agreeMarketing" className="mt-1 h-4 w-4 accent-emerald-800" />
            <span className="text-sm text-neutral-800">
              <b>[선택]</b> 오픈 이벤트·신규 수업 소식을 문자로 받겠습니다
            </span>
          </label>
        </div>

        <button className="rounded-xl bg-emerald-800 py-4 text-base font-bold text-white shadow-sm transition hover:bg-emerald-900">
          상담 신청하기
        </button>
        <p className="-mt-4 text-center text-xs text-neutral-400">보통 하루 안에 연락드려요 · 054-247-3978</p>
      </form>
    </main>
  );
}
