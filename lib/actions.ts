"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as store from "./store";
import * as staff from "./staff";
import * as consult from "./consult";
import { Branch, ProgramName, PassScope, DEFAULT_BRANCH } from "./types";
import { MIN_PASSWORD, MIN_STAFF_PASSWORD } from "./password";
import { findProduct, isUnlimited } from "./passes";
import { addPayment, deletePayment, updatePayment } from "./payments";
import { ADMIN_ID, ADMIN_PW, FIXED_ADMIN_ENABLED, ADMIN_COOKIE, MEMBER_COOKIE, STAFF_COOKIE, currentMemberId } from "./auth";

const YEAR = 60 * 60 * 24 * 30;

// 직원 로그인 — 강사 계정이 먼저, 없으면 고정 관리자 계정으로 떨어진다.
// 강사는 /staff(내 급여), 관리자는 /admin 으로 보낸다.
export async function adminLoginAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const pw = String(formData.get("pw") ?? "").trim();
  const c = await cookies();

  const person = await staff.verifyLogin(id, pw);
  if (person) {
    c.set(STAFF_COOKIE, person.id, { httpOnly: true, path: "/", maxAge: YEAR });
    if (person.role === "admin") {
      c.set(ADMIN_COOKIE, "1", { httpOnly: true, path: "/", maxAge: YEAR });
      redirect("/admin");
    }
    c.delete(ADMIN_COOKIE);
    redirect("/staff");
  }

  if (FIXED_ADMIN_ENABLED && id === ADMIN_ID && pw === ADMIN_PW) {
    c.set(ADMIN_COOKIE, "1", { httpOnly: true, path: "/", maxAge: YEAR });
    c.delete(STAFF_COOKIE);
    redirect("/admin");
  }
  redirect("/login?e=admin");
}

export async function memberPhoneLoginAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!phone || !password) redirect("/login?e=member");

  const r = await store.verifyMemberLogin(phone, password);
  if (r === null) redirect("/login?e=member");   // 없는 연락처
  if (r === "nopw") redirect("/login?e=nopw");   // 비밀번호 미설정(카카오 가입자 등)
  if (r === "bad") redirect("/login?e=badpw");   // 비밀번호 불일치

  (await cookies()).set(MEMBER_COOKIE, r.id, { httpOnly: true, path: "/", maxAge: YEAR });
  redirect("/book");
}

export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const birthdate = String(formData.get("birthdate") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const branch = (String(formData.get("branch") ?? DEFAULT_BRANCH) as Branch);
  const password = String(formData.get("password") ?? "");
  if (!name || !phone) redirect("/signup?e=1");
  if (password.length < MIN_PASSWORD) redirect("/signup?e=pw");
  const db = await store.loadSnapshot();

  // 관리자가 미리 넣어둔 회원이면 새로 만들지 않고 그 기록을 이어받는다.
  // 수강권·적립금·결제 이력이 그대로 따라온다.
  const { member: claimable, taken } = store.findClaimable(db, phone, name);
  if (taken) redirect("/signup?e=dup");

  let id: string;
  if (claimable) {
    try {
      await store.claimMember(claimable.id, { password, birthdate, address, branch });
    } catch (err) {
      console.error("[signup:claim]", err);
      redirect("/signup?e=save");
    }
    id = claimable.id;
  } else {
    try {
      id = await store.addMember(name, phone, branch, birthdate, address, password);
    } catch (err) {
      // 저장에 실패하면 쿠키만 심어두고 넘어가는 일이 없도록 여기서 끊는다.
      console.error("[signup]", err);
      redirect("/signup?e=save");
    }
  }
  (await cookies()).set(MEMBER_COOKIE, id, { httpOnly: true, path: "/", maxAge: YEAR });
  redirect("/book");
}

