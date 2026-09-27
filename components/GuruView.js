"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ClipboardList, PenLine, CheckCircle2 } from "lucide-react";
import { Card, SectionTitle, GhostButton, AIInsightBlock, C } from "./ui";
import ClassTable from "./ClassTable";
import { HabitBarChart } from "./Charts";
import HabitDailyRow from "./HabitDailyRow";
import { getData, setData } from "@/lib/clientStorage";
import {
  HABITS, CLASSES, SCHOOLS, STUDENTS, MONTH_NAMES,
  habitTally, thresholdDays, getPeriodRange, todayParts, monthKeyFor,
  journalKey, waliNoteKey, dailyGuruNoteKey,
} from "@/lib/data";

function buildRecapHtml({ schoolName, className, wali, rows, ambangMode, period }) {
  const range = getPeriodRange(period);
  const periodLabel = period === "mingguan" ? "Rekap Mingguan" : "Rekap Bulanan";
  const headerCells = HABITS.map((h) => `<th style="border:1px solid #999;padding:6px;background:#0A3B63;color:#fff;font-size:11px;">${h.label}</th>`).join("");
  const bodyRows = rows.map((r, i) => {
    const cells = HABITS.map((h) => {
      const n = habitTally(r.month, h.id, range.days);
      const ok = n >= thresholdDays(ambangMode, range.total);
      return `<td style="border:1px solid #999;padding:6px;text-align:center;background:${ok ? "#E7F3E7" : "#F7E4DF"};">${n}</td>`;
    }).join("");
    return `<tr><td style="border:1px solid #999;padding:6px;">${i + 1}</td><td style="border:1px solid #999;padding:6px;">${r.student.name}</td><td style="border:1px solid #999;padding:6px;text-align:center;">${r.student.gender}</td>${cells}</tr>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${periodLabel} - ${className}</title></head>
    <body style="font-family:Arial,sans-serif;color:#1E2422;padding:16px;">
      <h2 style="margin-bottom:2px;">SI-7KAIH AI &middot; ${periodLabel}</h2>
      <p style="margin:0 0 2px;color:#555;">${schoolName} &middot; Kelas ${className} &middot; Wali Kelas: ${wali}</p>
      <p style="margin:0 0 12px;color:#777;font-size:12px;">Periode: ${range.label}</p>
      <table style="border-collapse:collapse;width:100%;font-size:12px;">
        <thead><tr>
          <th style="border:1px solid #999;padding:6px;background:#0A3B63;color:#fff;font-size:11px;">No</th>
          <th style="border:1px solid #999;padding:6px;background:#0A3B63;color:#fff;font-size:11px;">Nama</th>
          <th style="border:1px solid #999;padding:6px;background:#0A3B63;color:#fff;font-size:11px;">P/L</th>
          ${headerCells}
        </tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
      <p style="font-size:11px;color:#777;margin-top:10px;">Dicetak dari SI-7KAIH AI.</p>
    </body></html>`;
}

function exportPdf(html) {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => {
    try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } finally {
      setTimeout(() => iframe.parentNode && document.body.removeChild(iframe), 1000);
    }
  }, 350);
}

