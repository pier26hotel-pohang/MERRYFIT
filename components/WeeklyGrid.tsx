import React from "react";
import { DOW_LABEL, WEEK_ORDER } from "@/lib/store";

// 시간(세로) × 요일(가로) 시간표 격자.
// cell(dow, time) 이 각 칸의 내용을 렌더링한다.
export function WeeklyGrid({
  times,
  cell,
}: {
  times: string[];
  cell: (dow: number, time: string) => React.ReactNode;
}) {
  if (times.length === 0) {
    return <p className="text-sm text-neutral-400">등록된 수업이 없습니다.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full border-collapse text-center">
        <thead>
          <tr className="bg-neutral-50">
            <th className="sticky left-0 z-10 bg-neutral-50 px-1 py-2 text-[11px] text-neutral-400">
              시간
            </th>
            {WEEK_ORDER.map((dow) => (
              <th
                key={dow}
                className="min-w-[48px] px-1 py-2 text-xs font-semibold text-neutral-600"
              >
                {DOW_LABEL[dow]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((t) => (
            <tr key={t} className="border-t border-neutral-100">
              <th className="sticky left-0 z-10 bg-white px-1 py-2 text-xs font-semibold text-neutral-700">
                {t}
              </th>
              {WEEK_ORDER.map((dow) => (
                <td key={dow} className="p-1 align-top">
                  {cell(dow, t)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function programAbbrev(program: string): string {
  switch (program) {
    case "기구 필라테스":
      return "기구";
    case "필라웨이트":
      return "필웨";
    case "단체수업":
      return "단체";
    default:
      return program;
  }
}
