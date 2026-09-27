"use client";

import { useState } from "react";
import { ChevronDown, Sparkles, Loader2 } from "lucide-react";
import { Card, C } from "./ui";
import { askAI } from "@/lib/clientAi";
import { HABITS } from "@/lib/data";

export default function ReflectionPanel({ studentName, reflections, onChange }) {
  const [open, setOpen] = useState(HABITS[0].id);
  const [drafting, setDrafting] = useState(null);

  const draftAI = async (habit) => {
    setDrafting(habit.id);
    try {
      const draft = await askAI(
        `Kamu membantu ${studentName}, siswa SMP, menulis refleksi singkat (2 kalimat, bahasa anak SMP, positif dan jujur) tentang kebiasaan "${habit.label}" bulan ini, dan satu kalimat rencana tindak lanjut. Balas HANYA JSON: {"kesimpulan":"...","tindakLanjut":"..."}`,
        { json: true }
      );
      onChange(habit.id, { ...(reflections[habit.id] || {}), kesimpulan: draft.kesimpulan, tindakLanjut: draft.tindakLanjut });
    } catch (e) {
      /* silent fail — user can still type manually */
    } finally {
      setDrafting(null);
    }
  };

  return (
    <div className="space-y-2">
      {HABITS.map((h) => {
        const isOpen = open === h.id;
        const r = reflections[h.id] || {};
        const Icon = h.icon;
        return (
          <Card key={h.id} className="!p-0 overflow-hidden" style={{ borderLeft: `4px solid ${h.color}` }}>
            <button onClick={() => setOpen(isOpen ? null : h.id)} className="w-full flex items-center gap-2 px-3.5 py-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: h.color }}>
                <Icon size={14} color="white" />
              </div>
              <span className="text-[13.5px] font-semibold flex-1 min-w-0 text-left" style={{ color: C.ink }}>{h.label}</span>
              <ChevronDown size={16} className="shrink-0" style={{ transform: isOpen ? "rotate(180deg)" : "none", color: C.sub }} />
            </button>
            {isOpen && (
              <div className="px-3.5 pb-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold" style={{ color: C.sub }}>Kesimpulan / Refleksi</span>
                  <button onClick={() => draftAI(h)} disabled={drafting === h.id} className="text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-40" style={{ color: C.blueDeep }}>
                    {drafting === h.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Bantuan AI
                  </button>
                </div>
                <textarea
                  value={r.kesimpulan || ""}
                  onChange={(e) => onChange(h.id, { ...r, kesimpulan: e.target.value })}
                  placeholder="Apa yang terjadi bulan ini?"
                  rows={2}
                  className="w-full rounded-lg p-2 text-[13px]"
                  style={{ border: `1px solid ${C.line}` }}
                />
                <span className="text-[11.5px] font-semibold" style={{ color: C.sub }}>Tindak Lanjut</span>
                <textarea
                  value={r.tindakLanjut || ""}
                  onChange={(e) => onChange(h.id, { ...r, tindakLanjut: e.target.value })}
                  placeholder="Apa yang akan dilakukan bulan depan?"
                  rows={2}
                  className="w-full rounded-lg p-2 text-[13px]"
                  style={{ border: `1px solid ${C.line}` }}
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
