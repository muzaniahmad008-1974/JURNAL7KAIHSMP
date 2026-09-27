// lib/data.js
//
// Domain constants and pure helper functions for SI-7KAIH AI. Safe to import
// from both client and server code — no secrets, no I/O.

import {
  Sunrise, HeartHandshake, Dumbbell, Utensils, BookOpen, Users, Moon,
} from "lucide-react";

export const RAINBOW = ["#E4572E", "#F7B32B", "#4CAF50", "#17A398", "#1E7FD6", "#7B5EDB", "#EF5DA8"];

export const HABITS = [
  { id: "bangunPagi", label: "Bangun Pagi", icon: Sunrise, type: "time", target: "04.00\u201306.00", color: RAINBOW[0] },
  { id: "beribadah", label: "Beribadah", icon: HeartHandshake, type: "check", target: null, color: RAINBOW[1] },
  { id: "olahraga", label: "Berolahraga", icon: Dumbbell, type: "check", target: "30 menit/hari", color: RAINBOW[2] },
  { id: "makanSehat", label: "Makan Sehat dan Bergizi", icon: Utensils, type: "check", target: "Isi Piringku", color: RAINBOW[3] },
  { id: "gemarBelajar", label: "Gemar Belajar", icon: BookOpen, type: "check", target: null, color: RAINBOW[4] },
  { id: "bermasyarakat", label: "Bermasyarakat", icon: Users, type: "check", target: null, color: RAINBOW[5] },
  { id: "tidurCepat", label: "Tidur Cepat", icon: Moon, type: "time", target: "8\u20139 jam", color: RAINBOW[6] },
];
export const HABIT_MAP = Object.fromEntries(HABITS.map((h) => [h.id, h]));

export const HABIT_ACTIVITY_OPTIONS = {
  bangunPagi: ["Bangun sendiri", "Dibangunkan orang tua", "Pakai alarm", "Lainnya"],
  beribadah: ["Ibadah wajib", "Ibadah sunnah/tambahan", "Berdoa", "Lainnya"],
  olahraga: ["Senam", "Jalan kaki", "Lari", "Bersepeda", "Olahraga tim (mis. sepak bola)", "Lainnya"],
  makanSehat: ["Sarapan lengkap", "Ada sayur dan buah", "Minum air putih cukup", "Lainnya"],
  gemarBelajar: ["Membaca buku", "Latihan soal", "Video edukasi", "Eksperimen", "Belajar kelompok", "Lainnya"],
  bermasyarakat: ["Membantu orang lain", "Gotong royong", "Kegiatan sosial", "Kegiatan lingkungan", "Lainnya"],
  tidurCepat: ["Tidur tanpa layar (screen-free)", "Tidur setelah membaca buku", "Tidur setelah belajar", "Lainnya"],
};
export const MULTI_SELECT_HABITS = new Set(["beribadah", "olahraga", "makanSehat", "gemarBelajar", "bermasyarakat"]);

export const SCHOOLS = [
  { id: "smp1", name: "SMP Negeri 1 Pesisir" },
  { id: "smp2", name: "SMP Negeri 2 Pesisir" },
];
export const CLASSES = [
  { id: "viiiA", schoolId: "smp1", name: "VIII A", wali: "Ibu Rahmawati, S.Pd." },
  { id: "viiB", schoolId: "smp2", name: "VII B", wali: "Bapak Hendra Gunawan, S.Pd." },
];
export const STUDENTS = [
  { id: "s1", classId: "viiiA", name: "Ahmad Riyadi", gender: "L" },
  { id: "s2", classId: "viiiA", name: "Siti Nurhaliza", gender: "P" },
  { id: "s3", classId: "viiiA", name: "Budi Santoso", gender: "L" },
  { id: "s4", classId: "viiiA", name: "Dewi Lestari", gender: "P" },
  { id: "s5", classId: "viiiA", name: "Eko Prasetyo", gender: "L" },
  { id: "s6", classId: "viiiA", name: "Fitriani", gender: "P" },
  { id: "s7", classId: "viiB", name: "Andi Setiawan", gender: "L" },
  { id: "s8", classId: "viiB", name: "Lestari Indah", gender: "P" },
  { id: "s9", classId: "viiB", name: "Hendra Pratama", gender: "L" },
  { id: "s10", classId: "viiB", name: "Nia Ramadhani", gender: "P" },
  { id: "s11", classId: "viiB", name: "Dedi Susanto", gender: "L" },
  { id: "s12", classId: "viiB", name: "Melinda Sari", gender: "P" },
];

