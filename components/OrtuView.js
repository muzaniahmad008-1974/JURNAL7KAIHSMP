"use client";

import { useEffect, useRef, useState } from "react";
import { Info, CheckCircle2, Loader2, UserCog, ClipboardCheck } from "lucide-react";
import { Card, Chip, C } from "./ui";
import HabitDailyRow from "./HabitDailyRow";
import ReflectionPanel from "./ReflectionPanel";
import { getData, setData } from "@/lib/clientStorage";
import {
  HABITS, isDone, todayParts, monthKeyFor,
  journalKey, reflectionKey, waliNoteKey, dailyGuruNoteKey,
} from "@/lib/data";

export default function OrtuView({ student, className, schoolName, onLogout }) {
  const today = todayParts();
  const monthKey = monthKeyFor();

  const [tab, setTab] = useState("validasi");
  const [month, setMonth] = useState(null);
  const [reflections, setReflections] = useState(null);
  const [waliNote, setWaliNote] = useState("");
  const [dailyGuruNote, setDailyGuruNote] = useState("");
  const monthSaveRef = useRef(null);
  const reflectionSaveRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [m, r, wn, dgn] = await Promise.all([
        getData(journalKey(student.id, monthKey), {}),
        getData(reflectionKey(student.id, monthKey), {}),
        getData(waliNoteKey(student.id, monthKey), ""),
        getData(dailyGuruNoteKey(student.id, monthKey, today.d), ""),
      ]);
      if (alive) { setMonth(m); setReflections(r); setWaliNote(wn); setDailyGuruNote(dgn); }
    })();
    return () => { alive = false; };
  }, [student.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const safeMonth = month || {};
  const todayEntry = safeMonth[today.d] || {};
  const pending = HABITS.filter((h) => {
    const e = todayEntry[h.id];
    const hasEntry = h.type === "check" ? e?.value !== undefined : !!(e?.value || e?.centang !== undefined);
    return hasEntry && !e?.ortu;
  }).length;

  const updateToday = (habitId, value) => {
    setMonth((prev) => {
      const next = { ...(prev || {}), [today.d]: { ...(prev || {})[today.d], [habitId]: value } };
      monthSaveRef.current && clearTimeout(monthSaveRef.current);
      monthSaveRef.current = setTimeout(() => setData(journalKey(student.id, monthKey), next), 500);
      return next;
    });
  };

  const updateReflection = (habitId, value) => {
    setReflections((prev) => {
      const next = { ...(prev || {}), [habitId]: value };
      reflectionSaveRef.current && clearTimeout(reflectionSaveRef.current);
      reflectionSaveRef.current = setTimeout(() => setData(reflectionKey(student.id, monthKey), next), 500);
      return next;
    });
  };

  if (!month) {
    return <div className="py-16 text-center" style={{ color: C.sub }}><Loader2 className="animate-spin inline" /> Memuat data...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[12px]" style={{ color: C.sub }}>Kelas {className} &middot; {schoolName}</div>
          <h1 style={{ fontFamily: "'Baloo 2'", color: C.ink }} className="text-xl font-extrabold">Wali {student.name.split(" ")[0]}</h1>
        </div>
        <button onClick={onLogout} className="text-[12.5px] font-semibold" style={{ color: C.brick }}>Keluar</button>
      </div>

      <div className="flex gap-1.5 mb-4">
        {[["validasi", "Validasi Hari Ini"], ["refleksi", "Refleksi Bulanan"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold"
            style={tab === id ? { background: C.blueDeep, color: "white" } : { background: "#F1EEE3", color: C.sub }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "validasi" && (
        <div className="space-y-3">
          {dailyGuruNote?.trim() && (
            <Card style={{ background: "#E7F3E7", border: "none" }}>
              <div className="flex items-center gap-2 mb-1.5">
                <ClipboardCheck size={15} color={C.green} />
                <span className="text-[13px] font-semibold" style={{ color: C.green }}>Catatan Guru Hari Ini</span>
              </div>
              <p className="text-[12.5px]" style={{ color: C.ink }}>{dailyGuruNote}</p>
            </Card>
          )}
          {waliNote?.trim() && (
            <Card style={{ background: "#E4EEF7", border: "none" }}>
              <div className="flex items-center gap-2 mb-1.5">
                <UserCog size={15} color={C.blueDeep} />
                <span className="text-[13px] font-semibold" style={{ color: C.blueDeep }}>Catatan dari Wali Kelas</span>
              </div>
              <p className="text-[12.5px]" style={{ color: C.ink }}>{waliNote}</p>
            </Card>
          )}
          {pending > 0 ? (
            <Chip tone="gold"><Info size={12} /> {pending} kebiasaan menunggu validasi Anda</Chip>
          ) : (
            <Chip tone="green"><CheckCircle2 size={12} /> Semua aktivitas hari ini sudah divalidasi</Chip>
          )}
          <Card>
            {HABITS.map((h) => (
              <HabitDailyRow key={h.id} habit={h} entry={todayEntry[h.id]} onChange={(v) => updateToday(h.id, v)} canValidate validatedField="ortu" />
            ))}
          </Card>
          <p className="text-[12px]" style={{ color: C.sub }}>Ketuk ikon lencana di kanan untuk memberi validasi, menggantikan paraf pada catatan harian kertas.</p>
        </div>
      )}

      {tab === "refleksi" && (
        <ReflectionPanel studentName={student.name} reflections={reflections || {}} onChange={updateReflection} />
      )}
    </div>
  );
}
