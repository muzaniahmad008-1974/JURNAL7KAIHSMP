# SI-7KAIH AI

Jurnal Aktivitas Murid untuk Gerakan 7 Kebiasaan Anak Indonesia Hebat (7 KAIH) —
enam peran (Murid, Orang Tua, Guru Wali Kelas, Kepala Sekolah, Pengawas Pembina,
Admin Sekolah), dengan **login sungguhan**, siap deploy ke Vercel.

- **Autentikasi**: NextAuth (Auth.js) dengan username + password, password di-hash
  dengan bcrypt, akun tersimpan di Google Drive — bukan lagi login demo
- **Database**: Google Drive (satu file JSON per data, di satu folder Drive)
- **AI**: Google Gemini (`gemini-2.5-flash` secara default), lewat SDK resmi `@google/genai`
- **Hosting**: Vercel (App Router, serverless functions)

---

## 1. Yang perlu disiapkan dulu

Empat hal sebelum aplikasi ini bisa berjalan:

1. Sebuah **Service Account** Google Cloud (untuk mengakses Google Drive)
2. Sebuah **folder Google Drive** yang dibagikan ke service account itu
3. Sebuah **API key Gemini** (gratis)
4. Sebuah **secret autentikasi** (dibuat sendiri, satu baris teks acak)

### 1.1 Membuat Service Account + mengaktifkan Drive API

