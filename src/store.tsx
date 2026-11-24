import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CURRENT_Q,
  CURRENT_Q_LABEL,
  ME_HR,
  ME_STAFF,
  TODAY,
  applyLeavesToAttendance,
  quotaOf,
  seedAttendance,
  seedEmployees,
  seedLeaves,
  seedPerformance,
  type AttendanceRecord,
  type Employee,
  type Leave,
  type LeaveStatus,
  type LeaveType,
  type Perf,
  type Status,
} from './data'
import { addDays, bizDays, isWeekend, nowHM, pad } from './lib'

export type Role = 'hr' | 'staff'

export interface FeedItem {
  id: string
  ts: number
  kind: 'clockin' | 'leave' | 'decision' | 'review'
  text: string
  audience: 'hr' | 'staff'
}

interface Store {
  employees: Employee[]
  attendance: AttendanceRecord[]
  leaves: Leave[]
  perf: Perf[]
  role: Role
  setRole: (r: Role) => void
  me: Employee
  isHR: boolean
  clockIn: (wfh: boolean) => void
  clockOut: () => void
  addEmployee: (e: Omit<Employee, 'id' | 'usedLeave' | 'phone'>) => void
  submitLeave: (p: { type: LeaveType; from: string; to: string; reason: string }) => string
  decideLeave: (id: string, status: LeaveStatus, note?: string) => void
  reviewPerformance: (empId: string, score: number, note: string) => void
  feed: FeedItem[]
  unread: number
  markRead: () => void
  live: boolean
  setLive: (v: boolean) => void
  toast: string | null
  notify: (msg: string) => void
}

