"use client";

import { C } from "./ui";
import { isDone, daysInMonthFor, todayParts } from "@/lib/data";

export default function CalendarGrid({ month, habit }) {
  const daysInMonth = daysInMonthFor();
  const today = todayParts().d;
  const cells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map((d) => {
        const entry = (month || {})[d]?.[habit.id];
        const done = d <= today ? isDone(entry, habit) : null;
        const isToday = d === today;
        let bg = "#F1EEE3";
        if (done === true) bg = "#E7F3E7";
        else if (done === false) bg = "#F7E4DF";
        return (
          <div
            key={d}
            className="aspect-square rounded-lg flex items-center justify-center text-[11px] font-semibold"
            style={{ background: bg, color: C.ink, outline: isToday ? `2px solid ${C.blueDeep}` : "none" }}
          >
            {d}
          </div>
        );
      })}
    </div>
  );
}