export const ROLES = [
  { id: "murid", label: "Murid", color: "#F7B32B" },
  { id: "ortu", label: "Orang Tua", color: "#17A398" },
  { id: "guru", label: "Guru Wali Kelas", color: "#4CAF50" },
  { id: "kepsek", label: "Kepala Sekolah", color: "#1E7FD6" },
  { id: "pengawas", label: "Pengawas Pembina", color: "#E4572E" },
  { id: "admin", label: "Admin Sekolah", color: "#7B5EDB" },
];

export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function todayParts(date = new Date()) {
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}
export function pad2(n) { return String(n).padStart(2, "0"); }

export function monthKeyFor(date = new Date()) {
  const t = todayParts(date);
  return `${t.y}-${pad2(t.m)}`;
}
export function daysInMonthFor(date = new Date()) {
  const t = todayParts(date);
  return new Date(t.y, t.m, 0).getDate();
}
export function weekNumFor(date = new Date()) {
  return Math.ceil(todayParts(date).d / 7);
}

// Storage key builders — one JSON file per key in the shared Drive folder.
export const journalKey = (studentId, monthKey) => `journal:${studentId}:${monthKey}`;
export const reflectionKey = (studentId, monthKey) => `refleksi:${studentId}:${monthKey}`;
export const reflectionWeekKey = (studentId, monthKey, weekNum) => `refleksi-mingguan:${studentId}:${monthKey}-M${weekNum}`;
export const programsKey = (schoolId) => `program:${schoolId}`;
export const pendampinganKey = (schoolId) => `pendampingan:${schoolId}`;
export const waliNoteKey = (studentId, monthKey) => `catatan-wali:${studentId}:${monthKey}`;
export const dailyGuruNoteKey = (studentId, monthKey, day) => `catatan-harian-guru:${studentId}:${monthKey}:${day}`;
export const extraStudentsKey = (schoolId) => `admin:extra-students:${schoolId}`;
export const extraClassesKey = (schoolId) => `admin:extra-classes:${schoolId}`;
export const extraGuruKey = (schoolId) => `admin:extra-guru:${schoolId}`;
export const extraSchoolsKey = () => "pengawas:extra-schools";
export const schoolOverridesKey = () => "pengawas:school-overrides";
export const userKey = (username) => `auth:user:${username.toLowerCase()}`;
export const userListKey = () => "auth:user-list"; // array of usernames, for admin's "Kelola Pengguna" list
export const bootstrapDoneKey = () => "auth:bootstrap-done";
export const tahunAjaranKey = () => "config:tahun-ajaran";
export const ambangModeKey = () => "config:ambang";

/** 'longgar' = ceil(2/3*N) ; 'ketat' = floor(2/3*N)+1 (contoh Buku Panduan) */
export function thresholdDays(mode, n) {
  return mode === "longgar" ? Math.ceil((2 / 3) * n) : Math.floor((2 / 3) * n) + 1;
}

export function isDone(entry, habit) {
  if (!entry) return false;
  // Progres mengikuti centang murid sendiri untuk semua jenis kebiasaan —
  // termasuk Bangun Pagi dan Tidur Cepat, yang punya isian jam sebagai
  // catatan pendukung saja. Centang manual tetap satu-satunya penentu
  // status "selesai", supaya bisa ditandai atau dibatalkan kapan pun.
  if (habit.type === "time") return !!entry.centang;
  return !!entry.value;
}

export function habitTally(monthData, habitId, dayRange) {
  const habit = HABIT_MAP[habitId];
  const entries = Object.entries(monthData || {});
  const filtered = dayRange ? entries.filter(([d]) => dayRange.includes(Number(d))) : entries;
  return filtered.filter(([, e]) => isDone(e[habitId], habit)).length;
}

/** Day range for a recap period. "mingguan" = last 7 elapsed days; "bulanan" = all elapsed days this month. */
export function getPeriodRange(period, date = new Date()) {
  const t = todayParts(date);
  const daysSoFarMonth = t.d - 1 || 1;
  if (period === "mingguan") {
    const start = Math.max(1, daysSoFarMonth - 6);
    const days = [];
    for (let d = start; d <= daysSoFarMonth; d++) days.push(d);
    return { days, total: days.length, label: `${days.length} hari terakhir` };
  }
  const days = Array.from({ length: daysSoFarMonth }, (_, i) => i + 1);
  return { days, total: daysSoFarMonth, label: `bulan ${MONTH_NAMES[t.m - 1]} (${daysSoFarMonth} hari berjalan)` };
}