// 카카오로 들어온 회원의 연락처를 받는다.
// 이 번호가 관리자가 미리 넣어둔 회원과 맞으면 그쪽으로 합친다.
export async function savePhoneAction(formData: FormData) {
  const memberId = await currentMemberId();
  if (!memberId) redirect("/login");

  const phone = String(formData.get("phone") ?? "").trim();
  if (phone.replace(/[^0-9]/g, "").length < 9) redirect("/welcome?e=phone");

  const db = await store.loadSnapshot();
  const me = store.getMember(db, memberId);
  if (!me) redirect("/login");

  const existing = store.getMemberByPhone(db, phone);
  if (existing && existing.id !== memberId) {
    if (!store.isUnclaimed(existing)) redirect("/welcome?e=dup");
    // 이름까지 맞을 때만 합친다.
    if (existing.name.replace(/\s+/g, "") !== me.name.replace(/\s+/g, "")) redirect("/welcome?e=name");
    try {
      await store.mergeKakaoIntoMember(memberId, existing.id, phone);
    } catch (err) {
      console.error("[savePhone:merge]", err);
      redirect("/welcome?e=save");
    }
    (await cookies()).set(MEMBER_COOKIE, existing.id, { httpOnly: true, path: "/", maxAge: YEAR });
    redirect("/book");
  }

  try {
    await store.setMemberPhone(memberId, phone);
  } catch (err) {
    console.error("[savePhone]", err);
    redirect("/welcome?e=save");
  }
  redirect("/book");
}

export async function logoutAction() {
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
  c.delete(MEMBER_COOKIE);
  c.delete(STAFF_COOKIE);
  redirect("/login");
}

// ---------- 상담 신청 (오픈 페이지 설문) ----------
export async function submitConsultAction(formData: FormData) {
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const all = (k: string) => formData.getAll(k).map((v) => String(v));
  const from = str("from").slice(0, 32);
  const back = (e: string) => `/consult?e=${e}${from ? `&from=${encodeURIComponent(from)}` : ""}`;

  const name = str("name").slice(0, 40);
  const phone = str("phone").slice(0, 20);
  const digits = phone.replace(/[^0-9]/g, "");
  if (!name || digits.length < 9) redirect(back("contact"));
  if (formData.get("agreePrivacy") !== "on") redirect(back("privacy"));

  const Q = consult.Q;
  // 불편한 곳·임신 여부·몸 고민은 민감정보(건강) — 별도 동의가 있을 때만 저장한다.
  const agreeHealth = formData.get("agreeHealth") === "on";
  try {
    await consult.saveConsultation({
      name,
      phone,
      ageGroup: consult.keepOne(str("ageGroup"), Q.ageGroup.options),
      contactTime: consult.keepOne(str("contactTime"), Q.contactTime.options),
      trialSlot: consult.keepOne(str("trialSlot"), Q.trialSlot.options),
      visitDate: str("visitDate").slice(0, 60),
      visitTime: consult.keepOne(str("visitTime"), Q.visitTime.options),
      giftOptin: formData.get("giftOptin") === "on",
      goals: consult.keepAllowed(all("goals"), Q.goals.options),
      painAreas: agreeHealth ? consult.keepAllowed(all("painAreas"), Q.painAreas.options) : [],
      pregnancy: agreeHealth ? consult.keepOne(str("pregnancy"), Q.pregnancy.options) : undefined,
      concern: agreeHealth ? str("concern").slice(0, 1000) : "",
      experience: consult.keepOne(str("experience"), Q.experience.options),
      programs: consult.keepAllowed(all("programs"), Q.programs.options),
      days: consult.keepAllowed(all("days"), Q.days.options),
      timeSlots: consult.keepAllowed(all("timeSlots"), Q.timeSlots.options),
      wishTime: str("wishTime").slice(0, 500),
      priorities: consult.keepAllowed(all("priorities"), Q.priorities.options, Q.priorities.max),
      source: consult.keepOne(str("source"), Q.source.options),
      utmSource: from,
      agreePrivacy: true,
      agreeHealth,
      agreeMarketing: formData.get("agreeMarketing") === "on",
    });
  } catch (err) {
    console.error("[consult]", err);
    redirect(back("save"));
  }
  redirect(`/consult/done?n=${encodeURIComponent(name)}`);
}

export async function setConsultStatusAction(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as consult.ConsultStatus;
  if (!["new", "contacted", "registered", "closed"].includes(status)) return;
  const memoRaw = formData.get("memo");
  await consult.setConsultStatus(id, status, memoRaw === null ? undefined : String(memoRaw).slice(0, 500));
  revalidatePath("/admin/consult");
}

// ---------- 적립금 전환 ----------
export async function requestPointTransferAction(): Promise<{ ok: boolean; msg: string }> {
  const memberId = await currentMemberId();
  if (!memberId) return { ok: false, msg: "로그인이 필요해요." };
  const r = await store.requestPointTransfer(memberId);
  revalidatePath("/book");
  return r;
}

