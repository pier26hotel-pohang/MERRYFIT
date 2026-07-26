"use client";
import { cancelAction } from "@/lib/actions";

// 취소 전 확인창을 띄우는 클라이언트 버튼
export function CancelButton({
  reservationId,
  className,
  confirmText = "이 예약을 취소할까요?",
  children,
}: {
  reservationId: string;
  className?: string;
  confirmText?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={cancelAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="reservationId" value={reservationId} />
      <button className={className}>{children}</button>
    </form>
  );
}
