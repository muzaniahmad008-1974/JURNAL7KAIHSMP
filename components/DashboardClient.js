"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";
import MuridView from "@/components/MuridView";
import OrtuView from "@/components/OrtuView";
import GuruView from "@/components/GuruView";
import KepsekView from "@/components/KepsekView";
import PengawasView from "@/components/PengawasView";
import AdminView from "@/components/AdminView";
import { C } from "@/components/ui";
import { getData } from "@/lib/clientStorage";
import {
  STUDENTS, CLASSES, SCHOOLS,
  extraStudentsKey, extraClassesKey, extraSchoolsKey, schoolOverridesKey,
} from "@/lib/data";

// Resolves a studentId to {student, className, schoolName}, checking the
// static seed data first and falling back to admin-added ("extra")
// students/classes/schools if not found there.
async function resolveStudentContext(studentId) {
  const baseStudent = STUDENTS.find((s) => s.id === studentId);
  if (baseStudent) {
    const cls = CLASSES.find((c) => c.id === baseStudent.classId);
    const school = SCHOOLS.find((s) => s.id === cls.schoolId);
    return { student: baseStudent, className: cls.name, schoolName: school.name };
  }

  const [extraSchools, overrides] = await Promise.all([
    getData(extraSchoolsKey(), []),
    getData(schoolOverridesKey(), {}),
  ]);
  const allSchools = [...SCHOOLS, ...extraSchools].map((s) => ({ ...s, name: overrides[s.id] || s.name }));

  for (const school of allSchools) {
    const extraStudents = await getData(extraStudentsKey(school.id), []);
    const found = extraStudents.find((s) => s.id === studentId);
    if (found) {
      const baseClasses = CLASSES.filter((c) => c.schoolId === school.id);
      const extraClasses = await getData(extraClassesKey(school.id), []);
      const cls = [...baseClasses, ...extraClasses].find((c) => c.id === found.classId);
      return { student: found, className: cls?.name || "\u2014", schoolName: school.name };
    }
  }
  return null;
}

export default function DashboardClient({ session }) {
  const role = session.user.role;
  const [context, setContext] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    if (role !== "murid" && role !== "ortu") return;
    let alive = true;
    resolveStudentContext(session.user.studentId).then((ctx) => { if (alive) setContext(ctx); });
    return () => { alive = false; };
  }, [role, session.user.studentId]);

  const onLogout = () => signOut({ callbackUrl: "/login" });

  if (role === "murid" || role === "ortu") {
    if (context === undefined) {
      return <div className="py-16 text-center" style={{ color: C.sub }}><Loader2 className="animate-spin inline" /> Memuat akun...</div>;
    }
    if (context === null) {
      return (
        <div className="py-16 text-center px-4" style={{ color: C.sub }}>
          Akun ini terhubung ke data murid yang tidak ditemukan. Hubungi admin sekolah Anda.
        </div>
      );
    }
    return role === "murid"
      ? <MuridView student={context.student} className={context.className} schoolName={context.schoolName} onLogout={onLogout} />
      : <OrtuView student={context.student} className={context.className} schoolName={context.schoolName} onLogout={onLogout} />;
  }

  if (role === "guru") return <GuruView classId={session.user.classId || CLASSES[0].id} onLogout={onLogout} />;
  if (role === "kepsek") return <KepsekView schoolId={session.user.schoolId || SCHOOLS[0].id} onLogout={onLogout} />;
  if (role === "pengawas") return <PengawasView onLogout={onLogout} />;
  if (role === "admin") return <AdminView schoolId={session.user.schoolId || SCHOOLS[0].id} onLogout={onLogout} />;

  return <div className="py-16 text-center" style={{ color: C.sub }}>Peran akun tidak dikenali. Hubungi admin sekolah Anda.</div>;
}
