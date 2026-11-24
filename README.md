# Nusa HRIS

Demo HRIS (Human Resource Information System) untuk portfolio. Semua data fiktif.

**Demo langsung: [nusa-hris-portfolio.vercel.app] (https://nusa-hris-portfolio.vercel.app)**

## Fitur
- **Dashboard**: ringkasan yang bisa diklik, grafik batang kehadiran (7/14/30 hari kerja) dengan tooltip, grafik garis tingkat kehadiran, donat status hari ini, karyawan per departemen, antrean persetujuan, aktivitas terbaru, dan daftar yang sedang cuti.
- **Data karyawan**: cari, filter, urutkan kolom, profil lengkap dengan saldo cuti, tambah karyawan.
- **Absensi**: clock in/out (dengan opsi WFH), tabel hari ini dengan filter status, rekap bulanan berbentuk heatmap.
- **Cuti & izin**: form pengajuan dengan validasi saldo, tab status, approve/tolak oleh HR, baris baru disorot sesaat.
- **Kinerja**: skor per kuartal, sebaran penilaian, target (KPI) dengan progres, review atasan. HR mengisi review, karyawan melihat kinerjanya sendiri.
- **Live**: aktivitas clock in dan pengajuan cuti disimulasikan di browser (tanpa backend), lengkap dengan notifikasi dan tombol jeda.
- Peran **HR Admin** dan **Karyawan** (toggle di atas), tema biru, mode terang/gelap, responsif sampai layar HP.

## Stack
React 18, TypeScript, Vite. Tanpa library UI atau chart, grafik digambar dengan SVG.

## Menjalankan
```bash
npm install
npm run dev      # pengembangan
npm run build    # hasil: dist/index.html (satu file, siap di-host)
```

## Struktur
- `src/data.ts` data dummy dan aturan saldo cuti
- `src/store.tsx` state aplikasi (clock in, cuti, karyawan, kinerja, simulasi live)
- `src/charts.tsx` grafik SVG (batang bertumpuk, garis, donat)
- `src/pages/` lima halaman utama
- `src/styles.css` design token dan komponen

## Ide pengembangan
Backend (Node/Express + PostgreSQL), autentikasi, modul payroll, ekspor laporan.
