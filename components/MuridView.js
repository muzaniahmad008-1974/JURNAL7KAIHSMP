"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar, ClipboardList, MessageCircle, Award, UserCircle2, Flame,
  Lightbulb, Sprout, Loader2, Send, UserCog, ClipboardCheck,
} from "lucide-react";
import { Card, Chip, C } from "./ui";
import HabitDailyRow from "./HabitDailyRow";
import CalendarGrid from "./CalendarGrid";
import ReflectionPanel from "./ReflectionPanel";
import { getData, setData } from "@/lib/clientStorage";
import { askAI } from "@/lib/clientAi";
import {
  HABITS, RAINBOW, isDone, todayParts, monthKeyFor, weekNumFor,
  journalKey, reflectionKey, reflectionWeekKey, waliNoteKey, dailyGuruNoteKey,
} from "@/lib/data";

const QUOTES = [
  "Kebiasaan kecil yang diulang setiap hari akan tumbuh menjadi karakter yang besar.",
  "Bangun pagi hari ini adalah hadiah untuk dirimu di masa depan.",
  "Tidak ada hari tanpa satu kebiasaan baik yang dijaga.",
  "Konsisten hari ini, hebat di kemudian hari.",
];

export default function MuridView({ student, className, schoolName, onLogout }) {
  const today = todayParts();
  const monthKey = monthKeyFor();
  const weekNum = weekNumFor();

  const [tab, setTab] = useState("beranda");
  const [month, setMonth] = useState(null);
  const [reflections, setReflections] = useState(null);
  const [weeklyReflections, setWeeklyReflections] = useState(null);
  const [reflectionPeriod, setReflectionPeriod] = useState("bulanan");
  const [waliNote, setWaliNote] = useState("");
  const [dailyGuruNote, setDailyGuruNote] = useState("");
  const [calHabit, setCalHabit] = useState(HABITS[0].id);
  const [ask, setAsk] = useState("");
  const [answer, setAnswer] = useState(null);
  const [asking, setAsking] = useState(false);
  const badgesRef = useRef(null);
  const monthSaveRef = useRef(null);
  const reflectionSaveRef = useRef(null);
  const weeklySaveRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [m, r, wr, wn, dgn] = await Promise.all([
        getData(journalKey(student.id, monthKey), {}),
        getData(reflectionKey(student.id, monthKey), {}),
        getData(reflectionWeekKey(student.id, monthKey, weekNum), {}),
        getData(waliNoteKey(student.id, monthKey), ""),
        getData(dailyGuruNoteKey(student.id, monthKey, today.d), ""),
      ]);
      if (alive) {
        setMonth(m); setReflections(r); setWeeklyReflections(wr);
        setWaliNote(wn); setDailyGuruNote(dgn);
      }
    })();
    return () => { alive = false; };
  }, [student.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const safeMonth = month || {};
  const todayEntry = safeMonth[today.d] || {};
  const doneCount = HABITS.filter((h) => isDone(todayEntry[h.id], h)).length;
  const dailyQuote = QUOTES[today.d % QUOTES.length];

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

  const updateWeeklyReflection = (habitId, value) => {
    setWeeklyReflections((prev) => {
      const next = { ...(prev || {}), [habitId]: value };
      weeklySaveRef.current && clearTimeout(weeklySaveRef.current);
      weeklySaveRef.current = setTimeout(() => setData(reflectionWeekKey(student.id, monthKey, weekNum), next), 500);
      return next;
    });
  };

  const streak = useMemo(() => {
    let s = 0;
    for (let d = today.d - 1; d >= 1; d--) {
      const e = safeMonth[d];
      if (!e) break;
      const n = HABITS.filter((h) => isDone(e[h.id], h)).length;
      if (n >= 5) s++; else break;
    }
    return s;
  }, [safeMonth, today.d]);

  const badges = [];
  if (streak >= 5) badges.push({ label: "Konsisten 5 Hari", icon: Flame, color: RAINBOW[0] });
  if (isDone(todayEntry.bangunPagi, HABITS[0])) badges.push({ label: "Bangun Pagi Hebat", icon: HABITS[0].icon, color: HABITS[0].color });

  const quickAccess = [
    { label: "Kalender", icon: Calendar, tone: RAINBOW[4], onClick: () => setTab("kalender") },
    { label: "Refleksi", icon: ClipboardList, tone: RAINBOW[2], onClick: () => setTab("refleksi") },
    { label: "Teman AI", icon: MessageCircle, tone: RAINBOW[1], onClick: () => setTab("teman-ai") },
    { label: "Pencapaian", icon: Award, tone: RAINBOW[3], onClick: () => badgesRef.current?.scrollIntoView({ behavior: "smooth" }) },
  ];

  const askCoach = async () => {
    if (!ask.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const text = await askAI(
        `Kamu adalah teman AI yang ramah untuk siswa SMP bernama ${student.name}, membantu soal kebiasaan baik (7 KAIH), belajar, dan motivasi. Jangan menilai keimanan atau memberi diagnosis kesehatan/psikologis. Jawab singkat (maks 4 kalimat), hangat, bahasa Indonesia santai untuk anak SMP. Pertanyaan: "${ask}"`
      );
      setAnswer(text);
    } catch (e) {
      setAnswer("Maaf, Teman AI belum bisa menjawab sekarang. Coba lagi sebentar lagi, ya.");
    } finally {
      setAsking(false);
    }
  };

  if (!month) {
    return <div className="py-16 text-center" style={{ color: C.sub }}><Loader2 className="animate-spin inline" /> Memuat jurnal...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[12px]" style={{ color: C.sub }}>Kelas {className} &middot; {schoolName}</div>
          <h1 style={{ fontFamily: "'Baloo 2'", color: C.ink }} className="text-xl font-extrabold">Halo, {student.name.split(" ")[0]}!</h1>
        </div>
        <button onClick={onLogout} className="text-[12.5px] font-semibold" style={{ color: C.brick }}>Keluar</button>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[["beranda", "Beranda"], ["kalender", "Kalender"], ["refleksi", "Refleksi"], ["teman-ai", "Teman AI"]].map(([id, label]) => (
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

      {tab === "beranda" && (
        <div className="space-y-3">
          <Card className="!p-0 overflow-hidden" style={{ background: "linear-gradient(135deg,#1E7FD6,#4CAF50 60%,#F7B32B)" }}>
            <div className="px-4 py-4 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold text-white leading-snug">Semangat menjalani kebiasaan hari ini!</p>
                <p className="text-[11.5px] mt-1 text-white/90 leading-snug">Setiap kebiasaan kecil membangun karaktermu.</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-4 gap-1">
            {quickAccess.map((q) => (
              <button key={q.label} onClick={q.onClick} className="flex flex-col items-center gap-1 min-w-0">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm shrink-0" style={{ background: q.tone }}>
                  <q.icon size={16} color="white" />
                </div>
                <span className="text-[9.5px] font-medium text-center leading-tight" style={{ color: C.ink }}>{q.label}</span>
              </button>
            ))}
          </div>

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

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px]" style={{ color: C.sub }}>Progres hari ini</div>
                <div style={{ fontFamily: "'Baloo 2'", color: C.ink }} className="text-2xl font-extrabold">{doneCount} / 7</div>
              </div>
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(from 0deg, #E4572E, #F7B32B, #4CAF50, #17A398, #1E7FD6 ${(doneCount / 7) * 360}deg, #F1EEE3 0deg)` }}>
                <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-[12px] font-bold" style={{ color: C.ink }}>
                  {Math.round((doneCount / 7) * 100)}%
                </div>
              </div>
            </div>
            {streak > 0 && <div className="mt-2"><Chip tone="gold"><Flame size={12} /> {streak} hari beruntun konsisten</Chip></div>}
          </Card>

          <Card>
            <div className="text-[13px] font-semibold mb-1" style={{ color: C.ink }}>Jurnal hari ini</div>
            {HABITS.map((h) => (
              <HabitDailyRow key={h.id} habit={h} entry={todayEntry[h.id]} onChange={(v) => updateToday(h.id, v)} />
            ))}
          </Card>

          <div ref={badgesRef}>
            <Card>
              <div className="text-[13px] font-semibold mb-2" style={{ color: C.ink }}>Lencana</div>
              {badges.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {badges.map((b) => (
                    <span key={b.label} style={{ background: b.color, color: "white" }} className="px-2.5 py-1 rounded-full text-[12px] font-semibold inline-flex items-center gap-1">
                      <b.icon size={12} /> {b.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px]" style={{ color: C.sub }}>Selesaikan lebih banyak kebiasaan hari ini untuk mengumpulkan lencana.</p>
              )}
            </Card>
          </div>

          <Card style={{ background: "#FBF0D6", border: "none" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Lightbulb size={15} color="#8A6408" />
              <span className="text-[13px] font-semibold" style={{ color: "#5B4A05" }}>Motivasi Hari Ini</span>
            </div>
            <p className="text-[12.5px] italic" style={{ color: "#6B5710" }}>&ldquo;{dailyQuote}&rdquo;</p>
            <div className="flex justify-end mt-1"><Sprout size={22} color={C.green} /></div>
          </Card>
        </div>
      )}

      {tab === "kalender" && (
        <div className="space-y-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {HABITS.map((h) => (
              <button
                key={h.id}
                onClick={() => setCalHabit(h.id)}
                className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5"
                style={calHabit === h.id ? { background: h.color, color: "white" } : { background: "#F1EEE3", color: C.sub }}
              >
                <h.icon size={12} /> {h.label}
              </button>
            ))}
          </div>
          <Card>
            <CalendarGrid month={safeMonth} habit={HABITS.find((h) => h.id === calHabit)} />
            <div className="flex gap-3 mt-3 text-[11px]" style={{ color: C.sub }}>
              <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#E7F3E7" }} /> Terlaksana</span>
              <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#F7E4DF" }} /> Belum</span>
              <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#F1EEE3" }} /> Akan datang</span>
            </div>
          </Card>
        </div>
      )}

      {tab === "refleksi" && (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {[["bulanan", "Refleksi Bulanan"], ["mingguan", `Refleksi Minggu ${weekNum}`]].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setReflectionPeriod(id)}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={reflectionPeriod === id ? { background: C.blueDeep, color: "white" } : { background: "#F1EEE3", color: C.sub }}
              >
                {label}
              </button>
            ))}
          </div>
          <ReflectionPanel
            studentName={student.name}
            reflections={reflectionPeriod === "bulanan" ? (reflections || {}) : (weeklyReflections || {})}
            onChange={reflectionPeriod === "bulanan" ? updateReflection : updateWeeklyReflection}
          />
        </div>
      )}

      {tab === "teman-ai" && (
        <Card>
          <div className="text-[13px] font-semibold mb-2" style={{ color: C.ink }}>Tanya Teman AI</div>
          <textarea
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            placeholder="Tanya apa saja soal kebiasaan baik, belajar, atau semangat harimu..."
            rows={3}
            className="w-full rounded-lg p-2.5 text-[13px] mb-2"
            style={{ border: `1px solid ${C.line}` }}
          />
          <button
            onClick={askCoach}
            disabled={asking || !ask.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
            style={{ background: C.blueDeep }}
          >
            {asking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Tanya
          </button>
          {answer && (
            <div className="mt-3 rounded-xl p-3 text-[13px]" style={{ background: "#EFEAD9", color: C.ink }}>{answer}</div>
          )}
        </Card>
      )}
    </div>
  );
}
