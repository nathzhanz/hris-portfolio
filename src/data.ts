import { addDays, bizDays, isWeekend, lastWorkday, pad } from './lib'

export type Dept = 'HR' | 'Engineering' | 'Product' | 'Design' | 'Finance' | 'Sales' | 'Operations'
export const DEPTS: Dept[] = ['Engineering', 'Product', 'Design', 'Sales', 'Operations', 'Finance', 'HR']

export type ContractType = 'Tetap' | 'Kontrak' | 'Probation'
export type Status = 'hadir' | 'terlambat' | 'wfh' | 'izin' | 'cuti' | 'alpa' | 'belum'

export interface Employee {
  id: string
  name: string
  dept: Dept
  role: string
  type: ContractType
  join: string
  email: string
  phone: string
  city: string
  usedLeave: number
}

export interface AttendanceRecord {
  empId: string
  date: string
  status: Status
  in?: string
  out?: string
}

export type LeaveType = 'Cuti Tahunan' | 'Sakit' | 'Izin Khusus' | 'Cuti Melahirkan'
export type LeaveStatus = 'Menunggu' | 'Disetujui' | 'Ditolak'
export interface Leave {
  id: string
  empId: string
  type: LeaveType
  from: string
  to: string
  days: number
  reason: string
  status: LeaveStatus
  created: string
  note?: string
}

export const LEAVE_TYPES: LeaveType[] = ['Cuti Tahunan', 'Sakit', 'Izin Khusus', 'Cuti Melahirkan']
export const ANNUAL_QUOTA = 12

/** Hari kerja terakhir dipakai sebagai "hari ini" supaya data tetap terisi di akhir pekan. */
export const TODAY = lastWorkday()

export const ME_HR = 'e01' // Rina Kartika, HR Manager
export const ME_STAFF = 'e04' // Dimas Pratama, Frontend Engineer

const slug = (n: string) => n.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.')

const raw: [string, Dept, string, ContractType, string, string][] = [
  ['Rina Kartika', 'HR', 'HR Manager', 'Tetap', '2019-03-11', 'Jakarta'],
  ['Bagas Wicaksono', 'HR', 'HR Generalist', 'Tetap', '2021-06-01', 'Depok'],
  ['Sekar Ayuningtyas', 'HR', 'Recruiter', 'Kontrak', '2025-02-17', 'Jakarta'],
  ['Dimas Pratama', 'Engineering', 'Frontend Engineer', 'Tetap', '2022-08-15', 'Bandung'],
  ['Aulia Rahmawati', 'Engineering', 'Backend Engineer', 'Tetap', '2021-01-04', 'Jakarta'],
  ['Fajar Nugroho', 'Engineering', 'Engineering Manager', 'Tetap', '2018-05-21', 'Tangerang'],
  ['Intan Permata', 'Engineering', 'QA Engineer', 'Kontrak', '2024-04-08', 'Bekasi'],
  ['Yoga Saputra', 'Engineering', 'DevOps Engineer', 'Tetap', '2023-02-13', 'Jakarta'],
  ['Nadia Safitri', 'Engineering', 'Mobile Engineer', 'Probation', '2026-09-14', 'Yogyakarta'],
  ['Reza Maulana', 'Engineering', 'Data Engineer', 'Tetap', '2022-11-07', 'Surabaya'],
  ['Citra Dewi', 'Product', 'Product Manager', 'Tetap', '2020-07-20', 'Jakarta'],
  ['Hendra Gunawan', 'Product', 'Business Analyst', 'Kontrak', '2025-01-06', 'Depok'],
  ['Laras Wulandari', 'Design', 'Lead Product Designer', 'Tetap', '2020-10-05', 'Bandung'],
  ['Kevin Santoso', 'Design', 'UI Designer', 'Tetap', '2023-05-22', 'Jakarta'],
  ['Maya Anggraini', 'Design', 'UX Researcher', 'Kontrak', '2025-06-02', 'Tangerang'],
  ['Budi Hartono', 'Finance', 'Finance Manager', 'Tetap', '2017-09-18', 'Jakarta'],
  ['Putri Handayani', 'Finance', 'Accountant', 'Tetap', '2022-03-14', 'Bekasi'],
  ['Eko Prasetyo', 'Finance', 'Payroll Specialist', 'Tetap', '2021-12-01', 'Depok'],
  ['Tania Lubis', 'Sales', 'Sales Manager', 'Tetap', '2019-08-26', 'Jakarta'],
  ['Rafi Hakim', 'Sales', 'Account Executive', 'Tetap', '2023-09-11', 'Surabaya'],
  ['Dewi Susanti', 'Sales', 'Account Executive', 'Probation', '2026-10-05', 'Jakarta'],
  ['Arif Setiawan', 'Operations', 'Operations Lead', 'Tetap', '2020-02-03', 'Tangerang'],
  ['Siti Nurhaliza', 'Operations', 'Customer Support', 'Kontrak', '2024-10-21', 'Bekasi'],
  ['Gilang Ramadhan', 'Operations', 'Logistics Coordinator', 'Tetap', '2022-06-27', 'Jakarta'],
]

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seedEmployees(): Employee[] {
  const r = rng(7)
  return raw.map(([name, dept, role, type, join, city], i) => ({
    id: `e${pad(i + 1)}`,
    name,
    dept,
    role,
    type,
    join,
    city,
    email: `${slug(name)}@nusakreasi.co.id`,
    phone: `0812-${1000 + Math.floor(r() * 8999)}-${1000 + Math.floor(r() * 8999)}`,
    usedLeave: Math.floor(r() * 6),
  }))
}

