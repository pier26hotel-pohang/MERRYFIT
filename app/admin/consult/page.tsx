import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { setConsultStatusAction } from "@/lib/actions";
import {
  listConsultations,
  tally,
  STATUS_LABEL,
  UTM_LABEL,
  type ConsultStatus,
  type Consultation,
} from "@/lib/consult";

export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-neutral-200 bg-white p-4";

const STATUS_STYLE: Record<ConsultStatus, string> = {
  new: "bg-red-50 text-red-700 border-red-200",
  contacted: "bg-amber-50 text-amber-800 border-amber-200",
  registered: "bg-emerald-50 text-emerald-800 border-emerald-200",
  closed: "bg-neutral-100 text-neutral-500 border-neutral-200",
};

function fmt(iso: string) {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

function Bars({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  return (
    <div className={card}>
      <h3 className="mb-2 text-sm font-bold text-neutral-800">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-neutral-400">아직 응답이 없어요</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.slice(0, 6).map(([k, v]) => (
            <li key={k} className="grid grid-cols-[1fr_auto] items-center gap-x-2 text-[13px]">
              <span className="truncate text-neutral-700">{k}</span>
              <span className="tabular-nums text-neutral-500">{v}</span>
              <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <span
                  className="block h-full rounded-full bg-emerald-700"
                  style={{ width: `${total ? Math.round((v / total) * 100) : 0}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Tags({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((t) => (
        <span key={t} className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-700">
          {t}
        </span>
      ))}
    </div>
  );
}

function Row({ c }: { c: Consultation }) {
  const tel = c.phone.replace(/[^0-9]/g, "");
  const via = c.utmSource ? UTM_LABEL[c.utmSource] ?? c.utmSource : null;
  return (
    <li className={`${card} flex flex-col gap-2.5`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <b className="text-[15px] text-neutral-900">{c.name}</b>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[c.status]}`}>
              {STATUS_LABEL[c.status]}
            </span>
          </div>
          <a href={`tel:${tel}`} className="text-sm font-semibold text-emerald-800 underline underline-offset-2">
            {c.phone}
          </a>
          {c.contactTime && <span className="ml-2 text-xs text-neutral-500">· {c.contactTime} 연락</span>}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-neutral-400">{fmt(c.createdAt)}</span>
      </div>

      <dl className="grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1.5 text-[13px]">
        {c.goals.length > 0 && (<><dt className="text-neutral-400">목적</dt><dd><Tags items={c.goals} /></dd></>)}
        {c.programs.length > 0 && (<><dt className="text-neutral-400">관심 수업</dt><dd><Tags items={c.programs} /></dd></>)}
        {(c.days.length > 0 || c.timeSlots.length > 0) && (
          <><dt className="text-neutral-400">희망 시간</dt><dd><Tags items={[...c.days, ...c.timeSlots]} /></dd></>
        )}
        {c.wishTime && (<><dt className="text-neutral-400">요청</dt><dd className="text-neutral-800">{c.wishTime}</dd></>)}
        {c.experience && (<><dt className="text-neutral-400">경험</dt><dd className="text-neutral-700">{c.experience}</dd></>)}
        {c.agreeHealth && c.painAreas.length > 0 && (
          <><dt className="text-neutral-400">불편한 곳</dt><dd><Tags items={c.painAreas} /></dd></>
        )}
        {c.agreeHealth && c.pregnancy && c.pregnancy !== "해당 없음" && (
          <><dt className="text-neutral-400">임신·출산</dt><dd className="font-semibold text-red-700">{c.pregnancy}</dd></>
        )}
        {c.agreeHealth && c.concern && (
          <><dt className="text-neutral-400">몸 고민</dt><dd className="text-neutral-800">{c.concern}</dd></>
        )}
        {c.priorities.length > 0 && (<><dt className="text-neutral-400">선택 기준</dt><dd><Tags items={c.priorities} /></dd></>)}
        {(c.source || via) && (
          <><dt className="text-neutral-400">유입</dt>
            <dd className="text-neutral-700">
              {c.source}
              {via && <span className="ml-1 text-xs text-neutral-400">(링크: {via})</span>}
            </dd></>
        )}
      </dl>

      {!c.agreeHealth && (
        <p className="text-[11px] text-neutral-400">건강 정보 수집에 동의하지 않아 몸 상태는 저장하지 않았습니다.</p>
      )}

      <form action={setConsultStatusAction} className="flex flex-col gap-2 border-t border-neutral-100 pt-2.5">
        <input type="hidden" name="id" value={c.id} />
        <label htmlFor={`memo-${c.id}`} className="sr-only">메모</label>
        <input
          id={`memo-${c.id}`}
          name="memo"
          defaultValue={c.memo ?? ""}
          placeholder="통화 메모 (예: 화 19:30 체험 예약)"
          className="w-full rounded-lg border border-neutral-300 px-2.5 py-2 text-sm"
        />
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(STATUS_LABEL) as ConsultStatus[]).map((s) => (
            <button
              key={s}
              name="status"
              value={s}
              className={`rounded-lg border py-1.5 text-xs font-semibold ${
                c.status === s ? STATUS_STYLE[s] : "border-neutral-200 bg-white text-neutral-500"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </form>
    </li>
  );
}

export default async function AdminConsultPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  if (!(await isAdmin())) redirect("/login?e=admin");
  const { s } = await searchParams;
  const filter = (["new", "contacted", "registered", "closed"] as const).includes(s as ConsultStatus)
    ? (s as ConsultStatus)
    : null;

  const all = await listConsultations();
  const shown = filter ? all.filter((c) => c.status === filter) : all;
  const total = all.length;
  const count = (st: ConsultStatus) => all.filter((c) => c.status === st).length;

  // 유입 경로: 본인 응답이 없으면 링크 파라미터로 채운다
  const sourceRows = tally(all, (c) => c.source ?? (c.utmSource ? UTM_LABEL[c.utmSource] ?? c.utmSource : "응답 없음"));

  return (
    <main className="pb-16 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">상담 신청</h1>
          <p className="text-sm text-neutral-500">북구점 오픈 페이지 설문</p>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link href="/admin" className="text-neutral-500">관리자</Link>
          <Link href="/open" className="text-emerald-700">오픈 페이지</Link>
        </nav>
      </header>

      <div className="mb-4 grid grid-cols-4 gap-2 text-center">
        {(
          [
            ["new", "새 신청"],
            ["contacted", "연락함"],
            ["registered", "등록"],
            ["closed", "종료"],
          ] as [ConsultStatus, string][]
        ).map(([st, l]) => (
          <Link
            key={st}
            href={filter === st ? "/admin/consult" : `/admin/consult?s=${st}`}
            className={`rounded-xl border py-2 ${filter === st ? STATUS_STYLE[st] : "border-neutral-200 bg-white"}`}
          >
            <div className="text-lg font-extrabold tabular-nums">{count(st)}</div>
            <div className="text-[11px] text-neutral-500">{l}</div>
          </Link>
        ))}
      </div>

      {total > 0 && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          전체 <b>{total}</b>건 · 등록 전환율{" "}
          <b>{Math.round((count("registered") / total) * 100)}%</b>
        </p>
      )}

      <section className="mb-6 grid grid-cols-1 gap-3">
        <Bars title="어디서 알게 됐나" rows={sourceRows} total={total} />
        <Bars title="운동 목적" rows={tally(all, (c) => c.goals)} total={total} />
        <Bars title="관심 수업" rows={tally(all, (c) => c.programs)} total={total} />
        <Bars title="희망 시간대" rows={tally(all, (c) => c.timeSlots)} total={total} />
        <Bars title="센터 고르는 기준" rows={tally(all, (c) => c.priorities)} total={total} />
      </section>

      <h2 className="mb-2 text-sm font-bold text-neutral-700">
        신청 목록 {filter && <span className="font-normal text-neutral-400">· {STATUS_LABEL[filter]}만</span>}
      </h2>
      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          신청이 들어오면 여기 표시됩니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((c) => (
            <Row key={c.id} c={c} />
          ))}
        </ul>
      )}
    </main>
  );
}
