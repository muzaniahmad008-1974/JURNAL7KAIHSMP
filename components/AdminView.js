"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, UserCircle2, UserCog, Calendar, Pencil, Trash2, X, Check } from "lucide-react";
import { Card, SectionTitle, Chip, PrimaryButton, GhostButton, C } from "./ui";
import { getData, setData } from "@/lib/clientStorage";
import {
  CLASSES, SCHOOLS, STUDENTS, extraStudentsKey, extraClassesKey, extraGuruKey,
  tahunAjaranKey, extraSchoolsKey, schoolOverridesKey, ROLES,
} from "@/lib/data";

const ROLE_LABELS = Object.fromEntries(ROLES.map((r) => [r.id, r.label]));

function confirmDelete(label) {
  return typeof window !== "undefined" && window.confirm ? window.confirm(`Hapus ${label} ini?`) : true;
}

export default function AdminView({ schoolId: initialSchoolId, onLogout }) {
  const [schoolId, setSchoolId] = useState(initialSchoolId);
  const [tab, setTab] = useState("ringkasan");
  const [extraSchools, setExtraSchools] = useState([]);
  const [schoolOverrides, setSchoolOverrides] = useState({});
  const [extraStudents, setExtraStudents] = useState(null);
  const [extraClasses, setExtraClasses] = useState(null);
  const [extraGuru, setExtraGuru] = useState(null);
  const [tahunAjaran, setTahunAjaran] = useState(null);
  const [studentForm, setStudentForm] = useState({ name: "", gender: "L", classId: "" });
  const [classForm, setClassForm] = useState({ name: "", wali: "" });
  const [guruForm, setGuruForm] = useState({ name: "", peran: "Guru Mata Pelajaran" });

  const [users, setUsers] = useState(null);
  const [userForm, setUserForm] = useState({ name: "", username: "", password: "", role: "murid", studentId: "", classId: "", schoolId: "" });
  const [userError, setUserError] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  // { type: 'student' | 'class' | 'guru', id, ...fields } — one shared slot
  // for whichever row is currently being edited.
  const [editing, setEditing] = useState(null);

  const allSchools = useMemo(
    () => [...SCHOOLS, ...extraSchools].map((s) => ({ ...s, name: schoolOverrides[s.id] || s.name })),
    [extraSchools, schoolOverrides]
  );
  const school = allSchools.find((s) => s.id === schoolId) || SCHOOLS[0];
  const baseClasses = CLASSES.filter((c) => c.schoolId === schoolId);
  const baseStudents = STUDENTS.filter((s) => baseClasses.some((c) => c.id === s.classId));

  useEffect(() => {
    getData(extraSchoolsKey(), []).then(setExtraSchools);
    getData(schoolOverridesKey(), {}).then(setSchoolOverrides);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [es, ec, eg, ta] = await Promise.all([
        getData(extraStudentsKey(schoolId), []),
        getData(extraClassesKey(schoolId), []),
        getData(extraGuruKey(schoolId), []),
        getData(tahunAjaranKey(), { tahun: "2026/2027", semester: "Ganjil" }),
      ]);
      if (!alive) return;
      setExtraStudents(es); setExtraClasses(ec); setExtraGuru(eg); setTahunAjaran(ta);
      setStudentForm((f) => ({ ...f, classId: baseClasses[0]?.id || "" }));
      setEditing(null);
    })();
    return () => { alive = false; };
  }, [schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loading = extraStudents === null || extraClasses === null || extraGuru === null || tahunAjaran === null;
  const allClasses = loading ? [] : [...baseClasses, ...extraClasses];
  const allStudents = loading ? [] : [...baseStudents, ...extraStudents];
  const allGuru = loading ? [] : [
    ...baseClasses.map((c) => ({ id: `wali-${c.id}`, name: c.wali, peran: `Wali Kelas ${c.name}` })),
    ...extraGuru,
  ];
  const isExtra = {
    student: (id) => extraStudents.some((s) => s.id === id),
    class: (id) => extraClasses.some((c) => c.id === id),
    guru: (id) => extraGuru.some((g) => g.id === id),
  };

  const loadUsers = async () => {
    setUsers(null);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(res.ok ? data.users : []);
    } catch (e) {
      setUsers([]);
    }
  };

  useEffect(() => { if (tab === "pengguna" && users === null) loadUsers(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const createUser = async () => {
    setUserError("");
    if (!userForm.name.trim() || !userForm.username.trim() || !userForm.password) {
      setUserError("Nama, username, dan password wajib diisi.");
      return;
    }
    if (userForm.password.length < 8) {
      setUserError("Password minimal 8 karakter.");
      return;
    }
    if ((userForm.role === "murid" || userForm.role === "ortu") && !userForm.studentId) {
      setUserError("Pilih murid yang akan dihubungkan ke akun ini.");
      return;
    }
    if (userForm.role === "guru" && !userForm.classId) {
      setUserError("Pilih kelas yang diampu.");
      return;
    }
    if ((userForm.role === "kepsek" || userForm.role === "admin") && !userForm.schoolId) {
      setUserError("Pilih sekolah untuk akun ini.");
      return;
    }
    setCreatingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userForm.name.trim(),
          username: userForm.username.trim(),
          password: userForm.password,
          role: userForm.role,
          studentId: userForm.studentId || undefined,
          classId: userForm.classId || undefined,
          schoolId: userForm.schoolId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserError(data.error || "Gagal membuat akun.");
        return;
      }
      setUserForm({ name: "", username: "", password: "", role: "murid", studentId: "", classId: "", schoolId: "" });
      loadUsers();
    } catch (e) {
      setUserError("Gagal membuat akun. Coba lagi.");
    } finally {
      setCreatingUser(false);
    }
  };

  const deleteUser = async (username) => {
    if (!confirmDelete("akun")) return;
    await fetch(`/api/users?username=${encodeURIComponent(username)}`, { method: "DELETE" });
    loadUsers();
  };

  // --- Siswa ---
  const addStudent = async () => {
    if (!studentForm.name.trim() || !studentForm.classId) return;
    const next = [...extraStudents, { id: "adm-" + Date.now(), name: studentForm.name.trim(), gender: studentForm.gender, classId: studentForm.classId }];
    setExtraStudents(next);
    await setData(extraStudentsKey(schoolId), next);
    setStudentForm({ ...studentForm, name: "" });
  };
  const startEditStudent = (s) => setEditing({ type: "student", id: s.id, name: s.name, gender: s.gender, classId: s.classId });
  const saveEditStudent = async () => {
    if (!editing.name.trim()) return;
    const next = extraStudents.map((s) => s.id === editing.id ? { ...s, name: editing.name.trim(), gender: editing.gender, classId: editing.classId } : s);
    setExtraStudents(next);
    await setData(extraStudentsKey(schoolId), next);
    setEditing(null);
  };
  const deleteStudent = async (id) => {
    if (!confirmDelete("siswa")) return;
    const next = extraStudents.filter((s) => s.id !== id);
    setExtraStudents(next);
    await setData(extraStudentsKey(schoolId), next);
    if (editing?.id === id) setEditing(null);
  };

  // --- Kelas ---
  const addClass = async () => {
    if (!classForm.name.trim()) return;
    const next = [...extraClasses, { id: "adm-" + Date.now(), schoolId, name: classForm.name.trim(), wali: classForm.wali.trim() || "Belum ditentukan" }];
    setExtraClasses(next);
    await setData(extraClassesKey(schoolId), next);
    setClassForm({ name: "", wali: "" });
  };
  const startEditClass = (c) => setEditing({ type: "class", id: c.id, name: c.name, wali: c.wali });
  const saveEditClass = async () => {
    if (!editing.name.trim()) return;
    const next = extraClasses.map((c) => c.id === editing.id ? { ...c, name: editing.name.trim(), wali: editing.wali.trim() || "Belum ditentukan" } : c);
    setExtraClasses(next);
    await setData(extraClassesKey(schoolId), next);
    setEditing(null);
  };
  const deleteClass = async (id) => {
    if (!confirmDelete("kelas")) return;
    const next = extraClasses.filter((c) => c.id !== id);
    setExtraClasses(next);
    await setData(extraClassesKey(schoolId), next);
    if (editing?.id === id) setEditing(null);
  };

  // --- Guru ---
  const addGuru = async () => {
    if (!guruForm.name.trim()) return;
    const next = [...extraGuru, { id: "adm-" + Date.now(), name: guruForm.name.trim(), peran: guruForm.peran }];
    setExtraGuru(next);
    await setData(extraGuruKey(schoolId), next);
    setGuruForm({ name: "", peran: "Guru Mata Pelajaran" });
  };
  const startEditGuru = (g) => setEditing({ type: "guru", id: g.id, name: g.name, peran: g.peran });
  const saveEditGuru = async () => {
    if (!editing.name.trim()) return;
    const next = extraGuru.map((g) => g.id === editing.id ? { ...g, name: editing.name.trim(), peran: editing.peran } : g);
    setExtraGuru(next);
    await setData(extraGuruKey(schoolId), next);
    setEditing(null);
  };
  const deleteGuru = async (id) => {
    if (!confirmDelete("guru")) return;
    const next = extraGuru.filter((g) => g.id !== id);
    setExtraGuru(next);
    await setData(extraGuruKey(schoolId), next);
    if (editing?.id === id) setEditing(null);
  };

  const saveTahunAjaran = async (next) => {
    setTahunAjaran(next);
    await setData(tahunAjaranKey(), next);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="text-[12px]" style={{ color: C.sub }}>Admin Sekolah</div>
          <h1 style={{ fontFamily: "'Baloo 2'", color: C.ink }} className="text-xl font-extrabold">{school.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="rounded-lg px-3 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }}>
            {allSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={onLogout} className="text-[12.5px] font-semibold" style={{ color: C.brick }}>Keluar</button>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[["ringkasan", "Ringkasan"], ["siswa", "Data Siswa"], ["kelas", "Data Kelas"], ["guru", "Data Guru"], ["pengguna", "Kelola Pengguna"], ["tahun-ajaran", "Tahun Ajaran"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold" style={tab === id ? { background: C.blueDeep, color: "white" } : { background: "#F1EEE3", color: C.sub }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center" style={{ color: C.sub }}><Loader2 className="animate-spin inline" /> Memuat data induk sekolah...</div>
      ) : (
        <div className="space-y-4">
          {tab === "ringkasan" && (
            <div className="grid sm:grid-cols-4 gap-3">
              {[
                { label: "Jumlah Siswa", value: allStudents.length, icon: UserCircle2, tone: "#1E7FD6" },
                { label: "Jumlah Kelas", value: allClasses.length, icon: UserCog, tone: "#4CAF50" },
                { label: "Jumlah Guru", value: allGuru.length, icon: UserCog, tone: "#F7B32B" },
                { label: "Tahun Ajaran Aktif", value: `${tahunAjaran.tahun} \u00B7 ${tahunAjaran.semester}`, icon: Calendar, tone: "#17A398", small: true },
              ].map((s) => (
                <Card key={s.label}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: s.tone }}><s.icon size={16} color="white" /></div>
                  <div className={s.small ? "text-[14px] font-bold" : "text-2xl font-extrabold"} style={{ fontFamily: "'Baloo 2'", color: C.ink }}>{s.value}</div>
                  <div className="text-[12px]" style={{ color: C.sub }}>{s.label}</div>
                </Card>
              ))}
            </div>
          )}

          {tab === "siswa" && (
            <Card>
              <SectionTitle title="Data Induk Siswa" />
              <div className="overflow-x-auto -mx-1 mb-4">
                <table className="w-full text-[12.5px] min-w-[560px]">
                  <thead><tr style={{ color: C.sub }}>
                    <th className="text-left font-semibold py-1.5 px-1">No</th>
                    <th className="text-left font-semibold py-1.5 px-1">Nama</th>
                    <th className="text-left font-semibold py-1.5 px-1">P/L</th>
                    <th className="text-left font-semibold py-1.5 px-1">Kelas</th>
                    <th className="text-right font-semibold py-1.5 px-1">Aksi</th>
                  </tr></thead>
                  <tbody>
                    {allStudents.map((s, i) => {
                      const editable = isExtra.student(s.id);
                      const isEditingRow = editing?.type === "student" && editing.id === s.id;
                      return (
                        <tr key={s.id} style={{ borderTop: `1px solid ${C.line}` }}>
                          <td className="py-1.5 px-1">{i + 1}</td>
                          {isEditingRow ? (
                            <>
                              <td className="py-1.5 px-1"><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full rounded px-1.5 py-1 text-[12.5px]" style={{ border: `1px solid ${C.line}` }} /></td>
                              <td className="py-1.5 px-1">
                                <select value={editing.gender} onChange={(e) => setEditing({ ...editing, gender: e.target.value })} className="rounded px-1 py-1 text-[12.5px]" style={{ border: `1px solid ${C.line}` }}>
                                  <option value="L">L</option><option value="P">P</option>
                                </select>
                              </td>
                              <td className="py-1.5 px-1">
                                <select value={editing.classId} onChange={(e) => setEditing({ ...editing, classId: e.target.value })} className="rounded px-1 py-1 text-[12.5px]" style={{ border: `1px solid ${C.line}` }}>
                                  {allClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-1.5 px-1 font-medium" style={{ color: C.ink }}>{s.name}</td>
                              <td className="py-1.5 px-1">{s.gender}</td>
                              <td className="py-1.5 px-1">{allClasses.find((c) => c.id === s.classId)?.name || "\u2014"}</td>
                            </>
                          )}
                          <td className="py-1.5 px-1">
                            <div className="flex items-center gap-1 justify-end">
                              {!editable ? (
                                <span className="text-[10.5px]" style={{ color: C.sub }}>data awal</span>
                              ) : isEditingRow ? (
                                <>
                                  <button onClick={saveEditStudent} title="Simpan" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#E7F3E7" }}><Check size={13} color={C.green} /></button>
                                  <button onClick={() => setEditing(null)} title="Batal" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#F1EEE3" }}><X size={13} color={C.sub} /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEditStudent(s)} title="Edit" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#F1EEE3" }}><Pencil size={13} color={C.blueDeep} /></button>
                                  <button onClick={() => deleteStudent(s.id)} title="Hapus" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#F1EEE3" }}><Trash2 size={13} color={C.brick} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] mb-3" style={{ color: C.sub }}>Baris berlabel &quot;data awal&quot; adalah data contoh bawaan dan belum bisa diedit dari sini &mdash; hanya siswa yang ditambahkan lewat form di bawah yang bisa diubah/dihapus.</p>
              <div className="text-[12.5px] font-semibold mb-2" style={{ color: C.ink }}>Tambah Siswa Baru</div>
              <div className="grid sm:grid-cols-4 gap-2">
                <input placeholder="Nama siswa" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
                <select value={studentForm.gender} onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }}>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
                <select value={studentForm.classId} onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }}>
                  {allClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <PrimaryButton icon={Plus} onClick={addStudent}>Tambah</PrimaryButton>
              </div>
            </Card>
          )}

          {tab === "kelas" && (
            <Card>
              <SectionTitle title="Data Induk Kelas" />
              <div className="space-y-2 mb-2">
                {allClasses.map((c) => {
                  const editable = isExtra.class(c.id);
                  const isEditingRow = editing?.type === "class" && editing.id === c.id;
                  return (
                    <div key={c.id} className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ background: "#EFEAD9" }}>
                      {isEditingRow ? (
                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-1.5">
                          <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Nama kelas" className="flex-1 min-w-0 rounded-lg px-2 py-1 text-[12.5px]" style={{ border: `1px solid ${C.line}` }} />
                          <input value={editing.wali} onChange={(e) => setEditing({ ...editing, wali: e.target.value })} placeholder="Wali kelas" className="flex-1 min-w-0 rounded-lg px-2 py-1 text-[12.5px]" style={{ border: `1px solid ${C.line}` }} />
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-semibold" style={{ color: C.ink }}>{c.name}</div>
                          <div className="text-[12px]" style={{ color: C.sub }}>Wali Kelas: {c.wali}</div>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isEditingRow && <Chip tone="blue">{allStudents.filter((s) => s.classId === c.id).length} siswa</Chip>}
                        {!editable ? (
                          <span className="text-[10.5px]" style={{ color: C.sub }}>data awal</span>
                        ) : isEditingRow ? (
                          <>
                            <button onClick={saveEditClass} title="Simpan" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "white" }}><Check size={13} color={C.green} /></button>
                            <button onClick={() => setEditing(null)} title="Batal" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "white" }}><X size={13} color={C.sub} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditClass(c)} title="Edit" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "white" }}><Pencil size={13} color={C.blueDeep} /></button>
                            <button onClick={() => deleteClass(c.id)} title="Hapus" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "white" }}><Trash2 size={13} color={C.brick} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] mb-3" style={{ color: C.sub }}>Kelas berlabel &quot;data awal&quot; adalah data contoh bawaan dan belum bisa diedit dari sini.</p>
              <div className="text-[12.5px] font-semibold mb-2" style={{ color: C.ink }}>Tambah Kelas Baru</div>
              <div className="grid sm:grid-cols-3 gap-2">
                <input placeholder="Nama kelas (mis. IX A)" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
                <input placeholder="Wali kelas" value={classForm.wali} onChange={(e) => setClassForm({ ...classForm, wali: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
                <PrimaryButton icon={Plus} onClick={addClass}>Tambah</PrimaryButton>
              </div>
            </Card>
          )}

          {tab === "guru" && (
            <Card>
              <SectionTitle title="Data Induk Guru" />
              <div className="space-y-2 mb-2">
                {allGuru.map((g) => {
                  const editable = isExtra.guru(g.id);
                  const isEditingRow = editing?.type === "guru" && editing.id === g.id;
                  return (
                    <div key={g.id} className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ background: "#EFEAD9" }}>
                      {isEditingRow ? (
                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-1.5">
                          <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Nama guru" className="flex-1 min-w-0 rounded-lg px-2 py-1 text-[12.5px]" style={{ border: `1px solid ${C.line}` }} />
                          <select value={editing.peran} onChange={(e) => setEditing({ ...editing, peran: e.target.value })} className="rounded-lg px-2 py-1 text-[12.5px]" style={{ border: `1px solid ${C.line}` }}>
                            <option>Guru Mata Pelajaran</option>
                            <option>Guru PAI</option>
                            <option>Guru BK</option>
                            <option>Guru PJOK</option>
                            <option>Tenaga Kependidikan</option>
                          </select>
                        </div>
                      ) : (
                        <div className="text-[13.5px] font-semibold" style={{ color: C.ink }}>{g.name}</div>
                      )}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isEditingRow && <Chip tone="green">{g.peran}</Chip>}
                        {!editable ? (
                          <span className="text-[10.5px]" style={{ color: C.sub }}>data awal</span>
                        ) : isEditingRow ? (
                          <>
                            <button onClick={saveEditGuru} title="Simpan" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "white" }}><Check size={13} color={C.green} /></button>
                            <button onClick={() => setEditing(null)} title="Batal" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "white" }}><X size={13} color={C.sub} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditGuru(g)} title="Edit" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "white" }}><Pencil size={13} color={C.blueDeep} /></button>
                            <button onClick={() => deleteGuru(g.id)} title="Hapus" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "white" }}><Trash2 size={13} color={C.brick} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] mb-3" style={{ color: C.sub }}>Guru berlabel &quot;data awal&quot; adalah wali kelas dari data contoh bawaan dan belum bisa diedit dari sini.</p>
              <div className="text-[12.5px] font-semibold mb-2" style={{ color: C.ink }}>Tambah Guru Baru</div>
              <div className="grid sm:grid-cols-3 gap-2">
                <input placeholder="Nama guru" value={guruForm.name} onChange={(e) => setGuruForm({ ...guruForm, name: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
                <select value={guruForm.peran} onChange={(e) => setGuruForm({ ...guruForm, peran: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }}>
                  <option>Guru Mata Pelajaran</option>
                  <option>Guru PAI</option>
                  <option>Guru BK</option>
                  <option>Guru PJOK</option>
                  <option>Tenaga Kependidikan</option>
                </select>
                <PrimaryButton icon={Plus} onClick={addGuru}>Tambah</PrimaryButton>
              </div>
            </Card>
          )}

          {tab === "pengguna" && (
            <Card>
              <SectionTitle title="Kelola Pengguna" />
              <p className="text-[12px] mb-3" style={{ color: C.sub }}>Buat akun login untuk setiap peran. Sampaikan username dan password awal ini langsung kepada yang bersangkutan.</p>

              {users === null ? (
                <div className="py-6 text-center" style={{ color: C.sub }}><Loader2 className="animate-spin inline" /> Memuat daftar pengguna...</div>
              ) : (
                <div className="space-y-2 mb-4">
                  {users.length === 0 && <p className="text-[13px]" style={{ color: C.sub }}>Belum ada akun lain selain akun Anda.</p>}
                  {users.map((u) => (
                    <div key={u.username} className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ background: "#EFEAD9" }}>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold" style={{ color: C.ink }}>{u.name}</div>
                        <div className="text-[11.5px]" style={{ color: C.sub }}>@{u.username}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Chip tone="blue">{ROLE_LABELS[u.role] || u.role}</Chip>
                        <button onClick={() => deleteUser(u.username)} title="Hapus akun" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "white" }}><Trash2 size={13} color={C.brick} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-[12.5px] font-semibold mb-2" style={{ color: C.ink }}>Buat Akun Baru</div>
              <div className="grid sm:grid-cols-2 gap-2 mb-2">
                <input placeholder="Nama lengkap" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value, studentId: "", classId: "", schoolId: "" })} className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }}>
                  {Object.entries(ROLE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
                <input placeholder="Username" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
                <input type="password" placeholder="Password awal (min. 8 karakter)" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />

                {(userForm.role === "murid" || userForm.role === "ortu") && (
                  <select value={userForm.studentId} onChange={(e) => setUserForm({ ...userForm, studentId: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px] sm:col-span-2" style={{ border: `1px solid ${C.line}` }}>
                    <option value="">Pilih murid yang dihubungkan...</option>
                    {allStudents.map((s) => <option key={s.id} value={s.id}>{s.name} &middot; {allClasses.find((c) => c.id === s.classId)?.name}</option>)}
                  </select>
                )}
                {userForm.role === "guru" && (
                  <select value={userForm.classId} onChange={(e) => setUserForm({ ...userForm, classId: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px] sm:col-span-2" style={{ border: `1px solid ${C.line}` }}>
                    <option value="">Pilih kelas yang diampu...</option>
                    {allClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                {(userForm.role === "kepsek" || userForm.role === "admin") && (
                  <select value={userForm.schoolId} onChange={(e) => setUserForm({ ...userForm, schoolId: e.target.value })} className="rounded-lg px-2.5 py-2 text-[13px] sm:col-span-2" style={{ border: `1px solid ${C.line}` }}>
                    <option value="">Pilih sekolah...</option>
                    {allSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>
              {userError && <p className="text-[12px] font-medium mb-2" style={{ color: C.brick }}>{userError}</p>}
              <PrimaryButton icon={Plus} onClick={createUser} disabled={creatingUser}>{creatingUser ? "Menyimpan..." : "Buat Akun"}</PrimaryButton>
            </Card>
          )}

          {tab === "tahun-ajaran" && (
            <Card>
              <SectionTitle title="Pengaturan Tahun Ajaran" />
              <div className="grid sm:grid-cols-2 gap-3 max-w-md">
                <label className="block">
                  <span className="text-[12px] font-semibold" style={{ color: C.sub }}>Tahun Ajaran</span>
                  <input value={tahunAjaran.tahun} onChange={(e) => saveTahunAjaran({ ...tahunAjaran, tahun: e.target.value })} className="mt-1 w-full rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }} />
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold" style={{ color: C.sub }}>Semester</span>
                  <select value={tahunAjaran.semester} onChange={(e) => saveTahunAjaran({ ...tahunAjaran, semester: e.target.value })} className="mt-1 w-full rounded-lg px-2.5 py-2 text-[13px]" style={{ border: `1px solid ${C.line}` }}>
                    <option>Ganjil</option>
                    <option>Genap</option>
                  </select>
                </label>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