const hm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`

export function seedAttendance(emps: Employee[]): AttendanceRecord[] {
  const r = rng(42)
  const out: AttendanceRecord[] = []
  for (let i = 0; i < 45; i++) {
    const date = addDays(TODAY, -i)
    if (isWeekend(date)) continue
    for (const e of emps) {
      if (date < e.join) continue
      // Hari ini: dua akun demo dan sekitar sepertiga karyawan lain belum absen.
      // Yang lain di-clock-in oleh simulasi langsung, jadi angka di dashboard bergerak.
      if (i === 0 && (e.id === ME_HR || e.id === ME_STAFF || r() > 0.66)) {
        out.push({ empId: e.id, date, status: 'belum' })
        continue
      }
      const p = r()
      let status: Status = 'hadir'
      if (i === 0 && p > 0.94) status = 'belum'
      else if (p > 0.97) status = 'alpa'
      else if (p > 0.94) status = 'cuti'
      else if (p > 0.92) status = 'izin'
      else if (p > 0.85) status = 'wfh'
      else if (p > 0.77) status = 'terlambat'
      const rec: AttendanceRecord = { empId: e.id, date, status }
      if (status === 'hadir') rec.in = hm(7 * 60 + 40 + Math.floor(r() * 35))
      if (status === 'terlambat') rec.in = hm(8 * 60 + 16 + Math.floor(r() * 70))
      if (status === 'wfh') rec.in = hm(8 * 60 + Math.floor(r() * 20))
      if (rec.in && i > 0) rec.out = hm(17 * 60 + Math.floor(r() * 90))
      out.push(rec)
    }
  }
  return out
}

function range(fromOff: number, toOff: number) {
  let from = addDays(TODAY, fromOff)
  let to = addDays(TODAY, toOff)
  while (isWeekend(from)) from = addDays(from, 1)
  while (isWeekend(to)) to = addDays(to, -1)
  if (to < from) to = from
  return { from, to, days: bizDays(from, to) }
}

export function seedLeaves(): Leave[] {
  const mk = (
    id: string,
    empId: string,
    type: LeaveType,
    fromOff: number,
    toOff: number,
    reason: string,
    status: LeaveStatus,
    createdOff: number,
    note?: string,
  ): Leave => ({
    id,
    empId,
    type,
    reason,
    status,
    note,
    created: addDays(TODAY, createdOff),
    ...range(fromOff, toOff),
  })
  return [
    mk('l01', 'e02', 'Cuti Tahunan', -1, 1, 'Menghadiri acara keluarga di Solo', 'Disetujui', -9),
    mk('l02', 'e07', 'Sakit', -2, -1, 'Demam dan flu, surat dokter terlampir', 'Disetujui', -2),
    mk('l03', 'e14', 'Cuti Tahunan', 7, 11, 'Liburan akhir tahun ke Bali', 'Menunggu', -1),
    mk('l04', 'e11', 'Izin Khusus', 3, 3, 'Mengurus perpanjangan paspor', 'Menunggu', 0),
    mk('l05', 'e10', 'Cuti Tahunan', 14, 18, 'Pulang kampung ke Malang', 'Menunggu', -3),
    mk('l06', 'e17', 'Cuti Tahunan', -20, -18, 'Istirahat setelah proyek besar', 'Disetujui', -30),
    mk('l07', 'e20', 'Cuti Tahunan', -10, -8, 'Keperluan pribadi', 'Ditolak', -16, 'Bentrok dengan penutupan kuartal, coba ajukan setelah tanggal 5.'),
    mk('l08', 'e15', 'Sakit', 0, 0, 'Sakit kepala, istirahat di rumah', 'Menunggu', 0),
    mk('l09', 'e04', 'Cuti Tahunan', -30, -28, 'Liburan singkat', 'Disetujui', -40),
    mk('l10', 'e23', 'Cuti Tahunan', 21, 25, 'Pernikahan adik di Medan', 'Menunggu', -2),
    mk('l11', 'e22', 'Izin Khusus', -5, -5, 'Menghadiri pernikahan saudara', 'Disetujui', -12),
  ]
}

/** Samakan catatan absensi dengan cuti/izin yang sudah disetujui. */
export function applyLeavesToAttendance(att: AttendanceRecord[], leaves: Leave[]): AttendanceRecord[] {
  const approved = leaves.filter((l) => l.status === 'Disetujui')
  return att.map((a) => {
    const l = approved.find((x) => x.empId === a.empId && a.date >= x.from && a.date <= x.to)
    if (!l) return a
    return { empId: a.empId, date: a.date, status: l.type === 'Cuti Tahunan' || l.type === 'Cuti Melahirkan' ? 'cuti' : 'izin' }
  })
}

export const quotaOf = (e: Employee) => (e.type === 'Probation' ? 0 : ANNUAL_QUOTA)

export function balanceOf(e: Employee, leaves: Leave[]) {
  const quota = quotaOf(e)
  const mine = leaves.filter((l) => l.empId === e.id && l.type === 'Cuti Tahunan')
  const used = e.usedLeave + mine.filter((l) => l.status === 'Disetujui').reduce((s, l) => s + l.days, 0)
  const pending = mine.filter((l) => l.status === 'Menunggu').reduce((s, l) => s + l.days, 0)
  return { quota, used: Math.min(used, quota), pending, remaining: Math.max(quota - used - pending, 0) }
}

/* ---------- Kinerja ---------- */

export const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4']
export const YEAR = TODAY.slice(0, 4)
export const CURRENT_Q = Math.min(3, Math.floor((Number(TODAY.slice(5, 7)) - 1) / 3))
export const CURRENT_Q_LABEL = `${QUARTER_LABELS[CURRENT_Q]} ${YEAR}`

export interface Goal {
  id: string
  title: string
  target: string
  progress: number
}

export interface Perf {
  empId: string
  /** Skor per kuartal, null jika belum bekerja atau belum dinilai. */
  quarters: (number | null)[]
  goals: Goal[]
  reviewer: string
  reviewed: boolean
  reviewedAt: string | null
  note: string
}

export type RatingKind = 'hadir' | 'wfh' | 'terlambat' | 'alpa' | 'belum'
export interface Rating {
  label: string
  kind: RatingKind
}

export const RATINGS: Rating[] = [
  { label: 'Sangat baik', kind: 'hadir' },
  { label: 'Baik', kind: 'wfh' },
  { label: 'Cukup', kind: 'terlambat' },
  { label: 'Perlu perbaikan', kind: 'alpa' },
]
export const NOT_RATED: Rating = { label: 'Belum dinilai', kind: 'belum' }

export function ratingOf(score: number | null): Rating {
  if (score == null) return NOT_RATED
  if (score >= 85) return RATINGS[0]
  if (score >= 70) return RATINGS[1]
  if (score >= 60) return RATINGS[2]
  return RATINGS[3]
}

export function scoreOf(p: Perf): number | null {
  for (let i = p.quarters.length - 1; i >= 0; i--) {
    const v = p.quarters[i]
    if (v != null) return v
  }
  return null
}

/** Selisih skor terbaru dengan kuartal sebelumnya, null jika tidak ada pembanding. */
export function deltaOf(p: Perf): number | null {
  const idx: number[] = []
  p.quarters.forEach((v, i) => v != null && idx.push(i))
  if (idx.length < 2) return null
  return (p.quarters[idx[idx.length - 1]] as number) - (p.quarters[idx[idx.length - 2]] as number)
}

const REVIEWERS: Record<Dept, string> = {
  Engineering: 'Fajar Nugroho',
  Product: 'Citra Dewi',
  Design: 'Laras Wulandari',
  Finance: 'Budi Hartono',
  Sales: 'Tania Lubis',
  Operations: 'Arif Setiawan',
  HR: 'Rina Kartika',
}

const GOALS: Record<Dept, [string, string][]> = {
  Engineering: [['Rilis fitur sesuai sprint', '90% story point selesai'], ['Cakupan unit test', 'Minimal 80%'], ['Respons bug kritis', 'Kurang dari 4 jam']],
  Product: [['Spesifikasi fitur kuartal ini', '4 PRD disetujui'], ['Riset pengguna', '8 wawancara'], ['Adopsi fitur baru', '35% pengguna aktif']],
  Design: [['Desain layar prioritas', '12 layar final'], ['Konsistensi design system', 'Audit komponen 100%'], ['Uji kegunaan', '3 sesi pengujian']],
  Finance: [['Penutupan buku bulanan', 'Selesai maksimal H+5'], ['Akurasi rekonsiliasi', '100% sesuai'], ['Penagihan tepat waktu', '95% invoice']],
  Sales: [['Target pendapatan', 'Rp 1,2 miliar'], ['Klien baru', '10 klien'], ['Tingkat konversi', '25%']],
  Operations: [['Waktu penyelesaian tiket', 'Kurang dari 8 jam'], ['Kepuasan pelanggan', 'CSAT minimal 4,5'], ['Ketepatan pengiriman', '97% tepat waktu']],
  HR: [['Proses rekrutmen', 'Rata-rata 30 hari'], ['Kepatuhan administrasi', '100% berkas lengkap'], ['Program pengembangan', '2 pelatihan']],
}

const NOTES: Record<RatingKind, string[]> = {
  hadir: ['Konsisten melampaui target dan aktif membantu rekan satu tim.', 'Kualitas kerja sangat baik, mampu memimpin inisiatif tanpa diminta.'],
  wfh: ['Target tercapai dengan stabil. Perlu lebih proaktif berbagi hasil kerja.', 'Kinerja baik dan komunikasi lancar. Ada ruang untuk mengambil tanggung jawab lebih besar.'],
  terlambat: ['Sebagian target belum tercapai. Disepakati rencana perbaikan untuk bulan depan.', 'Hasil cukup, tetapi ketepatan waktu penyelesaian masih perlu ditingkatkan.'],
  alpa: ['Target utama belum tercapai. Perlu pendampingan mingguan dengan atasan.'],
  belum: [''],
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))

export function seedPerformance(emps: Employee[]): Perf[] {
  const r = rng(99)
  return emps.map((e) => {
    const base = 50 + Math.floor(r() * 45)
    const first = e.join < `${YEAR}-01-01` ? 0 : Math.floor((Number(e.join.slice(5, 7)) - 1) / 3) + 1
    const quarters = QUARTER_LABELS.map((_, q) =>
      q < first || q > CURRENT_Q ? null : clamp(Math.round(base + (q - CURRENT_Q) * (r() * 4 - 1) + (r() * 8 - 4)), 40, 99),
    )
    const latest = [...quarters].reverse().find((v) => v != null) ?? null
    const rating = ratingOf(latest)
    const reviewer = REVIEWERS[e.dept] === e.name ? 'Direksi' : REVIEWERS[e.dept]
    const reviewed = latest != null && r() > 0.4
    const goals = GOALS[e.dept].map(([title, target], i) => ({
      id: `${e.id}-g${i + 1}`,
      title,
      target,
      progress: latest == null ? 0 : clamp(Math.round(latest + (r() * 30 - 18)), 20, 100),
    }))
    const notes = NOTES[rating.kind]
    return {
      empId: e.id,
      quarters,
      goals,
      reviewer,
      reviewed,
      reviewedAt: reviewed ? addDays(TODAY, -Math.floor(r() * 10)) : null,
      note: reviewed ? notes[Math.floor(r() * notes.length)] : '',
    }
  })
}