1. Buka [Google Cloud Console](https://console.cloud.google.com/) dan buat project baru (atau pakai yang sudah ada).
2. Buka **APIs & Services → Library**, cari **Google Drive API**, klik **Enable**.
3. Buka **APIs & Services → Credentials → Create Credentials → Service Account**.
   - Beri nama bebas, misalnya `si7kaih-storage`.
   - Peran (role) tidak perlu diisi khusus — cukup lewati langkah itu.
4. Setelah service account dibuat, klik service account tadi → tab **Keys** → **Add Key → Create new key → JSON**.
   Sebuah file `.json` akan terunduh — **simpan file ini baik-baik, jangan dibagikan ke siapa pun.**
5. Buka file `.json` itu dengan text editor. Cari nilai `client_email` — bentuknya seperti
   `si7kaih-storage@nama-project.iam.gserviceaccount.com`. Salin alamat ini, akan dipakai di langkah berikut.

### 1.2 Menyiapkan folder Google Drive sebagai "database"

1. Buka [Google Drive](https://drive.google.com), buat folder baru, misalnya `SI-7KAIH-AI Data`.
2. Klik kanan folder itu → **Share** → tempel alamat `client_email` dari langkah 1.1 di atas →
   beri akses **Editor** → kirim.
3. Buka folder itu, salin ID-nya dari URL address bar:
   `https://drive.google.com/drive/folders/`**`ID_FOLDER_ADA_DI_SINI`**

### 1.3 Membuat API key Gemini

1. Buka [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Klik **Create API key**, salin key yang muncul.

### 1.4 Membuat secret autentikasi

Jalankan salah satu perintah berikut di terminal untuk membuat teks acak:

```bash
openssl rand -base64 32
```

Kalau tidak punya `openssl` (misalnya di Windows tanpa Git Bash), buka
https://generate-secret.vercel.app/32 dan salin hasilnya. Simpan teks ini — ini akan
jadi kunci yang menandatangani sesi login semua pengguna, jadi harus rahasia dan
tidak dipakai ulang di aplikasi lain.

---

## 2. Menjalankan di komputer sendiri (opsional, sebelum deploy)

```bash
npm install
cp .env.local.example .env.local
```

Buka `.env.local`, isi semua baris sesuai langkah 1 di atas:

```
GOOGLE_SERVICE_ACCOUNT_KEY='<tempel seluruh isi file .json service account, jadi SATU BARIS>'
GOOGLE_DRIVE_FOLDER_ID=<ID folder Drive dari langkah 1.2>
GEMINI_API_KEY=<API key dari langkah 1.3>
NEXTAUTH_SECRET=<teks acak dari langkah 1.4>
NEXTAUTH_URL=http://localhost:3000
```

> **Tips memasukkan `GOOGLE_SERVICE_ACCOUNT_KEY` sebagai satu baris**: buka file `.json` di editor
> teks apa pun, pilih semua (Ctrl+A), salin, lalu tempel di antara tanda kutip. Selama seluruh isi
> file ada di antara satu pasang kutip, itu sudah benar — Node akan membaca `\n` di dalam
> `private_key` apa adanya.

Lalu jalankan:

```bash
npm run dev
```

Buka `http://localhost:3000` — akan diarahkan otomatis ke halaman **Pengaturan Awal**
karena belum ada akun sama sekali. Lanjutkan ke bagian 3 di bawah.

---

## 3. Membuat akun pertama (sekali saja)

1. Buka `/setup` (atau ikuti pengalihan otomatis dari langkah 2).
2. Isi nama, username, dan password untuk **akun Admin Sekolah pertama**. Password
   minimal 8 karakter.
3. Setelah tersimpan, halaman ini otomatis mengalihkan ke `/login` — dan **tidak bisa
   dipakai lagi** untuk membuat akun kedua (mencegah orang lain membuat akun admin
   liar kalau mereka menemukan alamat `/setup`).
4. Masuk dengan akun itu di halaman login.
5. Buka dashboard Admin Sekolah → tab **Kelola Pengguna** → dari sinilah semua akun
   lain dibuat: Murid, Orang Tua, Guru Wali Kelas, Kepala Sekolah, dan Pengawas
   Pembina. Setiap akun langsung dihubungkan ke data murid/kelas/sekolah yang sesuai
   (dipilih dari dropdown saat membuat akun).
6. Sampaikan username + password awal itu langsung ke masing-masing orang. Aplikasi
   ini belum punya fitur "lupa password" atau "ganti password sendiri" — kalau ada
   yang lupa, Admin bisa menghapus akun lama dan membuatkan yang baru dari tab yang
   sama.

---

## 4. Deploy ke Vercel

1. Push folder proyek ini ke sebuah repo GitHub/GitLab/Bitbucket.
2. Buka [vercel.com](https://vercel.com/new), impor repo tersebut.
3. Sebelum menekan **Deploy**, buka bagian **Environment Variables**, tambahkan lima
   variabel yang sama seperti di `.env.local` di atas:
   - `GOOGLE_SERVICE_ACCOUNT_KEY`
   - `GOOGLE_DRIVE_FOLDER_ID`
   - `GEMINI_API_KEY`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` — isi dengan domain yang nanti diberikan Vercel, misalnya
     `https://si-7kaih-ai.vercel.app` (tanpa garis miring di akhir). Kalau belum tahu
     domainnya, deploy dulu sekali dengan nilai sembarang, lihat domain yang
     diberikan Vercel, lalu perbarui variabel ini dan **Redeploy**.
4. Klik **Deploy**. Next.js dikenali otomatis oleh Vercel, tidak perlu konfigurasi tambahan.
5. Buka domain yang diberikan Vercel → akan diarahkan ke `/setup` karena belum ada
   akun → ikuti bagian 3 di atas.

Kalau nanti perlu mengganti key/secret, ubah di **Project Settings → Environment
Variables** di Vercel, lalu **Redeploy**.

---

## 5. Struktur proyek

```
app/
  page.js              Server Component: memeriksa sesi, redirect ke /login jika belum masuk
  login/page.js        halaman login (username + password)
  setup/page.js        pembuatan akun admin pertama, terkunci setelah dipakai sekali
  layout.js, globals.css
  api/
    auth/[...nextauth]/route.js   NextAuth — menangani proses login/logout/sesi
    setup/route.js                bootstrap akun admin pertama (sekali pakai)
    users/route.js                admin membuat/menghapus akun (perlu sesi admin)
    storage/route.js              GET/POST/DELETE key-value, diteruskan ke Google Drive (perlu sesi)
    ai/route.js                   POST prompt, diteruskan ke Gemini (perlu sesi)
lib/
  authOptions.js       konfigurasi NextAuth: memeriksa username/password terhadap akun di Drive
  driveStore.js        akses Google Drive (server-only)
  gemini.js            akses Gemini (server-only)
  clientStorage.js     helper fetch() ke /api/storage, dipakai komponen
  clientAi.js          helper fetch() ke /api/ai, dipakai komponen
  data.js              konstanta domain (HABITS, SCHOOLS, CLASSES, STUDENTS) + fungsi murni
components/
  Providers.js         SessionProvider (dibutuhkan agar login/logout bisa dipakai di komponen)
  DashboardClient.js    memilih tampilan dashboard sesuai peran akun yang sedang masuk
  MuridView.js / OrtuView.js / GuruView.js / KepsekView.js / PengawasView.js / AdminView.js
  HabitDailyRow.js, CalendarGrid.js, ReflectionPanel.js, ClassTable.js, Charts.js, ui.js
```

Setiap "key" data (jurnal harian, refleksi, catatan wali kelas, program sekolah, akun
pengguna, dll.) disimpan sebagai satu file `.json` tersendiri di dalam folder Drive
yang sudah disiapkan — bisa dibuka langsung lewat Google Drive kalau ingin memeriksa
data mentahnya. File akun pengguna hanya menyimpan **hash** password (lewat bcrypt),
tidak pernah password aslinya.

---

## 6. Keamanan yang sudah diterapkan

- **Setiap halaman dan setiap route API memeriksa sesi login sendiri-sendiri di sisi
  server** — bukan cuma disembunyikan di tampilan. Ini sengaja dibuat berlapis dan
  tidak bergantung pada middleware saja (ada celah keamanan yang pernah ditemukan di
  Next.js — CVE-2025-29927 — yang membuat middleware saja bisa dilewati).
- **Murid dan Orang Tua hanya bisa membaca/menulis data milik mereka sendiri.**
  Setiap request ke `/api/storage` diperiksa: kalau akun berperan Murid/Orang Tua
  mencoba mengakses data murid lain (dengan menebak ID-nya, misalnya), permintaan itu
  ditolak.
- **Data akun (termasuk hash password) tidak bisa diakses lewat endpoint data biasa**
  (`/api/storage`) oleh siapa pun, termasuk Admin — jalur itu diblokir total. Akun
  hanya bisa dikelola lewat `/api/users`, yang sendiri mensyaratkan sesi Admin yang
  sah.
- **Password di-hash dengan bcrypt** sebelum disimpan; aplikasi ini sendiri tidak
  pernah menyimpan atau menampilkan ulang password asli.

---

## 7. Yang perlu diperhatikan sebelum dipakai secara luas

- **Belum ada fitur "lupa password" atau ganti password mandiri.** Untuk saat ini,
  kalau seseorang lupa password, Admin Sekolah menghapus akun lama dan membuatkan
  akun baru lewat tab Kelola Pengguna. Menambahkan alur reset password (lewat email,
  misalnya) adalah langkah lanjutan yang wajar kalau aplikasi ini dipakai lebih luas.
- **Google Drive dipakai sebagai database sederhana**, bukan database sungguhan.
  Untuk skala kecil (satu sekolah/beberapa sekolah binaan) ini cukup — tapi setiap
  baca/tulis butuh request ke Drive API (ada jeda, dan Drive API punya batas kuota
  harian). Kalau nanti dipakai untuk banyak sekolah sekaligus, pertimbangkan pindah
  ke database sungguhan (Postgres via Vercel Postgres/Supabase, misalnya) — struktur
  `lib/clientStorage.js` dan `/api/storage` sengaja dibuat sederhana (get/set/delete/
  list by key) supaya gampang diganti belakangan tanpa menyentuh kode komponen.
- **Model Gemini** diatur lewat env var `GEMINI_MODEL` (default `gemini-2.5-flash`).
  Google kadang mengganti nama model yang tersedia — kalau suatu saat muncul error
  dari `/api/ai` menyebut model tidak ditemukan, cek model yang aktif di
  https://ai.google.dev/gemini-api/docs/models dan perbarui env var itu tanpa perlu
  mengubah kode.
- **Ekspor PDF/Word** (di dashboard Guru) memakai mekanisme cetak browser dan file
  `.doc` berbasis HTML — cara ringan yang tidak butuh pustaka PDF/Word tambahan, dan
  bekerja di semua browser modern.
- **Guru saat ini hanya bisa memilih kelas yang sudah ada di `lib/data.js`** pada
  dropdown pemilih kelasnya; kelas baru yang ditambahkan lewat Admin Sekolah belum
  otomatis muncul di sana. Ini titik yang wajar untuk dikembangkan lebih lanjut kalau
  jumlah kelas terus bertambah.
