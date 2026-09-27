"use client";

import { useEffect, useMemo, useState } from "react";
import { School, Eye, Lock, Sparkles, Loader2, Plus, Pencil, X, Check } from "lucide-react";
import { Card, SectionTitle, Chip, GhostButton, PrimaryButton, AIInsightBlock, C } from "./ui";
import ClassTable from "./ClassTable";
import { HabitBarChart, SchoolCompareChart } from "./Charts";
import { getData, setData } from "@/lib/clientStorage";
import { askAI } from "@/lib/clientAi";
import {
  HABITS, SCHOOLS, CLASSES, STUDENTS, habitTally, monthKeyFor, journalKey,
  pendampinganKey, ambangModeKey, extraSchoolsKey, schoolOverridesKey,
} from "@/lib/data";

export default function PengawasView({ onLogout }) {
  const monthKey = monthKeyFor();
  const [ambangMode, setAmbangMode] = useState("ketat");
  const [extraSchools, setExtraSchools] = useState(null);
  const [schoolOverrides, setSchoolOverrides] = useState(null);
  const [allData, setAllData] = useState(null);
  const [focusSchool, setFocusSchool] = useState(null);
  const [revealReason, setRevealReason] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [pendampingan, setPendampingan] = useState(null);
  const [pForm, setPForm] = useState({ temuan: "", catatan: "", rencana: "", target: "", penanggungJawab: "" });
  const [draftingP, setDraftingP] = useState(false);
  const [draftingCatatan, setDraftingCatatan] = useState(false);

  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [editingSchoolId, setEditingSchoolId] = useState(null);
  const [editSchoolName, setEditSchoolName] = useState("");

  // Load ambang + the pengawas's own school-list edits first.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [ambang, extra, overrides] = await Promise.all([
        getData(ambangModeKey(), "ketat"),
        getData(extraSchoolsKey(), []),
        getData(schoolOverridesKey(), {}),
      ]);
      if (alive) { setAmbangMode(ambang); setExtraSchools(extra); setSchoolOverrides(overrides); }
    })();
    return () => { alive = false; };
  }, []);

  const allSchools = useMemo(() => {
    if (!extraSchools || !schoolOverrides) return null;
    return [...SCHOOLS, ...extraSchools].map((s) => ({ ...s, name: schoolOverrides[s.id] || s.name }));
  }, [extraSchools, schoolOverrides]);

  // Once the school list is known, load each school's class/student/journal data.
  useEffect(() => {
    if (!allSchools) return;
    let alive = true;
    (async () => {
      const perSchool = await Promise.all(allSchools.map(async (s) => {
        const cls = CLASSES.find((c) => c.schoolId === s.id); // may be undefined for a newly added school
        const students = cls ? STUDENTS.filter((st) => st.classId === cls.id) : [];
        const months = await Promise.all(students.map((st) => getData(journalKey(st.id, monthKey), {})));
        return { school: s, cls, rows: students.map((st, i) => ({ student: st, month: months[i] })) };
      }));
      if (alive) setAllData(perSchool);
    })();
    return () => { alive = false; };
  }, [allSchools]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focusSchool) return;
    setRevealed(false); setRevealReason("");
    getData(pendampinganKey(focusSchool), []).then(setPendampingan);
  }, [focusSchool]);

  const daysSoFar = new Date().getDate() - 1 || 1;
  const schoolStat = (rows) => {
    if (rows.length === 0) return 0;
    let doneTotal = 0, possible = 0;
    rows.forEach((r) => HABITS.forEach((h) => { possible++; doneTotal += habitTally(r.month, h.id) / daysSoFar; }));
    return Math.round((doneTotal / possible) * 100);
  };

  const wilayahPrompt = useMemo(() => {
    if (!allData) return "";
    const summary = allData.map((d) => `${d.school.name}: kelengkapan ${schoolStat(d.rows)}%`).join("; ");
    return `Pengawas membina ${allData.length} sekolah dengan ringkasan kelengkapan pembiasaan: ${summary}. Balas HANYA JSON: {"temuan":"...","pola":"...","rekomendasi":"..."} untuk pengawas pembina, sertakan sekolah mana yang perlu diverifikasi lebih lanjut tanpa menuduh gagal.`;
  }, [allData]); // eslint-disable-line react-hooks/exhaustive-deps

  const addSchool = async () => {
    if (!newSchoolName.trim()) return;
    const next = [...extraSchools, { id: "sek-" + Date.now(), name: newSchoolName.trim() }];
    setExtraSchools(next);
    await setData(extraSchoolsKey(), next);
    setNewSchoolName("");
    setShowSchoolForm(false);
  };

  const startEditSchool = (s) => { setEditingSchoolId(s.id); setEditSchoolName(s.name); };
  const cancelEditSchool = () => { setEditingSchoolId(null); setEditSchoolName(""); };

  const saveEditSchool = async () => {
    if (!editSchoolName.trim()) return;
    const next = { ...schoolOverrides, [editingSchoolId]: editSchoolName.trim() };
    setSchoolOverrides(next);
    await setData(schoolOverridesKey(), next);
    cancelEditSchool();
  };

  const addPendampingan = async () => {
    if (!pForm.temuan.trim()) return;
    const next = [...pendampingan, { id: Date.now(), ...pForm, status: "berjalan" }];
    setPendampingan(next);
    await setData(pendampinganKey(focusSchool), next);
    setPForm({ temuan: "", catatan: "", rencana: "", target: "", penanggungJawab: "" });
  };

  const aiDraftCatatan = async () => {
    setDraftingCatatan(true);
    try {
      const schoolName = allSchools.find((s) => s.id === focusSchool)?.name;
      const draft = await askAI(`Sebagai pengawas pembina, saya menemukan: "${pForm.temuan}" di ${schoolName}. Susun draf singkat (2-3 kalimat) catatan pendampingan yang mendeskripsikan kondisi sekolah dan proses pendampingan, nada membimbing bukan menghakimi, tanpa menyimpulkan sebab pasti sebelum diverifikasi. Balas hanya draf catatannya.`);
      setPForm((f) => ({ ...f, catatan: draft }));
    } catch (e) { /* silent */ } finally { setDraftingCatatan(false); }
  };

  const aiDraftRTL = async () => {
    setDraftingP(true);
    try {
      const schoolName = allSchools.find((s) => s.id === focusSchool)?.name;
      const draft = await askAI(`Sebagai pengawas pembina, saya menemukan: "${pForm.temuan}" di ${schoolName}. Susun draf singkat (2 kalimat) rencana tindak lanjut yang konkret dan bisa disepakati bersama kepala sekolah, dengan target terukur. Balas hanya draf rencananya.`);
      setPForm((f) => ({ ...f, rencana: draft }));
    } catch (e) { /* silent */ } finally { setDraftingP(false); }
  };

  const loading = !allSchools || !allData;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[12px]" style={{ color: C.sub }}>Pengawas Pembina</div>
          <h1 style={{ fontFamily: "'Baloo 2'", color: C.ink }} className="text-xl font-extrabold">Sekolah Binaan</h1>
        </div>
        <button onClick={onLogout} className="text-[12.5px] font-semibold" style={{ color: C.brick }}>Keluar</button>
      </div>

      {loading ? (
        <div className="py-10 text-center" style={{ color: C.sub }}><Loader2 className="animate-spin inline" /> Memuat data sekolah binaan...</div>
      ) : (
        <div className="space-y-4">
          <Card>
            <SectionTitle title="Kelola Sekolah Binaan" right={!showSchoolForm && <GhostButton icon={Plus} onClick={() => setShowSchoolForm(true)}>Tambah Sekolah</GhostButton>} />
            <div className="space-y-1.5 mb-2">
              {allSchools.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: "#EFEAD9" }}>
                  {editingSchoolId === s.id ? (
                    <>
                      <input value={editSchoolName} onChange={(e) => setEditSchoolName(e.target.value)} className="flex-1 min-w-0 rounded-lg px-2 py-1 text-[13px]" style={{ border: `1px solid ${C.line}` }} autoFocus />
                      <button onClick={saveEditSchool} title="Simpan" className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "white" }}><Check size={13} color={C.green} /></button>
                      <button onClick={cancelEditSchool} title="Batal" className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "white" }}><X size={13} color={C.brick} /></button>
                    </>
                  ) : (
                    <>
                      <span className="text-[13px] font-medium flex-1 min-w-0" style={{ color: C.ink }}>{s.name}</span>
                      <button onClick={() => startEditSchool(s)} title="Edit nama sekolah" className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "white" }}><Pencil size={13} color={C.blueDeep} /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
            {showSchoolForm && (
              <div className="flex items-center gap-2 mt-2">
                <input value={newSchoolName} onChange={(e) => setNewSchoolName(e.target.value)} placeholder="Nama sekolah baru" className="flex-1 min-w-0 rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} autoFocus />
                <PrimaryButton icon={Plus} onClick={addSchool}>Simpan</PrimaryButton>
                <GhostButton icon={X} onClick={() => { setShowSchoolForm(false); setNewSchoolName(""); }}>Batal</GhostButton>
              </div>
            )}
            <p className="text-[11px] mt-2" style={{ color: C.sub }}>Sekolah yang baru ditambahkan belum punya data kelas/murid — lengkapi lewat dashboard Admin Sekolah.</p>
          </Card>

          <div className="grid sm:grid-cols-2 gap-3">
            {allData.map(({ school, rows }) => {
              const pct = schoolStat(rows);
              const tone = pct >= 80 ? "green" : pct >= 60 ? "gold" : "brick";
              return (
                <Card key={school.id} style={{ cursor: "pointer", outline: focusSchool === school.id ? `2px solid ${C.blueDeep}` : "none" }}>
                  <div onClick={() => setFocusSchool(school.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><School size={16} color={C.blueDeep} /><span className="font-semibold text-[13.5px]" style={{ color: C.ink }}>{school.name}</span></div>
                      <Chip tone={tone}>{pct}%</Chip>
                    </div>
                    <div className="text-[12px] mt-1" style={{ color: C.sub }}>{rows.length} siswa aktif &middot; kelengkapan pengisian jurnal</div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card>
            <SectionTitle title="Grafik Ringkasan Semua Sekolah Binaan" />
            <SchoolCompareChart data={allData.map((d) => ({ school: d.school, pct: schoolStat(d.rows) }))} />
          </Card>

          <Card>
            <SectionTitle title="Grafik per Sekolah Binaan" />
            <div className="grid sm:grid-cols-2 gap-4">
              {allData.map(({ school, rows }) => (
                <div key={school.id}>
                  <div className="text-[12.5px] font-semibold mb-1.5" style={{ color: C.ink }}>{school.name}</div>
                  {rows.length > 0 ? <HabitBarChart rows={rows} /> : <p className="text-[12px]" style={{ color: C.sub }}>Belum ada data murid.</p>}
                </div>
              ))}
            </div>
          </Card>

          <AIInsightBlock title="Wawasan AI Wilayah" prompt={wilayahPrompt} />

          {focusSchool && (
            <>
              <Card>
                <SectionTitle
                  title={`Rekap Kelas \u2014 ${allSchools.find((s) => s.id === focusSchool).name}`}
                  right={!revealed ? (
                    <div className="flex items-center gap-2">
                      <input value={revealReason} onChange={(e) => setRevealReason(e.target.value)} placeholder="Alasan pendampingan..." className="rounded-lg px-2.5 py-1.5 text-[12.5px]" style={{ border: `1px solid ${C.line}` }} />
                      <GhostButton icon={Eye} onClick={() => revealReason.trim() && setRevealed(true)}>Buka data individu</GhostButton>
                    </div>
                  ) : <Chip tone="blue"><Lock size={11} /> Dibuka: {revealReason}</Chip>}
                />
                {(() => {
                  const focusRows = allData.find((d) => d.school.id === focusSchool).rows;
                  return focusRows.length > 0
                    ? <ClassTable rows={focusRows} ambangMode={ambangMode} revealed={revealed} />
                    : <p className="text-[13px]" style={{ color: C.sub }}>Sekolah ini belum punya data kelas/murid.</p>;
                })()}
              </Card>

              <Card>
                <SectionTitle title="Modul Pendampingan" />
                <div className="space-y-2 mb-3">
                  {(pendampingan || []).length === 0 && <p className="text-[13px]" style={{ color: C.sub }}>Belum ada catatan pendampingan untuk sekolah ini.</p>}
                  {(pendampingan || []).map((p) => (
                    <div key={p.id} className="rounded-xl p-3" style={{ background: "#EFEAD9" }}>
                      <div className="text-[13px] font-semibold mb-0.5" style={{ color: C.ink }}>{p.temuan}</div>
                      {p.catatan && <div className="text-[12.5px] mt-1 italic" style={{ color: C.ink }}>{p.catatan}</div>}
                      <div className="text-[12.5px] mt-1" style={{ color: C.sub }}>{p.rencana}</div>
                      <div className="text-[11px] mt-1 flex gap-2" style={{ color: C.sub }}>
                        {p.target && <span>Target: {p.target}</span>}
                        {p.penanggungJawab && <span>&middot; PJ: {p.penanggungJawab}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <textarea value={pForm.temuan} onChange={(e) => setPForm({ ...pForm, temuan: e.target.value })} placeholder="Temuan di lapangan" rows={2} className="w-full rounded-lg p-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-semibold" style={{ color: C.sub }}>Catatan Pendampingan</span>
                    <button onClick={aiDraftCatatan} disabled={!pForm.temuan.trim() || draftingCatatan} className="text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-40" style={{ color: C.blueDeep }}>
                      {draftingCatatan ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Bantuan AI
                    </button>
                  </div>
                  <textarea value={pForm.catatan} onChange={(e) => setPForm({ ...pForm, catatan: e.target.value })} placeholder="Ceritakan kondisi sekolah dan proses pendampingan" rows={3} className="w-full rounded-lg p-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-semibold" style={{ color: C.sub }}>Rencana Tindak Lanjut</span>
                    <button onClick={aiDraftRTL} disabled={!pForm.temuan.trim() || draftingP} className="text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-40" style={{ color: C.blueDeep }}>
                      {draftingP ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Bantuan AI
                    </button>
                  </div>
                  <textarea value={pForm.rencana} onChange={(e) => setPForm({ ...pForm, rencana: e.target.value })} rows={2} className="w-full rounded-lg p-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input value={pForm.target} onChange={(e) => setPForm({ ...pForm, target: e.target.value })} placeholder="Target" className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
                    <input value={pForm.penanggungJawab} onChange={(e) => setPForm({ ...pForm, penanggungJawab: e.target.value })} placeholder="Penanggung jawab" className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
                  </div>
                  <button onClick={addPendampingan} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13.5px] font-bold text-white" style={{ background: C.blueDeep }}>Simpan Rencana Pendampingan</button>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
