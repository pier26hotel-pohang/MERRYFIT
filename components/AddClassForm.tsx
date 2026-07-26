"use client";
import { useState } from "react";
import { addClassAction } from "@/lib/actions";
import { DOW_LABEL, WEEK_ORDER } from "@/lib/week-constants";

const inputCls = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm";
const btnCls = "w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800";

export function AddClassForm({ branch }: { branch: string }) {
  const [repeat, setRepeat] = useState(true);

  return (
    <form action={addClassAction} className="space-y-3">
      <input type="hidden" name="branch" value={branch} />

      {/* 매주 반복 여부 */}
      <label className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm font-medium">
        <input
          type="checkbox"
          name="repeat"
          checked={repeat}
          onChange={(e) => setRepeat(e.target.checked)}
          className="accent-emerald-700"
        />
        매주 반복 수업 (끄면 1회성)
      </label>

      {repeat ? (
        <div>
          <div className="mb-1 text-xs text-neutral-500">반복할 요일 (여러 개 선택)</div>
          <div className="flex flex-wrap gap-1">
            {WEEK_ORDER.map((d) => (
              <label
                key={d}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50"
              >
                <input type="checkbox" name="dayOfWeek" value={d} className="accent-emerald-700" />
                매주 {DOW_LABEL[d]}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-1 text-xs text-neutral-500">날짜 (그날 하루만 열림)</div>
          <input type="date" name="date" className={inputCls} required />
        </div>
      )}

      <div className="flex gap-2">
        <select name="program" className={inputCls} defaultValue="기구 필라테스">
          <option>기구 필라테스</option>
          <option>바레</option>
          <option>필라웨이트</option>
          <option>단체수업</option>
        </select>
        <input type="time" name="time" className={inputCls} required />
      </div>

      <button className={btnCls}>
        {repeat ? `매주 반복 수업 추가 (${branch})` : `1회성 수업 추가 (${branch})`}
      </button>
    </form>
  );
}
