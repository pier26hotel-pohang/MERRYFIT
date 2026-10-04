import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { currentMemberId } from "@/lib/auth";
import {
  loadSnapshot,
  getMember,
  memberRemaining,
  hasUnlimited,
  nextRenewalInfo,
  distinctTimes,
  slotsForCell,
  slotBookedCount,
  getActiveReservation,
  occurrenceDate,
  weekRangeLabel,
  canCancelDate,
  todayISO,
  totalVisits,
  upcomingReservations,
  DOW_LABEL,
  bookingOpensAt,
  isClosedSlot,
  isConsultSlot,
} from "@/lib/store";
import { Branch, BRANCH_LABEL } from "@/lib/types";
import { tierFor, nextTier } from "@/lib/points";
import { bookAction, logoutAction } from "@/lib/actions";
import { WeeklyGrid, programAbbrev } from "@/components/WeeklyGrid";
import { SelfCheckIn } from "@/components/SelfCheckIn";
import { GuidePanel } from "@/components/GuidePanel";
import { PointTransferButton } from "@/components/PointTransferButton";
import { pendingPointRequest } from "@/lib/store";
import { DEFAULT_BRANCH } from "@/lib/types";
import { CancelButton } from "@/components/CancelButton";

export const dynamic = "force-dynamic";

// 몇 주 뒤까지 보여줄지. 0 = 이번 주.
const WEEKS_AHEAD = 2;
const WEEK_TABS = [
  { o: 0, l: "이번 주" },
  { o: 1, l: "다음 주" },
  { o: 2, l: "그다음" },
];

