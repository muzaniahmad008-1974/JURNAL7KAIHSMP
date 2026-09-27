"use client";

import { Check, X, BadgeCheck, ClipboardList, PenLine } from "lucide-react";
import { C } from "./ui";
import { isDone, HABIT_ACTIVITY_OPTIONS, MULTI_SELECT_HABITS } from "@/lib/data";

/**
 * One habit's row inside a daily journal: icon, label, the check/time
 * control, an optional "jenis aktivitas" selector (single or multi-select),
 * a free-text note, and — when `canValidate` is set — a validation badge a
 * parent (validatedField="ortu") or teacher (validatedField="guru") can tap.
 */
export default function HabitDailyRow({ habit, entry, onChange, canValidate, validatedField }) {
  const Icon = habit.icon;
  const done = isDone(entry, habit);
  const hasEntry = habit.type === "check" ? entry?.value !== undefined : !!(entry?.value || entry?.centang !== undefined);
  const isMulti = MULTI_SELECT_HABITS.has(habit.id);
  const selectedMulti = Array.isArray(entry?.jenisAktivitas) ? entry.jenisAktivitas : [];

  const toggleMultiOption = (opt) => {
    const next = selectedMulti.includes(opt) ? selectedMulti.filter((o) => o !== opt) : [...selectedMulti, opt];
    onChange({ ...entry, jenisAktivitas: next });
  };

  return (
    <div className="py-2.5" style={{ borderBottom: `1px solid ${C.line}` }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: habit.color }}>
          <Icon size={18} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold" style={{ color: C.ink }}>{habit.label}</div>
          {habit.target && <div className="text-[11.5px]" style={{ color: C.sub }}>{habit.target}</div>}
        </div>

        {habit.type === "check" ? (
          <button
            onClick={() => onChange({ ...entry, value: !entry?.value })}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: entry?.value ? "#E7F3E7" : "#F7E4DF" }}
          >
            {entry?.value ? <Check size={18} color={C.green} /> : <X size={18} color={C.brick} />}
          </button>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="time"
              value={entry?.value || ""}
              onChange={(e) => onChange({ ...entry, value: e.target.value })}
              className="rounded-lg px-2 py-1.5 text-[13px] w-[92px]"
              style={{ border: `2px solid ${entry?.value ? habit.color : habit.color + "55"}`, background: "#fff" }}
            />
            <button
              onClick={() => onChange({ ...entry, centang: !entry?.centang })}
              title={entry?.centang ? "Sudah dicentang" : "Tandai selesai"}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: done ? "#E7F3E7" : "#F7E4DF" }}
            >
              {done ? <Check size={18} color={C.green} /> : <X size={18} color={C.brick} />}
            </button>
          </div>
        )}

        {canValidate && hasEntry && (
          <button
            onClick={() => onChange({ ...entry, [validatedField]: !entry?.[validatedField] })}
            title="Validasi"
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: entry?.[validatedField] ? "#E4EEF7" : "#F1EEE3" }}
          >
            <BadgeCheck size={16} color={entry?.[validatedField] ? C.blueDeep : C.sub} />
          </button>
        )}
      </div>

      <div className="mt-2 ml-12 space-y-1.5">
        {isMulti ? (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <ClipboardList size={12} className="shrink-0" style={{ color: C.sub }} />
              <span className="text-[11px]" style={{ color: C.sub }}>Jenis aktivitas (opsional, boleh lebih dari satu)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(HABIT_ACTIVITY_OPTIONS[habit.id] || []).map((opt) => {
                const active = selectedMulti.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleMultiOption(opt)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium inline-flex items-center gap-1"
                    style={active ? { background: habit.color, color: "white" } : { background: "#F1EEE3", color: C.sub }}
                  >
                    {active && <Check size={10} />}
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <ClipboardList size={12} className="shrink-0" style={{ color: C.sub }} />
            <select
              value={typeof entry?.jenisAktivitas === "string" ? entry.jenisAktivitas : ""}
              onChange={(e) => onChange({ ...entry, jenisAktivitas: e.target.value })}
              className="flex-1 min-w-0 text-[12px] px-2 py-1.5 rounded-lg outline-none"
              style={{ border: `1px solid ${C.line}`, background: "#FBFAF6", color: entry?.jenisAktivitas ? C.ink : C.sub }}
            >
              <option value="">Pilih jenis aktivitas (opsional)</option>
              {(HABIT_ACTIVITY_OPTIONS[habit.id] || []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <PenLine size={12} className="shrink-0" style={{ color: C.sub }} />
          <input
            value={entry?.catatan || ""}
            onChange={(e) => onChange({ ...entry, catatan: e.target.value })}
            placeholder="Keterangan aktivitas (opsional)"
            className="flex-1 min-w-0 text-[12px] px-2 py-1.5 rounded-lg outline-none"
            style={{ border: `1px solid ${C.line}`, background: "#FBFAF6", color: C.ink }}
          />
        </div>
      </div>
    </div>
  );
}