const Ctx = createContext<Store | null>(null)

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
const SIM_TYPES: LeaveType[] = ['Cuti Tahunan', 'Sakit', 'Izin Khusus']
const SIM_REASONS: Record<string, string[]> = {
  'Cuti Tahunan': ['Liburan keluarga', 'Pulang kampung', 'Istirahat setelah proyek', 'Menemani orang tua'],
  Sakit: ['Demam dan flu', 'Kontrol ke dokter', 'Sakit perut, istirahat di rumah'],
  'Izin Khusus': ['Mengurus dokumen kependudukan', 'Acara keluarga', 'Menghadiri wisuda saudara'],
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState(seedEmployees)
  const [leaves, setLeaves] = useState(seedLeaves)
  const [attendance, setAttendance] = useState(() => applyLeavesToAttendance(seedAttendance(seedEmployees()), seedLeaves()))
  const [perf, setPerf] = useState(() => seedPerformance(seedEmployees()))
  const [role, setRole] = useState<Role>('hr')
  const [toast, setToast] = useState<string | null>(null)
  const [live, setLive] = useState(true)
  const [readAt, setReadAt] = useState(() => Date.now())
  const [feedAll, setFeedAll] = useState<FeedItem[]>(() => {
    const t = Date.now()
    return [
      { id: 's1', ts: t - 4 * 60000, kind: 'clockin', text: 'Sekar Ayuningtyas clock in pukul 08:13 (WFH)', audience: 'hr' },
      { id: 's2', ts: t - 22 * 60000, kind: 'leave', text: 'Kevin Santoso mengajukan Cuti Tahunan (4 hari)', audience: 'hr' },
      { id: 's3', ts: t - 3 * 3600000, kind: 'review', text: `Penilaian ${CURRENT_Q_LABEL} dibuka untuk semua karyawan`, audience: 'staff' },
    ]
  })

  const leaveSeq = useRef(100)
  const submitMs = useRef(new Map<string, number>())
  const simLeaves = useRef(0)
  const snap = useRef({ employees, attendance, leaves, role })
  snap.current = { employees, attendance, leaves, role }

  const me = employees.find((e) => e.id === (role === 'hr' ? ME_HR : ME_STAFF))!

  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2800)
  }, [])

  const pushFeed = useCallback((kind: FeedItem['kind'], text: string, audience: FeedItem['audience']) => {
    setFeedAll((f) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts: Date.now(), kind, text, audience }, ...f].slice(0, 40))
  }, [])

  // Simulasi data langsung: clock in karyawan lain, pengajuan baru, dan keputusan HR untuk akun karyawan demo.
  useEffect(() => {
    if (!live) return
    const timer = window.setInterval(() => {
      const s = snap.current
      const now = Date.now()

      const mine = s.leaves.find((l) => l.empId === ME_STAFF && l.status === 'Menunggu' && now - (submitMs.current.get(l.id) ?? now) > 9000)
      if (mine) {
        const ok = Math.random() > 0.2
        const note = ok ? undefined : 'Mohon ajukan ulang dengan tanggal berbeda.'
        setLeaves((l) => l.map((x) => (x.id === mine.id ? { ...x, status: ok ? 'Disetujui' : 'Ditolak', note: note ?? x.note } : x)))
        pushFeed('decision', ok ? `HR menyetujui pengajuan ${mine.type} kamu` : `HR menolak pengajuan ${mine.type} kamu`, 'staff')
        if (s.role === 'staff') notify(ok ? 'HR menyetujui pengajuan kamu' : 'HR menolak pengajuan kamu')
        return
      }

      const roll = Math.random()
      const waiting = s.employees.filter(
        (e) => e.id !== ME_HR && e.id !== ME_STAFF && s.attendance.some((a) => a.empId === e.id && a.date === TODAY && a.status === 'belum'),
      )
      if (waiting.length && roll < 0.75) {
        const e = pick(waiting)
        const mins = 7 * 60 + 35 + Math.floor(Math.random() * 95)
        const t = `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`
        const wfh = Math.random() < 0.15
        const status: Status = wfh ? 'wfh' : t > '08:15' ? 'terlambat' : 'hadir'
        setAttendance((list) => list.map((a) => (a.empId === e.id && a.date === TODAY ? { ...a, status, in: t } : a)))
        pushFeed('clockin', `${e.name} clock in pukul ${t}${wfh ? ' (WFH)' : status === 'terlambat' ? ' (terlambat)' : ''}`, 'hr')
        return
      }

      if (simLeaves.current < 5 && roll > 0.4) {
        const pool = s.employees.filter((e) => e.id !== ME_HR && e.id !== ME_STAFF && !s.leaves.some((l) => l.empId === e.id && l.status === 'Menunggu'))
        if (!pool.length) return
        const e = pick(pool)
        let type = pick(SIM_TYPES)
        if (type === 'Cuti Tahunan' && quotaOf(e) === 0) type = 'Izin Khusus'
        let from = addDays(TODAY, 2 + Math.floor(Math.random() * 12))
        while (isWeekend(from)) from = addDays(from, 1)
        const len = type === 'Cuti Tahunan' ? 1 + Math.floor(Math.random() * 3) : 1
        const to = addDays(from, len - 1)
        const days = Math.max(1, bizDays(from, to))
        const id = `l${++leaveSeq.current}`
        setLeaves((l) => [{ id, empId: e.id, type, from, to, days, reason: pick(SIM_REASONS[type]), status: 'Menunggu', created: TODAY }, ...l])
        simLeaves.current++
        pushFeed('leave', `${e.name} mengajukan ${type} (${days} hari)`, 'hr')
        if (s.role === 'hr') notify(`Pengajuan baru dari ${e.name}`)
      }
    }, 4000)
    return () => window.clearInterval(timer)
  }, [live, pushFeed, notify])

  const feed = useMemo(() => feedAll.filter((f) => f.audience === role), [feedAll, role])
  const unread = useMemo(() => feed.filter((f) => f.ts > readAt).length, [feed, readAt])

  const value = useMemo<Store>(() => {
    const upsertToday = (empId: string, patch: Partial<AttendanceRecord>) =>
      setAttendance((list) => {
        const has = list.some((a) => a.empId === empId && a.date === TODAY)
        if (!has) return [...list, { empId, date: TODAY, status: 'belum', ...patch }]
        return list.map((a) => (a.empId === empId && a.date === TODAY ? { ...a, ...patch } : a))
      })

    return {
      employees,
      attendance,
      leaves,
      perf,
      role,
      setRole,
      me,
      isHR: role === 'hr',
      toast,
      notify,
      feed,
      unread,
      markRead: () => setReadAt(Date.now()),
      live,
      setLive,
      clockIn: (wfh) => {
        const t = nowHM()
        const status = wfh ? 'wfh' : t > '08:15' ? 'terlambat' : 'hadir'
        upsertToday(me.id, { status, in: t, out: undefined })
        notify(`Clock in tercatat pukul ${t}`)
      },
      clockOut: () => {
        const t = nowHM()
        upsertToday(me.id, { out: t })
        notify(`Clock out tercatat pukul ${t}`)
      },
      addEmployee: (e) => {
        const id = `e${String(employees.length + 1).padStart(2, '0')}`
        const phone = `0812-${1000 + Math.floor(Math.random() * 8999)}-${1000 + Math.floor(Math.random() * 8999)}`
        setEmployees((l) => [...l, { ...e, id, phone, usedLeave: 0 }])
        setAttendance((l) => [...l, { empId: id, date: TODAY, status: 'belum' }])
        setPerf((l) => [
          ...l,
          { empId: id, quarters: [null, null, null, null], goals: [], reviewer: 'Belum ditentukan', reviewed: false, reviewedAt: null, note: '' },
        ])
        notify(`${e.name} ditambahkan ke daftar karyawan`)
      },
      submitLeave: ({ type, from, to, reason }) => {
        const id = `l${++leaveSeq.current}`
        const days = bizDays(from, to)
        submitMs.current.set(id, Date.now())
        setLeaves((l) => [{ id, empId: me.id, type, from, to, days, reason, status: 'Menunggu', created: TODAY }, ...l])
        pushFeed('leave', `${me.name} mengajukan ${type} (${days} hari)`, 'hr')
        notify('Pengajuan terkirim, menunggu persetujuan HR')
        return id
      },
      decideLeave: (id, status, note) => {
        const l = leaves.find((x) => x.id === id)
        setLeaves((list) => list.map((x) => (x.id === id ? { ...x, status, note: note || x.note } : x)))
        if (l?.empId === ME_STAFF) pushFeed('decision', `HR ${status === 'Disetujui' ? 'menyetujui' : 'menolak'} pengajuan ${l.type} kamu`, 'staff')
        notify(status === 'Disetujui' ? 'Pengajuan disetujui' : 'Pengajuan ditolak')
      },
      reviewPerformance: (empId, score, note) => {
        setPerf((list) =>
          list.map((p) =>
            p.empId === empId
              ? { ...p, quarters: p.quarters.map((v, i) => (i === CURRENT_Q ? score : v)), reviewed: true, reviewedAt: TODAY, note }
              : p,
          ),
        )
        if (empId === ME_STAFF) pushFeed('review', `Review ${CURRENT_Q_LABEL} kamu sudah diisi, skor ${score}`, 'staff')
        notify('Review tersimpan')
      },
    }
  }, [employees, attendance, leaves, perf, role, me, toast, notify, feed, unread, live, pushFeed])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore harus dipakai di dalam StoreProvider')
  return s
}
