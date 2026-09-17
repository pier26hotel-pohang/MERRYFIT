"use client";
import { useEffect, useRef } from "react";

// 같은 name 의 체크박스를 max 개까지만 고를 수 있게 한다.
// 서버에서도 max 개로 자르지만, 사용자가 모르게 버려지지 않도록 화면에서 먼저 막는다.
export function LimitChecks({ name, max, children }: { name: string; max: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const boxes = () => Array.from(root.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`));
    const sync = () => {
      const list = boxes();
      const full = list.filter((b) => b.checked).length >= max;
      list.forEach((b) => {
        b.disabled = full && !b.checked;
      });
    };
    root.addEventListener("change", sync);
    sync();
    return () => root.removeEventListener("change", sync);
  }, [name, max]);

  return <div ref={ref}>{children}</div>;
}
