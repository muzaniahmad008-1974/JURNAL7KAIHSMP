"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { C } from "./ui";
import { HABITS, habitTally, getPeriodRange } from "@/lib/data";

export function HabitBarChart({ rows, period = "bulanan" }) {
  const range = getPeriodRange(period);
  const chartData = HABITS.map((h) => {
    if (rows.length === 0) return { name: h.label.split(" ")[0], pct: 0 };
    const total = rows.reduce((acc, r) => acc + habitTally(r.month, h.id, range.days), 0);
    const pct = Math.round((total / (rows.length * range.total)) * 100);
    return { name: h.label.split(" ")[0], pct };
  });
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ left: -20 }}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.sub }} />
        <YAxis tick={{ fontSize: 11, fill: C.sub }} unit="%" />
        <Tooltip formatter={(v) => v + "%"} />
        <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
          {chartData.map((d, i) => <Cell key={i} fill={d.pct < 60 ? C.brick : d.pct < 80 ? C.gold : C.green} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SchoolCompareChart({ data }) {
  const chartData = data.map((d) => ({ name: d.school.name.replace("SMP Negeri ", "SMPN "), pct: d.pct }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ left: -20 }}>
        <CartesianGrid stroke={C.line} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.sub }} />
        <YAxis tick={{ fontSize: 11, fill: C.sub }} unit="%" domain={[0, 100]} />
        <Tooltip formatter={(v) => v + "%"} />
        <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={70}>
          {chartData.map((d, i) => <Cell key={i} fill={d.pct < 60 ? C.brick : d.pct < 80 ? C.gold : C.green} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