/**
 * 쇼핑몰 가입을 마친 회원을 연락처로 찾아 연결한다.
 *
 * 연동이 꺼져 있거나 못 찾으면 실패를 그대로 알려준다 — 조용히 넘기면
 * 회원은 연결된 줄 알고 기다리게 된다.
 */
export async function linkShopAccountAction(): Promise<{ ok: boolean; msg: string }> {
  const memberId = await currentMemberId();
  if (!memberId) return { ok: false, msg: "로그인이 필요해요." };
  try {
    const { linkByPhone } = await import("./cafe24");
    const r = await linkByPhone(memberId);
    if (r.ok) revalidatePath("/book");
    return r;
  } catch (e) {
    console.error("[linkShop]", e);
    return { ok: false, msg: "연결 중 문제가 생겼어요. 센터로 연락 주세요." };
  }
}

export async function completePointRequestAction(formData: FormData) {
  await store.completePointRequest(String(formData.get("requestId")));
  revalidatePath("/admin");
}

export async function rejectPointRequestAction(formData: FormData) {
  await store.rejectPointRequest(String(formData.get("requestId")));
  revalidatePath("/admin");
}

// 최초 관리자 계정 생성. 관리자가 이미 있으면 거부한다.
export async function createFirstAdminAction(formData: FormData) {
  if ((await staff.adminAccountExists()) || FIXED_ADMIN_ENABLED) redirect("/setup-admin?e=taken");

  const name = String(formData.get("name") ?? "").trim().slice(0, 20);
  const loginId = String(formData.get("loginId") ?? "").trim().slice(0, 20);
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");

  if (!name || !loginId) redirect("/setup-admin?e=input");
  if (password.length < MIN_STAFF_PASSWORD) redirect("/setup-admin?e=pw");
  if (password !== password2) redirect("/setup-admin?e=match");

  let id: string;
  try {
    id = await staff.addInstructor({ name, loginId, password, role: "admin", branch: DEFAULT_BRANCH });
  } catch (err) {
    console.error("[createFirstAdmin]", err);
    redirect("/setup-admin?e=dup");
  }

  // 만들자마자 로그인된 상태로 넘어간다.
  const c = await cookies();
  c.set(STAFF_COOKIE, id, { httpOnly: true, path: "/", maxAge: YEAR });
  c.set(ADMIN_COOKIE, "1", { httpOnly: true, path: "/", maxAge: YEAR });
  redirect("/admin");
}

// 앱 회원 ↔ 쇼핑몰 회원 연결. 카페24 적립금 API는 쇼핑몰 회원아이디로만 지급된다.
export async function setCafe24IdAction(formData: FormData) {
  const memberId = String(formData.get("memberId"));
  const cafe24Id = String(formData.get("cafe24Id") ?? "").trim().slice(0, 20);
  if (memberId) await store.setCafe24Id(memberId, cafe24Id);
  revalidatePath(`/admin/member/${memberId}`);
}

// 아직 쇼핑몰에 안 올라간 적립금을 지금 올린다 (자동 반영이 실패했을 때).
export async function syncPointsAction(formData: FormData) {
  const memberId = String(formData.get("memberId"));
  const { syncMemberPoints } = await import("./cafe24");
  await syncMemberPoints(memberId);
  revalidatePath(`/admin/member/${memberId}`);
}

export async function setMemberPasswordAction(formData: FormData) {
  const memberId = String(formData.get("memberId"));
  const password = String(formData.get("password") ?? "");
  if (memberId && password.length >= MIN_PASSWORD) await store.setMemberPassword(memberId, password);
  revalidatePath(`/admin/member/${memberId}`);
}

// ---------- 강사 관리 (관리자 전용) ----------
export async function addInstructorAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  if (!name || !loginId || password.length < MIN_STAFF_PASSWORD) redirect("/admin/staff?e=input");
  try {
    await staff.addInstructor({
      name,
      loginId,
      password,
      role: formData.get("role") === "admin" ? "admin" : "instructor",
      branch: (String(formData.get("branch") ?? "1호점") as Branch),
      phone: String(formData.get("phone") ?? "").trim(),
      bank: String(formData.get("bank") ?? "").trim(),
      account: String(formData.get("account") ?? "").trim(),
    });
  } catch (err) {
    console.error("[addInstructor]", err);
    // 대부분 아이디 중복이다.
    redirect("/admin/staff?e=dup");
  }
  redirect("/admin/staff?ok=1");
}

