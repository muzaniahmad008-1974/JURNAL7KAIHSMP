"use client";

import { C } from "./ui";
import { HABITS, habitTally, thresholdDays, getPeriodRange } from "@/lib/data";

export default function ClassTable({ rows, ambangMode, revealed = true, period = "bulanan" }) {
  const range = getPeriodRange(period);
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[12.5px] min-w-[720px]">
        <thead>
          <tr style={{ color: C.sub }}>
            <th className="text-left font-semibold py-1.5 px-1">No</th>
            <th className="text-left font-semibold py-1.5 px-1">{revealed ? "Nama" : "Siswa"}</th>
            <th className="text-left font-semibold py-1.5 px-1">P/L</th>
            {HABITS.map((h) => <th key={h.id} className="text-center font-semibold py-1.5 px-1">{h.label.split(" ")[0]}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.student.id} style={{ borderTop: `1px solid ${C.line}` }}>
              <td className="py-1.5 px-1">{i + 1}</td>
              <td className="py-1.5 px-1 font-medium" style={{ color: C.ink }}>{revealed ? r.student.name : `Siswa ${i + 1}`}</td>
              <td className="py-1.5 px-1">{r.student.gender}</td>
              {HABITS.map((h) => {
                const n = habitTally(r.month, h.id, range.days);
                const need = thresholdDays(ambangMode, range.total);
                const ok = n >= need;
                return (
                  <td key={h.id} className="text-center py-1.5 px-1">
                    <span className="px-1.5 py-0.5 rounded-md font-semibold" style={{ background: ok ? "#E7F3E7" : "#F7E4DF", color: ok ? C.green : C.brick }}>{n}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] mt-2" style={{ color: C.sub }}>Angka = jumlah hari tervalidasi dari {range.label}. Ambang &quot;sudah terbiasa&quot;: {thresholdDays(ambangMode, range.total)} dari {range.total} hari.</p>
    </div>
  );
}
