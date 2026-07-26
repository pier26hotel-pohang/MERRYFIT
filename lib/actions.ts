"use server";
// 서버 액션 — 폼 제출 시 데이터 변경 처리
import { revalidatePath } from "next/cache";
import * as store from "./store";
import { Branch, ProgramName, PassScope } from "./types";

export async function bookAction(formData: FormData) {
  store.book(
    String(formData.get("slotId")),
    String(formData.get("memberId")),
    String(formData.get("date"))
  );
  revalidatePath("/book");
}

export async function cancelAction(formData: FormData) {
  store.cancel(String(formData.get("reservationId")));
  revalidatePath("/book");
}

export async function checkInAction(formData: FormData) {
  store.checkIn(String(formData.get("reservationId")));
  revalidatePath("/checkin");
}

// 위치 검증 셀프 체크인 (클라이언트에서 좌표와 함께 호출)
export async function selfCheckInAction(memberId: string, lat: number, lng: number) {
  const res = store.selfCheckIn(memberId, lat, lng);
  revalidatePath("/book");
  return res;
}

export async function addMemberAction(formData: FormData) {
  const name = String(formData.get("name")).trim();
  const phone = String(formData.get("phone")).trim();
  const branch = String(formData.get("branch")) as Branch;
  if (name) store.addMember(name, phone, branch);
  revalidatePath("/admin");
}

export async function issuePassAction(formData: FormData) {
  const memberId = String(formData.get("memberId"));
  const type = String(formData.get("type")).trim();
  const total = Number(formData.get("total"));
  const scope = (String(formData.get("scope")) || "both") as PassScope;
  if (memberId && type && total > 0) store.issuePass(memberId, type, total, scope);
  revalidatePath("/admin");
}

// 수업 추가: 매주 반복(여러 요일) 또는 1회성(특정 날짜)
export async function addClassAction(formData: FormData) {
  const branch = String(formData.get("branch")) as Branch;
  const program = String(formData.get("program")) as ProgramName;
  const time = String(formData.get("time"));
  const repeat = formData.get("repeat") !== null; // 체크박스: 켜지면 존재
  if (!time) {
    revalidatePath("/admin");
    return;
  }
  if (repeat) {
    const days = formData.getAll("dayOfWeek").map((d) => Number(d));
    for (const dow of days) store.addSlot(branch, program, dow, time);
  } else {
    const date = String(formData.get("date"));
    if (date) store.addOneTimeSlot(branch, program, date, time);
  }
  revalidatePath("/admin");
}

export async function setMemoAction(formData: FormData) {
  const memberId = String(formData.get("memberId"));
  const memo = String(formData.get("memo"));
  if (memberId) store.setMemberMemo(memberId, memo);
  revalidatePath("/admin");
}

export async function deleteSlotAction(formData: FormData) {
  store.deleteSlot(String(formData.get("slotId")));
  revalidatePath("/admin");
}
