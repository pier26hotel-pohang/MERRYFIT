"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as store from "./store";
import { Branch, ProgramName, PassScope } from "./types";
import { ADMIN_ID, ADMIN_PW, ADMIN_COOKIE, MEMBER_COOKIE } from "./auth";

const YEAR = 60 * 60 * 24 * 30;

export async function adminLoginAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const pw = String(formData.get("pw") ?? "").trim();
  if (id === ADMIN_ID && pw === ADMIN_PW) {
    (await cookies()).set(ADMIN_COOKIE, "1", { httpOnly: true, path: "/", maxAge: YEAR });
    redirect("/admin");
  }
  redirect("/login?e=admin");
}

export async function memberPhoneLoginAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  const db = await store.loadSnapshot();
  const m = store.getMemberByPhone(db, phone);
  if (m) {
    (await cookies()).set(MEMBER_COOKIE, m.id, { httpOnly: true, path: "/", maxAge: YEAR });
    redirect("/book");
  }
  redirect("/login?e=member");
}

export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const birthdate = String(formData.get("birthdate") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const branch = (String(formData.get("branch") ?? "1호점") as Branch);
  if (!name || !phone) redirect("/signup?e=1");
  const db = await store.loadSnapshot();
  if (store.getMemberByPhone(db, phone)) redirect("/signup?e=dup");
  const id = await store.addMember(name, phone, branch, birthdate, address);
  (await cookies()).set(MEMBER_COOKIE, id, { httpOnly: true, path: "/", maxAge: YEAR });
  redirect("/book");
}

export async function logoutAction() {
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
  c.delete(MEMBER_COOKIE);
  redirect("/login");
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