function exportWord(html, filename) {
  const wordDoc = html.replace("<head>", `<head><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->`);
  const blob = new Blob(["\ufeff", wordDoc], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function ExportMenu({ onExport }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <GhostButton icon={ClipboardList} onClick={() => setOpen((o) => !o)}>Cetak / Ekspor</GhostButton>
      {open && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-xl overflow-hidden z-20" style={{ background: "white", border: `1px solid ${C.line}`, boxShadow: "0 12px 26px -12px rgba(0,0,0,.3)" }}>
          <button onClick={() => { setOpen(false); onExport("pdf"); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-left" style={{ color: C.ink }}>
            <ClipboardList size={14} color={C.blueDeep} /> Cetak / PDF
          </button>
          <button onClick={() => { setOpen(false); onExport("word"); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-left" style={{ color: C.ink, borderTop: `1px solid ${C.line}` }}>
            <PenLine size={14} color={C.blueDeep} /> Unduh Word
          </button>
        </div>
      )}
    </div>
  );
}

function WaliNoteBox({ studentName, value, onSave }) {
  const [text, setText] = useState(value || "");
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);
  useEffect(() => { setText(value || ""); }, [value]);
  const handleChange = (v) => {
    setText(v); setSaved(false);
    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { onSave(v); setSaved(true); }, 600);
  };
  return (
    <div className="rounded-xl p-3" style={{ background: "#EFEAD9" }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12.5px] font-semibold" style={{ color: C.ink }}>{studentName}</span>
        {saved && <span className="text-[10.5px] inline-flex items-center gap-1" style={{ color: C.green }}><CheckCircle2 size={11} /> Tersimpan</span>}
      </div>
      <textarea value={text} onChange={(e) => handleChange(e.target.value)} rows={2} placeholder="Catatan untuk murid ini (terlihat oleh murid dan orang tua)" className="w-full rounded-lg p-2 text-[12.5px]" style={{ border: `1px solid ${C.line}`, background: "white" }} />
    </div>
  );
}

export default function GuruView({ classId: initialClassId, onLogout }) {
  const monthKey = monthKeyFor();
  const today = todayParts();
  const [classId, setClassId] = useState(initialClassId);
  const [rows, setRows] = useState(null);
  const [period, setPeriod] = useState("bulanan");
  const [waliNotes, setWaliNotes] = useState(null);
  const [validateStudentId, setValidateStudentId] = useState("");
  const [dailyNote, setDailyNote] = useState("");
  const [dailyNoteLoaded, setDailyNoteLoaded] = useState(false);
  const [ambangMode, setAmbangMode] = useState("ketat");
  const dailyNoteRef = useRef(null);

  const cls = CLASSES.find((c) => c.id === classId);
  const school = SCHOOLS.find((s) => s.id === cls.schoolId);

  useEffect(() => {
    let alive = true;
    (async () => {
      setRows(null);
      const [ambang, students] = [await getData("config:ambang", "ketat"), STUDENTS.filter((s) => s.classId === classId)];
      const months = await Promise.all(students.map((s) => getData(journalKey(s.id, monthKey), {})));
      if (!alive) return;
      setAmbangMode(ambang);
      setRows(students.map((s, i) => ({ student: s, month: months[i] })));
    })();
    return () => { alive = false; };
  }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!rows) return;
    let alive = true;
    Promise.all(rows.map((r) => getData(waliNoteKey(r.student.id, monthKey), ""))).then((notes) => {
      if (alive) setWaliNotes(Object.fromEntries(rows.map((r, i) => [r.student.id, notes[i]])));
    });
    if (!validateStudentId && rows.length > 0) setValidateStudentId(rows[0].student.id);
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!validateStudentId) return;
    let alive = true;
    setDailyNoteLoaded(false);
    getData(dailyGuruNoteKey(validateStudentId, monthKey, today.d), "").then((v) => {
      if (alive) { setDailyNote(v); setDailyNoteLoaded(true); }
    });
    return () => { alive = false; };
  }, [validateStudentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveWaliNote = async (studentId, text) => {
    setWaliNotes((prev) => ({ ...(prev || {}), [studentId]: text }));
    await setData(waliNoteKey(studentId, monthKey), text);
  };

  const saveDailyNote = (text) => {
    setDailyNote(text);
    dailyNoteRef.current && clearTimeout(dailyNoteRef.current);
    dailyNoteRef.current = setTimeout(() => setData(dailyGuruNoteKey(validateStudentId, monthKey, today.d), text), 600);
  };

  const updateValidateEntry = async (habitId, value) => {
    const nextRows = rows.map((r) => r.student.id === validateStudentId
      ? { ...r, month: { ...r.month, [today.d]: { ...r.month[today.d], [habitId]: value } } }
      : r);
    setRows(nextRows);
    const updatedMonth = nextRows.find((r) => r.student.id === validateStudentId).month;
    await setData(journalKey(validateStudentId, monthKey), updatedMonth);
  };

  const prompt = useMemo(() => {
    if (!rows) return "";
    const range = getPeriodRange(period);
    const stats = HABITS.map((h) => {
      const total = rows.reduce((a, r) => a + habitTally(r.month, h.id, range.days), 0);
      return `${h.label}: ${Math.round((total / (rows.length * range.total)) * 100)}%`;
    }).join(", ");
    return `Data kelas ${cls.name} (${school.name}), ${rows.length} siswa, periode ${range.label}. Persentase pembiasaan per kebiasaan: ${stats}. Balas HANYA JSON valid: {"temuan":"...","pola":"...","rekomendasi":"..."} masing-masing 1-2 kalimat untuk guru wali kelas.`;
  }, [rows, cls, school, period]);

  const handleExport = (format) => {
    if (!rows || rows.length === 0) return;
    const html = buildRecapHtml({ schoolName: school.name, className: cls.name, wali: cls.wali, rows, ambangMode, period });
    const tag = period === "mingguan" ? "Mingguan" : "Bulanan";
    if (format === "pdf") exportPdf(html);
    else exportWord(html, `Rekap-${tag}-Kelas-${cls.name}.doc`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="text-[12px]" style={{ color: C.sub }}>Guru Wali Kelas &middot; {school.name}</div>
          <h1 style={{ fontFamily: "'Baloo 2'", color: C.ink }} className="text-xl font-extrabold">Kelas {cls.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg px-3 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }}>
            {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.name} — {SCHOOLS.find((s) => s.id === c.schoolId).name}</option>)}
          </select>
          <button onClick={onLogout} className="text-[12.5px] font-semibold" style={{ color: C.brick }}>Keluar</button>
        </div>
      </div>

      {!rows ? (
        <div className="py-10 text-center" style={{ color: C.sub }}><Loader2 className="animate-spin inline" /> Memuat data kelas...</div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-1.5">
            {[["bulanan", "Rekap Bulanan"], ["mingguan", "Rekap Mingguan"]].map(([id, label]) => (
              <button key={id} onClick={() => setPeriod(id)} className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold" style={period === id ? { background: C.blueDeep, color: "white" } : { background: "#F1EEE3", color: C.sub }}>{label}</button>
            ))}
          </div>

          {rows.length > 0 && <AIInsightBlock title="Wawasan AI Kelas" prompt={prompt} />}
          <Card>
            <SectionTitle title="Grafik Pembiasaan Kelas" />
            <HabitBarChart rows={rows} period={period} />
          </Card>
          <Card>
            <SectionTitle title={period === "mingguan" ? "Rekap Mingguan (setara Lampiran 3)" : "Rekap Bulanan (setara Lampiran 3)"} right={<ExportMenu onExport={handleExport} />} />
            <ClassTable rows={rows} ambangMode={ambangMode} revealed period={period} />
          </Card>

          <Card>
            <SectionTitle title="Validasi Jurnal Harian Murid" />
            <p className="text-[12px] mb-3" style={{ color: C.sub }}>Validasi aktivitas hari ini, dan tinggalkan catatan harian untuk murid yang dipilih.</p>
            <select value={validateStudentId} onChange={(e) => setValidateStudentId(e.target.value)} className="w-full rounded-lg px-3 py-2 text-[13px] mb-3" style={{ border: `1px solid ${C.line}` }}>
              {rows.map((r) => <option key={r.student.id} value={r.student.id}>{r.student.name}</option>)}
            </select>
            {(() => {
              const activeRow = rows.find((r) => r.student.id === validateStudentId);
              const todayEntry = activeRow ? (activeRow.month[today.d] || {}) : {};
              return (
                <div className="rounded-xl p-1" style={{ border: `1px solid ${C.line}` }}>
                  {HABITS.map((h) => (
                    <HabitDailyRow key={h.id} habit={h} entry={todayEntry[h.id]} onChange={(v) => updateValidateEntry(h.id, v)} canValidate validatedField="guru" />
                  ))}
                </div>
              );
            })()}
            <div className="mt-3">
              <div className="text-[12px] font-semibold mb-1" style={{ color: C.sub }}>Catatan Harian Guru ({today.d} {MONTH_NAMES[today.m - 1]})</div>
              <textarea value={dailyNote} onChange={(e) => saveDailyNote(e.target.value)} disabled={!dailyNoteLoaded} rows={2} placeholder="Catatan untuk hari ini (terlihat oleh murid dan orang tua)" className="w-full rounded-lg p-2 text-[12.5px]" style={{ border: `1px solid ${C.line}`, background: dailyNoteLoaded ? "white" : "#F1EEE3" }} />
            </div>
          </Card>

          <Card>
            <SectionTitle title="Catatan Wali Kelas" />
            <p className="text-[12px] mb-3" style={{ color: C.sub }}>Catatan ini otomatis terlihat oleh murid dan orang tua yang bersangkutan.</p>
            <div className="space-y-2">
              {rows.map((r) => (
                <WaliNoteBox key={r.student.id} studentName={r.student.name} value={waliNotes ? waliNotes[r.student.id] : ""} onSave={(text) => saveWaliNote(r.student.id, text)} />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