function fmtD(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}(${DOW_LABEL[d.getDay()]})`;
}

export default async function MemberHome({
  searchParams,
}: {
  searchParams: Promise<{ w?: string; b?: string }>;
}) {
  const { w, b } = await searchParams;
  const memberId = await currentMemberId();
  if (!memberId) redirect("/login");
  const db = await loadSnapshot();
  const member = getMember(db, memberId);
  if (!member) redirect("/login");
  // 3주까지 본다. 2주 뒤를 막아두면 10/12 가오픈 같은 날을 아예 예약할 수 없다.
  const weekOffset = Math.min(Math.max(Number(w) || 0, 0), WEEKS_AHEAD);

  // 기본은 2호점. 직접 고른 지점이 있으면 그대로 존중하고,
  // 그 지점에 수업이 없으면 수업이 있는 지점을 대신 보여준다
  // ("등록된 수업이 없습니다"만 뜨는 빈 화면 방지).
  const picked: Branch | null = b === "1호점" || b === "2호점" ? b : null;
  let branch: Branch = picked ?? DEFAULT_BRANCH;
  if (!picked && distinctTimes(db, branch).length === 0) {
    const other: Branch = branch === "1호점" ? "2호점" : "1호점";
    if (distinctTimes(db, other).length > 0) branch = other;
  }
  const times = distinctTimes(db, branch);
  const pointReq = await pendingPointRequest(member.id);
  const link = (bb: Branch, wo: number) => `/book?b=${bb}&w=${wo}`;
  const upcoming = upcomingReservations(db, member.id);

  return (
    <main className="pt-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Image src="/logo.png" alt="메리핏" width={22} height={22} />
          <span className="text-sm font-extrabold tracking-tight">MERRY FIT</span>
        </span>
        <div className="flex items-center gap-2.5">
          <GuidePanel />
          <form action={logoutAction}>
            <button className="text-sm text-neutral-400 hover:text-neutral-600">로그아웃</button>
          </form>
        </div>
      </div>

      {/* 회원 요약 카드 */}
      <section className="mb-4 rounded-2xl bg-emerald-800 p-5 text-white">
        <div className="text-lg font-bold">{member.name}님</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-emerald-700/60 py-2">
            <div className="text-xs text-emerald-100">센터 적립금</div>
            <div className="text-base font-bold">{member.points.toLocaleString()}원</div>
          </div>
          <div className="rounded-xl bg-emerald-700/60 py-2">
            <div className="text-xs text-emerald-100">잔여 횟수</div>
            <div className="text-base font-bold">
              {hasUnlimited(db, member.id) ? "무제한" : `${memberRemaining(db, member.id)}회`}
            </div>
          </div>
          <div className="rounded-xl bg-emerald-700/60 py-2">
            <div className="text-xs text-emerald-100">출석</div>
            <div className="text-base font-bold">{totalVisits(db, member.id)}회</div>
          </div>
        </div>

        {(() => {
          const r = nextRenewalInfo(db, member.id);
          if (!r) return null;
          return (
            <p className="mt-2.5 text-center text-[11px] text-emerald-100/80">
              {r.type} · {r.date.slice(5).replace("-", "월 ")}일에 횟수가 다시 채워져요
            </p>
          );
        })()}

        {/* 적립 등급 — 많이 나올수록 1회 적립금이 올라간다 */}
        {(() => {
          // 남구점에서 쌓은 출석도 함께 센다. 앱 기록만 세면 오래 다닌 회원이
          // 신규와 같은 적립률을 받는다.
          const n = totalVisits(db, member.id);
          const tier = tierFor(member.branch, n);
          const next = nextTier(member.branch, n);
          return (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-emerald-900/50 px-3.5 py-2.5">
              <div>
                <span className="rounded-full bg-[#EBD2A0] px-2 py-0.5 text-[11px] font-extrabold text-[#1B2B20]">
                  {tier.name}
                </span>
                <span className="ml-2 text-[13px] font-semibold">
                  출석 1회 {tier.point.toLocaleString()}원
                </span>
              </div>
              <span className="shrink-0 text-[11px] text-emerald-100">
                {next ? `${next.tier.name}까지 ${next.remaining}회` : "최고 등급"}
              </span>
            </div>
          );
        })()}
      </section>

      {/* 다가오는 예약 */}
      {upcoming.length > 0 && (
        <section className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">다가오는 예약</h2>
          <div className="space-y-1.5">
            {upcoming.slice(0, 5).map(({ r, slot }) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">
                  {fmtD(r.date)} {slot.time} · {slot.program}
                  <span className="ml-1 text-xs text-neutral-400">{slot.branch}</span>
                </span>
                {canCancelDate(r.date) ? (
                  <CancelButton
                    reservationId={r.id}
                    className="rounded px-2 py-0.5 text-xs font-medium text-pink-600 hover:bg-pink-50"
                  >
                    취소
                  </CancelButton>
                ) : (
                  <span className="text-xs text-neutral-300" title="당일·전날 취소 불가">🔒</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 메리핏 쇼핑몰
          주의: 앱 적립금과 쇼핑몰(카페24) 적립금은 아직 연동되어 있지 않다.
          "바로 쓸 수 있다"고 쓰면 클레임이 되므로 전환 절차를 명시한다. */}
      <a
        href="https://merryfitpila.cafe24.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-2 flex items-center justify-center gap-2 rounded-2xl bg-pink-500 py-3 font-semibold text-white shadow-sm transition hover:bg-pink-600"
      >
        🛍️ 메리핏 쇼핑몰 바로가기
      </a>
      <PointTransferButton points={member.points} pending={Boolean(pointReq)} />

      {/* 위치 검증 셀프 체크인 */}
      <SelfCheckIn memberId={member.id} />

      {/* 지점 전환 */}
      <div className="mb-2 flex gap-2">
        {(["1호점", "2호점"] as Branch[]).map((bb) => (
          <Link
            key={bb}
            href={link(bb, weekOffset)}
            className={`flex-1 rounded-full py-1.5 text-center text-sm font-medium ${
              branch === bb ? "bg-emerald-700 text-white" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {BRANCH_LABEL[bb]}
          </Link>
        ))}
      </div>

      {/* 아직 예약을 안 받는 지점 — 시간표는 보여주되 언제부터인지 알려준다 */}
      {(() => {
        const open = bookingOpensAt(branch);
        if (!open) return null;
        const [, m, d] = open.split("-");
        return (
          <p className="mb-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-center text-sm text-amber-800">
            {BRANCH_LABEL[branch]}은 <b>{Number(m)}월 {Number(d)}일</b>부터 예약을 받아요.
            <br />
            <span className="text-xs">시간표를 미리 보고 계획해 두세요.</span>
          </p>
        );
      })()}

      {/* 주차 전환 */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex gap-2">
          {WEEK_TABS.map(({ o, l }) => (
            <Link
              key={o}
              href={link(branch, o)}
              className={`rounded-full px-3 py-1 text-sm ${
                weekOffset === o ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {l}
            </Link>
          ))}
        </div>
        <span className="text-xs text-neutral-400">{weekRangeLabel(weekOffset)}</span>
      </div>

      <WeeklyGrid
        times={times}
        cell={(dow, time) => {
          const date = occurrenceDate(dow, weekOffset);
          // 남구점은 같은 시각에 룸을 나눠 두 수업이 동시에 돈다. 다 보여줘야 한다.
          const cellSlots = slotsForCell(db, branch, dow, time, date);
          if (cellSlots.length === 0) return null;
          const past = date < todayISO();
          const locked = Boolean(bookingOpensAt(branch));
          return cellSlots.map((slot) => {
          const closed = isClosedSlot(slot.capacity);
          const count = slotBookedCount(db, slot.id, date);
          const full = count >= slot.capacity;
          const myR = getActiveReservation(db, slot.id, date, member.id);
          if (closed) {
            return (
              <div key={slot.id} className="mb-1 rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-1 py-2 text-[10px] text-neutral-300 last:mb-0">
                휴무
              </div>
            );
          }
          return (
            <div
              key={slot.id}
              className={`mb-1 rounded-md border px-1 py-1 last:mb-0 ${
                isConsultSlot(slot.program)
                  ? "border-amber-300 bg-amber-50"
                  : "border-neutral-200 bg-white"
              }`}
            >
              <div className="text-[11px] font-semibold leading-tight text-neutral-800">
                {programAbbrev(slot.program)}
              </div>
              <div className={`text-[10px] ${full && !myR ? "text-red-500" : "text-neutral-500"}`}>
                {count}/{slot.capacity}
              </div>
              {myR ? (
                canCancelDate(date) ? (
                  <CancelButton
                    reservationId={myR.id}
                    className="mt-0.5 w-full rounded bg-pink-500 py-0.5 text-[10px] font-medium text-white hover:bg-pink-600"
                  >
                    신청됨 ✕
                  </CancelButton>
                ) : (
                  <div
                    title="당일·전날에는 취소할 수 없어요"
                    className="mt-0.5 rounded bg-pink-100 py-0.5 text-[10px] font-medium text-pink-600"
                  >
                    신청됨 🔒
                  </div>
                )
              ) : past ? (
                <div className="mt-0.5 rounded bg-neutral-100 py-0.5 text-[10px] text-neutral-300">
                  종료
                </div>
              ) : locked ? (
                <div className="mt-0.5 rounded bg-neutral-100 py-0.5 text-[10px] text-neutral-400">
                  준비 중
                </div>
              ) : full ? (
                <div className="mt-0.5 rounded bg-neutral-100 py-0.5 text-[10px] text-neutral-400">
                  마감
                </div>
              ) : (
                <form action={bookAction}>
                  <input type="hidden" name="slotId" value={slot.id} />
                  <input type="hidden" name="memberId" value={member.id} />
                  <input type="hidden" name="date" value={date} />
                  <button
                    className={`mt-0.5 w-full rounded py-0.5 text-[10px] font-medium text-white ${
                      isConsultSlot(slot.program)
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-emerald-700 hover:bg-emerald-800"
                    }`}
                  >
                    {isConsultSlot(slot.program) ? "상담" : "신청"}
                  </button>
                </form>
              )}
            </div>
          );
          });
        }}
      />
      <p className="mt-3 text-center text-xs text-neutral-400">
        신청 시 잔여 1회 차감 · 핑크 &lsquo;신청됨 ✕&rsquo; 누르면 취소(당일·전날 불가)
      </p>
    </main>
  );
}