export async function setRatesAction(formData: FormData) {
  const instructorId = String(formData.get("instructorId"));
  const rates: Partial<Record<staff.RateKind, number>> = {};
  for (const { kind } of staff.RATE_KINDS) {
    const raw = formData.get(kind);
    if (raw !== null && String(raw).trim() !== "") rates[kind] = Number(raw);
  }
  await staff.setRates(instructorId, rates);
  revalidatePath("/admin/staff");
  revalidatePath("/admin/payroll");
}

export async function setStaffPasswordAction(formData: FormData) {
  const instructorId = String(formData.get("instructorId"));
  const password = String(formData.get("password") ?? "").trim();
  if (password.length >= 4) await staff.setPassword(instructorId, password);
  redirect("/admin/staff?ok=pw");
}

export async function setStaffActiveAction(formData: FormData) {
  await staff.setActive(String(formData.get("instructorId")), formData.get("active") === "1");
  revalidatePath("/admin/staff");
}

export async function assignInstructorAction(formData: FormData) {
  const slotId = String(formData.get("slotId"));
  const raw = String(formData.get("instructorId") ?? "");
  await staff.assignInstructor(slotId, raw === "" ? null : raw);
  revalidatePath("/admin");
  revalidatePath("/admin/payroll");
}

export async function bookAction(formData: FormData) {
  await store.book(String(formData.get("slotId")), String(formData.get("memberId")), String(formData.get("date")));
  revalidatePath("/book");
}

export async function cancelAction(formData: FormData) {
  await store.cancel(String(formData.get("reservationId")));
  revalidatePath("/book");
  revalidatePath("/admin");
}

export async function checkInAction(formData: FormData) {
  await store.checkIn(String(formData.get("reservationId")));
  revalidatePath("/checkin");
}

// 출석은 "지금 로그인한 본인"만 할 수 있다.
//
// 예전에는 화면이 보내준 memberId 를 그대로 썼다. 그러면 남의 회원번호를 넣어
// 그 사람을 출석시키고 적립금까지 올려줄 수 있다. 번호는 서버가 쿠키에서 읽는다.
export async function selfCheckInAction(_memberId: string, lat: number, lng: number, accuracy?: number) {
  const me = await currentMemberId();
  if (!me) return { ok: false, msg: "로그인이 풀렸어요. 다시 로그인해 주세요." };
  const res = await store.selfCheckIn(me, lat, lng, accuracy);
  revalidatePath("/book");
  return res;
}

