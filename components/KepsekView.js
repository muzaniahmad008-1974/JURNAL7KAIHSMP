"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, X, BadgeCheck, Sparkles } from "lucide-react";
import { Card, SectionTitle, Chip, PrimaryButton, GhostButton, AIInsightBlock, C } from "./ui";
import { HabitBarChart } from "./Charts";
import { getData, setData } from "@/lib/clientStorage";
import { askAI } from "@/lib/clientAi";
import {
  HABITS, HABIT_MAP, CLASSES, SCHOOLS, STUDENTS,
  habitTally, getPeriodRange, monthKeyFor, journalKey, programsKey, ambangModeKey,
  extraSchoolsKey, schoolOverridesKey,
} from "@/lib/data";

export default function KepsekView({ schoolId: initialSchoolId, onLogout }) {
  const monthKey = monthKeyFor();
  const [schoolId, setSchoolId] = useState(initialSchoolId);
  const [rows, setRows] = useState(null);
  const [ambangMode, setAmbangMode] = useState("ketat");
  const [programs, setPrograms] = useState(null);
  const [form, setForm] = useState({ nama: "", kebiasaan: HABITS[0].id, jadwal: "", koordinator: "" });
  const [editingId, setEditingId] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [extraSchools, setExtraSchools] = useState([]);
  const [schoolOverrides, setSchoolOverrides] = useState({});

  const allSchools = useMemo(
    () => [...SCHOOLS, ...extraSchools].map((s) => ({ ...s, name: schoolOverrides[s.id] || s.name })),
    [extraSchools, schoolOverrides]
  );
  const cls = CLASSES.find((c) => c.schoolId === schoolId);
  const school = allSchools.find((s) => s.id === schoolId) || SCHOOLS[0];

  useEffect(() => {
    getData(extraSchoolsKey(), []).then(setExtraSchools);
    getData(schoolOverridesKey(), {}).then(setSchoolOverrides);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setRows(null);
      const [ambang, progs, students] = await Promise.all([
        getData(ambangModeKey(), "ketat"),
        getData(programsKey(schoolId), []),
        cls ? STUDENTS.filter((s) => s.classId === cls.id) : [],
      ]);
      const months = await Promise.all(students.map((s) => getData(journalKey(s.id, monthKey), {})));
      if (!alive) return;
      setAmbangMode(ambang);
      setPrograms(progs);
      setRows(students.map((s, i) => ({ student: s, month: months[i] })));
    })();
    return () => { alive = false; };
  }, [schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setForm({ nama: "", kebiasaan: HABITS[0].id, jadwal: "", koordinator: "" });
    setEditingId(null);
    setSuggestions(null);
  };

  const saveProgram = async () => {
    if (!form.nama.trim()) return;
    const next = editingId
      ? programs.map((p) => (p.id === editingId ? { ...p, ...form } : p))
      : [...programs, { id: Date.now(), ...form }];
    setPrograms(next);
    await setData(programsKey(schoolId), next);
    resetForm();
  };

  const startEdit = (p) => { setForm({ nama: p.nama, kebiasaan: p.kebiasaan, jadwal: p.jadwal, koordinator: p.koordinator || "" }); setEditingId(p.id); setSuggestions(null); };

  const deleteProgram = async (id) => {
    if (typeof window !== "undefined" && window.confirm && !window.confirm("Hapus program ini?")) return;
    const next = programs.filter((p) => p.id !== id);
    setPrograms(next);
    await setData(programsKey(schoolId), next);
    if (editingId === id) resetForm();
  };

  const statsText = useMemo(() => {
    if (!rows) return "";
    if (rows.length === 0) return "belum ada data murid";
    const range = getPeriodRange("bulanan");
    return HABITS.map((h) => {
      const total = rows.reduce((a, r) => a + habitTally(r.month, h.id, range.days), 0);
      return `${h.label}: ${Math.round((total / (rows.length * range.total)) * 100)}%`;
    }).join(", ");
  }, [rows]);

  const prompt = useMemo(() => {
    if (!rows) return "";
    return `Data agregat ${school.name}, ${rows.length} siswa. Persentase pembiasaan per kebiasaan: ${statsText}. Balas HANYA JSON: {"temuan":"...","pola":"...","rekomendasi":"..."} untuk kepala sekolah, rekomendasi berupa ide program sekolah konkret.`;
  }, [rows, school, statsText]);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const names = await askAI(
        `Data agregat ${school.name}: ${statsText}. Sarankan 4 nama program sekolah yang singkat, khas, dan mudah diingat, untuk memperkuat kebiasaan yang paling lemah. Balas HANYA JSON array of string.`,
        { json: true }
      );
      setSuggestions(Array.isArray(names) ? names : []);
    } catch (e) {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const saveAmbang = async (mode) => {
    setAmbangMode(mode);
    await setData(ambangModeKey(), mode);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="text-[12px]" style={{ color: C.sub }}>Kepala Sekolah</div>
          <h1 style={{ fontFamily: "'Baloo 2'", color: C.ink }} className="text-xl font-extrabold">{school.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="rounded-lg px-3 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }}>
            {allSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={onLogout} className="text-[12.5px] font-semibold" style={{ color: C.brick }}>Keluar</button>
        </div>
      </div>

      {!rows ? (
        <div className="py-10 text-center" style={{ color: C.sub }}><Loader2 className="animate-spin inline" /> Memuat data sekolah...</div>
      ) : (
        <div className="space-y-4">
          <AIInsightBlock title="Wawasan AI Sekolah" prompt={prompt} />

          <Card>
            <SectionTitle title="Grafik Pembiasaan Sekolah" />
            <HabitBarChart rows={rows} />
          </Card>

          <Card>
            <SectionTitle title="Ambang &quot;Sudah Terbiasa&quot;" />
            <div className="flex gap-2">
              {[["longgar", "Longgar — ceil(2/3 \u00d7 hari)"], ["ketat", "Ketat — sesuai contoh Buku Panduan"]].map(([id, label]) => (
                <button key={id} onClick={() => saveAmbang(id)} className="flex-1 rounded-xl px-3 py-2.5 text-[12.5px] font-semibold text-left" style={ambangMode === id ? { background: C.blueDeep, color: "white" } : { background: "#F1EEE3", color: C.sub }}>
                  {label}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle title="Program Sekolah" />
            <div className="space-y-2 mb-3">
              {programs.length === 0 && <p className="text-[13px]" style={{ color: C.sub }}>Belum ada program tercatat.</p>}
              {programs.map((p) => (
                <div key={p.id} className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ background: editingId === p.id ? "#E4EEF7" : "#EFEAD9" }}>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold" style={{ color: C.ink }}>{p.nama}</div>
                    <div className="text-[12px]" style={{ color: C.sub }}>{HABIT_MAP[p.kebiasaan]?.label} &middot; {p.jadwal}{p.koordinator ? ` \u00b7 Koordinator: ${p.koordinator}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(p)} title="Edit" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "white" }}><Pencil size={13} color={C.blueDeep} /></button>
                    <button onClick={() => deleteProgram(p.id)} title="Hapus" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "white" }}><Trash2 size={13} color={C.brick} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {editingId && (
                <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: C.blueDeep }}>
                  <Pencil size={12} /> Mengedit program &middot; <button type="button" onClick={resetForm} className="underline">Batal</button>
                </div>
              )}
              <div className="flex gap-2">
                <input placeholder="Nama program" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="flex-1 min-w-0 rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
                <GhostButton onClick={fetchSuggestions} icon={loadingSuggestions ? Loader2 : Sparkles}>Sugesti AI</GhostButton>
              </div>
              {suggestions && (suggestions.length > 0 ? (
                <select value="" onChange={(e) => e.target.value && setForm({ ...form, nama: e.target.value })} className="w-full rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }}>
                  <option value="">Pilih dari sugesti AI...</option>
                  {suggestions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : <p className="text-[11.5px]" style={{ color: C.sub }}>Sugesti AI belum bisa dimuat. Coba lagi sebentar lagi.</p>)}
              <div className="grid sm:grid-cols-3 gap-2">
                <select value={form.kebiasaan} onChange={(e) => setForm({ ...form, kebiasaan: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }}>
                  {HABITS.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
                </select>
                <input placeholder="Jadwal (mis. Jumat, 07.00)" value={form.jadwal} onChange={(e) => setForm({ ...form, jadwal: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
                <input placeholder="Koordinator program" value={form.koordinator} onChange={(e) => setForm({ ...form, koordinator: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
              </div>
              <div className="flex items-center gap-2">
                <PrimaryButton icon={editingId ? BadgeCheck : Plus} onClick={saveProgram}>{editingId ? "Simpan Perubahan" : "Tambah Program"}</PrimaryButton>
                {editingId && <GhostButton onClick={resetForm} icon={X}>Batal</GhostButton>}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
