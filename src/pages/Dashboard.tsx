import { useMemo, useState } from 'react'
import { DEPTS, TODAY, type AttendanceRecord } from '../data'
import { addDays, fmtDate, lastWorkdays, timeAgo } from '../lib'
import { useStore } from '../store'
import { Avatar, Icon, useNow } from '../ui'
import { Donut, LineChart, StackedBars, type BarDatum, type BarSeg, type DonutSeg, type LinePoint } from '../charts'

type Period = 7 | 14 | 30
const PERIODS: Period[] = [7, 14, 30]

const SEGS: BarSeg[] = [
  { key: 'hadir', label: 'Hadir', color: 'var(--good)' },
  { key: 'wfh', label: 'WFH', color: 'var(--info)' },
  { key: 'terlambat', label: 'Terlambat', color: 'var(--warn)' },
  { key: 'absen', label: 'Izin, cuti, alpa', color: 'var(--bad)' },
  { key: 'belum', label: 'Belum absen', color: 'var(--none)' },
]

const FEED_ICON = { clockin: 'clockin', leave: 'calendar', decision: 'check', review: 'review' } as const

export default function Dashboard({ go }: { go: (p: string) => void }) {
  const { employees, attendance, leaves, isHR, me, decideLeave, feed, live } = useStore()
  const [period, setPeriod] = useState<Period>(14)
  const now = useNow(15000)

  const byDay = useMemo(() => {
    const m = new Map<string, AttendanceRecord[]>()
    attendance.forEach((a) => {
      const l = m.get(a.date)
      if (l) l.push(a)
      else m.set(a.date, [a])
    })
    return m
  }, [attendance])

  const today = byDay.get(TODAY) ?? []
  const count = (s: string) => today.filter((a) => a.status === s).length
  const present = count('hadir') + count('terlambat') + count('wfh')
  const pending = leaves.filter((l) => l.status === 'Menunggu')
  const away = today.filter((a) => a.status === 'cuti' || a.status === 'izin')
  const newcomers = employees.filter((e) => e.join >= addDays(TODAY, -90)).length

  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam'

  const days = useMemo(() => lastWorkdays(period, TODAY), [period])

  const { bars, rates, avg, yMin } = useMemo(() => {
    const bars: BarDatum[] = []
    const rates: LinePoint[] = []
    const vals: number[] = []
    days.forEach((d) => {
      const rows = byDay.get(d) ?? []
      const n = (...s: string[]) => rows.filter((a) => s.includes(a.status)).length
      const v = { hadir: n('hadir'), wfh: n('wfh'), terlambat: n('terlambat'), absen: n('izin', 'cuti', 'alpa'), belum: n('belum') }
      const isToday = d === TODAY
      const title = fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' }) + (isToday ? ' (berjalan)' : '')
      const total = rows.length - v.belum
      const rate = total > 0 ? Math.round(((v.hadir + v.wfh + v.terlambat) / total) * 1000) / 10 : null
      bars.push({
        id: d,
        label: fmtDate(d, { day: 'numeric' }),
        values: v,
        tip: {
          title,
          rows: SEGS.filter((s) => v[s.key as keyof typeof v] > 0 || s.key === 'hadir').map((s) => ({ color: s.color, label: s.label, value: String(v[s.key as keyof typeof v]) })),
          foot: rate == null ? undefined : `Tingkat kehadiran ${rate}%`,
        },
      })
      rates.push({
        label: fmtDate(d, { day: 'numeric' }),
        value: rate,
        tip: { title, rows: [{ label: 'Tingkat kehadiran', value: rate == null ? '-' : `${rate}%` }, { label: 'Hadir, WFH, terlambat', value: `${v.hadir + v.wfh + v.terlambat} dari ${total}` }], foot: isToday ? `Dihitung dari yang sudah absen, ${v.belum} belum` : undefined },
      })
      if (rate != null && !isToday) vals.push(rate)
    })
    const avg = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0
    const allRates = rates.map((r) => r.value).filter((v): v is number => v != null)
    const yMin = Math.max(0, Math.floor((Math.min(...allRates, 100) - 5) / 10) * 10)
    return { bars, rates, avg, yMin }
  }, [days, byDay])

  const donut: DonutSeg[] = [
    { key: 'hadir', label: 'Hadir', value: count('hadir'), color: 'var(--good)' },
    { key: 'wfh', label: 'WFH', value: count('wfh'), color: 'var(--info)' },
    { key: 'terlambat', label: 'Terlambat', value: count('terlambat'), color: 'var(--warn)' },
    { key: 'cuti', label: 'Izin atau cuti', value: count('cuti') + count('izin'), color: 'var(--leave)' },
    { key: 'belum', label: 'Belum absen', value: count('belum'), color: 'var(--none)' },
  ]

  const byDept = DEPTS.map((d) => ({ d, n: employees.filter((e) => e.dept === d).length })).sort((a, b) => b.n - a.n)
  const maxDept = Math.max(...byDept.map((x) => x.n))
  const mid = yMin + (100 - yMin) / 2

  return (
    <>
      <header className="page-head">
        <div>
          <h1>
            {greet}, {me.name.split(' ')[0]}
          </h1>
          <p className="muted">
            {fmtDate(TODAY, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · PT Nusa Kreasi Digital
          </p>
        </div>
        <div className="seg inline" role="group" aria-label="Periode grafik">
          {PERIODS.map((p) => (
            <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>
              {p} hari kerja
            </button>
          ))}
        </div>
      </header>

      <section className="tiles" aria-label="Ringkasan">
        <button className="tile tile-link" onClick={() => go('karyawan')}>
          <span className="tile-label">Total karyawan</span>
          <strong className="tile-value">{employees.length}</strong>
          <span className="tile-sub">{newcomers} bergabung dalam 3 bulan terakhir</span>
        </button>
        <button className="tile tile-link" onClick={() => go('absensi')}>
          <span className="tile-label">Hadir hari ini</span>
          <strong className="tile-value">
            {present}
            <small>/{employees.length}</small>
          </strong>
          <span className="tile-sub">
            {Math.round((present / employees.length) * 100)}% termasuk {count('wfh')} WFH
          </span>
        </button>
        <button className="tile tile-link tile-warn" onClick={() => go('absensi')}>
          <span className="tile-label">Terlambat</span>
          <strong className="tile-value">{count('terlambat')}</strong>
          <span className="tile-sub">Masuk setelah 08:15</span>
        </button>
        <button className="tile tile-link" onClick={() => go('cuti')}>
          <span className="tile-label">Menunggu persetujuan</span>
          <strong className="tile-value">{pending.length}</strong>
          <span className="tile-sub">Pengajuan cuti dan izin</span>
        </button>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Kehadiran {period} hari kerja terakhir</h2>
            <div className="legend">
              {SEGS.map((s) => (
                <span key={s.key}>
                  <i className="dot" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <StackedBars data={bars} segs={SEGS} max={employees.length} ariaLabel={`Grafik batang kehadiran harian ${period} hari kerja terakhir dari ${employees.length} karyawan`} />
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Status hari ini</h2>
            <span className="muted small">{live ? 'Diperbarui langsung' : 'Pembaruan dijeda'}</span>
          </div>
          <Donut segs={donut} centerValue={`${present}`} centerLabel={`hadir dari ${employees.length}`} ariaLabel={`Diagram donat status kehadiran hari ini, ${present} dari ${employees.length} hadir`} />
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Tingkat kehadiran</h2>
            <span className="muted small">Rata-rata periode ini {avg}%</span>
          </div>
          <LineChart
            points={rates}
            yMin={yMin}
            yMax={100}
            ticks={[yMin, mid, 100]}
            suffix="%"
            avg={{ value: avg, label: `Rata-rata ${avg}%` }}
            ariaLabel={`Grafik garis tingkat kehadiran ${period} hari kerja terakhir, rata-rata ${avg} persen`}
          />
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Karyawan per departemen</h2>
          </div>
          <ul className="bars">
            {byDept.map((x) => (
              <li key={x.d}>
                <span>{x.d}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(x.n / maxDept) * 100}%` }} />
                </div>
                <b>{x.n}</b>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Menunggu persetujuan</h2>
            <button className="link-btn" onClick={() => go('cuti')}>Lihat semua</button>
          </div>
          {pending.length === 0 ? (
            <p className="empty">Semua pengajuan sudah diproses.</p>
          ) : (
            <ul className="list">
              {pending.slice(0, 5).map((l) => {
                const e = employees.find((x) => x.id === l.empId)!
                return (
                  <li key={l.id}>
                    <Avatar name={e.name} />
                    <div className="grow">
                      <b>{e.name}</b>
                      <span className="muted small">
                        {l.type} · {fmtDate(l.from, { day: 'numeric', month: 'short' })}
                        {l.to !== l.from && ` – ${fmtDate(l.to, { day: 'numeric', month: 'short' })}`} · {l.days} hari
                      </span>
                    </div>
                    {isHR && (
                      <div className="row-actions">
                        <button className="icon-btn ok" aria-label={`Setujui ${e.name}`} onClick={() => decideLeave(l.id, 'Disetujui')}>
                          <Icon name="check" />
                        </button>
                        <button className="icon-btn no" aria-label={`Tolak ${e.name}`} onClick={() => decideLeave(l.id, 'Ditolak')}>
                          <Icon name="close" />
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Aktivitas terbaru</h2>
            <span className={`live-tag ${live ? 'on' : ''}`}>
              <i />
              {live ? 'Live' : 'Dijeda'}
            </span>
          </div>
          {feed.length === 0 ? (
            <p className="empty">Belum ada aktivitas.</p>
          ) : (
            <ul className="feed">
              {feed.slice(0, 6).map((f) => (
                <li key={f.id}>
                  <span className={`feed-ic k-${f.kind}`}>
                    <Icon name={FEED_ICON[f.kind]} size={15} />
                  </span>
                  <span className="grow">{f.text}</span>
                  <span className="muted small nowrap">{timeAgo(f.ts, now)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card away">
        <div className="card-head">
          <h2>Cuti dan izin hari ini</h2>
          <span className="muted small">{away.length} orang</span>
        </div>
        {away.length === 0 ? (
          <p className="empty">Tidak ada yang cuti atau izin hari ini.</p>
        ) : (
          <ul className="chips-row">
            {away.map((a) => {
              const e = employees.find((x) => x.id === a.empId)!
              const l = leaves.find((x) => x.empId === e.id && x.status === 'Disetujui' && TODAY >= x.from && TODAY <= x.to)
              return (
                <li key={a.empId}>
                  <Avatar name={e.name} size={30} />
                  <div>
                    <b>{e.name}</b>
                    <span className="muted small">
                      {e.dept} · {l ? `${l.type}, sampai ${fmtDate(l.to, { day: 'numeric', month: 'short' })}` : a.status === 'cuti' ? 'Cuti' : 'Izin'}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