export async function addMemberAction(formData: FormData) {
  const name = String(formData.get("name")).trim();
  const phone = String(formData.get("phone")).trim();
  const branch = String(formData.get("branch")) as Branch;
  const birthdate = String(formData.get("birthdate") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  if (name) await store.addMember(name, phone, branch, birthdate, address);
  revalidatePath("/admin");
}

export async function issuePassAction(formData: FormData) {
  const memberId = String(formData.get("memberId"));
  const scope = (String(formData.get("scope")) || "both") as PassScope;

  // 판매 중인 상품을 고르면 이름·횟수·정기 여부가 자동으로 정해진다.
  // "직접 입력"일 때만 아래 값들을 쓴다.
  const picked = String(formData.get("product") ?? "");
  const product = picked && picked !== "custom" ? findProduct(picked) : undefined;

  const type = product ? product.type : String(formData.get("type") ?? "").trim();
  const total = product ? product.count : Number(formData.get("total") ?? 0);
  const monthly = product ? product.monthly : formData.get("monthly") === "on";
  const periodStart = String(formData.get("periodStart") ?? "").trim() || undefined;
  const expiresAt = String(formData.get("expiresAt") ?? "").trim() || undefined;

  // 무제한권은 횟수가 0이어도 발급된다.
  if (memberId && type && (isUnlimited(type) || total > 0)) {
    const passId = await store.issuePass(memberId, type, total, scope, { monthly, periodStart, expiresAt });

    // 결제 정보를 같이 적었으면 이력으로 남긴다. 금액을 비우면 상품 정가를 쓴다.
    const paidAt = String(formData.get("paidAt") ?? "").trim();
    if (paidAt) {
      const raw = String(formData.get("amount") ?? "").trim();
      const amount = raw ? Number(raw.replace(/[^0-9]/g, "")) : (product?.price ?? 0);
      try {
        await addPayment({
          memberId, passId, product: type,
          amount: Number.isFinite(amount) ? amount : 0,
          paidAt,
          startsAt: periodStart || paidAt,
          endsAt: expiresAt,
          method: String(formData.get("method") ?? "").trim() || undefined,
        });
      } catch (err) {
        // 결제 기록이 실패해도 수강권 발급 자체는 살린다.
        console.error("[issuePass] 결제 기록", err);
      }
    }
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/member/${memberId}`);
}

// 숫자 입력칸에 "170,000원" 처럼 들어와도 받아준다.
function wonToNumber(raw: string): number | undefined {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits === "" ? undefined : Number(digits);
}

export async function updatePassAction(formData: FormData) {
  const passId = String(formData.get("passId"));
  const memberId = String(formData.get("memberId"));
  if (!passId) return;

  const num = (k: string) => wonToNumber(String(formData.get(k) ?? ""));
  // 날짜는 비워서 저장하는 것도 뜻이 있다 (종료일 없음 = 계속). null 로 넘긴다.
  const dateOrNull = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };

  await store.updatePass(passId, {
    remaining: num("remaining"),
    total: num("total"),
    monthly: formData.get("monthly") === "on",
    periodStart: dateOrNull("periodStart"),
    expiresAt: dateOrNull("expiresAt"),
  });
  revalidatePath(`/admin/member/${memberId}`);
  revalidatePath("/admin");
}

export async function deletePassAction(formData: FormData) {
  const passId = String(formData.get("passId"));
  const memberId = String(formData.get("memberId"));
  if (passId) await store.deletePass(passId);
  revalidatePath(`/admin/member/${memberId}`);
  revalidatePath("/admin");
}

export async function updatePaymentAction(formData: FormData) {
  const id = String(formData.get("paymentId"));
  const memberId = String(formData.get("memberId"));
  if (!id) return;

  const paidAt = String(formData.get("paidAt") ?? "").trim();
  await updatePayment(id, {
    amount: wonToNumber(String(formData.get("amount") ?? "")),
    // 결제일은 비울 수 없다 — 비워서 보내면 그대로 둔다.
    paidAt: paidAt || undefined,
    startsAt: String(formData.get("startsAt") ?? "").trim(),
    endsAt: String(formData.get("endsAt") ?? "").trim(),
    method: String(formData.get("method") ?? "").trim(),
    memo: String(formData.get("memo") ?? "").trim(),
  });
  revalidatePath(`/admin/member/${memberId}`);
}

export async function deletePaymentAction(formData: FormData) {
  const id = String(formData.get("paymentId"));
  const memberId = String(formData.get("memberId"));
  if (id) await deletePayment(id);
  revalidatePath(`/admin/member/${memberId}`);
}

export async function addClassAction(formData: FormData) {
  const branch = String(formData.get("branch")) as Branch;
  const program = String(formData.get("program")) as ProgramName;
  const time = String(formData.get("time"));
  const repeat = formData.get("repeat") !== null;
  if (!time) {
    revalidatePath("/admin");
    return;
  }
  if (repeat) {
    const days = formData.getAll("dayOfWeek").map((d) => Number(d));
    for (const dow of days) await store.addSlot(branch, program, dow, time);
  } else {
    const date = String(formData.get("date"));
    if (date) await store.addOneTimeSlot(branch, program, date, time);
  }
  revalidatePath("/admin");
}

export async function setMemoAction(formData: FormData) {
  const memberId = String(formData.get("memberId"));
  const memo = String(formData.get("memo"));
  if (memberId) await store.setMemberMemo(memberId, memo);
  revalidatePath("/admin");
  revalidatePath(`/admin/member/${memberId}`);
}

export async function deleteSlotAction(formData: FormData) {
  const branch = String(formData.get("branch") ?? "");
  await store.deleteSlot(String(formData.get("slotId")));
  revalidatePath("/admin");
  revalidatePath("/book");
  // 지운 수업 상세에 그대로 남아 있으면 404 를 보게 된다.
  if (branch) redirect(`/admin?b=${encodeURIComponent(branch)}`);
}
