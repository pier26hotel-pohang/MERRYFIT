"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as store from "./store";
import * as staff from "./staff";
import * as consult from "./consult";
import { Branch, ProgramName, PassScope, DEFAULT_BRANCH } from "./types";
import { MIN_PASSWORD } from "./password";
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
  if (store.getMemberByPhone(db, phone)) redirect("/signup?e=dup");
  let id: string;
  try {
    id = await store.addMember(name, phone, branch, birthdate, address, password);
  } catch (err) {
    // 저장에 실패하면 쿠키만 심어두고 넘어가는 일이 없도록 여기서 끊는다.
    console.error("[signup]", err);
    redirect("/signup?e=save");
  }
  (await cookies()).set(MEMBER_COOKIE, id, { httpOnly: true, path: "/", maxAge: YEAR });
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
  if (password.length < MIN_PASSWORD) redirect("/setup-admin?e=pw");
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
  if (!name || !loginId || password.length < 4) redirect("/admin/staff?e=input");
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

export async function selfCheckInAction(memberId: string, lat: number, lng: number) {
  const res = await store.selfCheckIn(memberId, lat, lng);
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
  const type = String(formData.get("type")).trim();
  const total = Number(formData.get("total"));
  const scope = (String(formData.get("scope")) || "both") as PassScope;
  if (memberId && type && total > 0) await store.issuePass(memberId, type, total, scope);
  revalidatePath("/admin");
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
  await store.deleteSlot(String(formData.get("slotId")));
  revalidatePath("/admin");
}
