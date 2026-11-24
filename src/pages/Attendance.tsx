import { useEffect, useMemo, useState } from 'react'
import { TODAY, type Status } from '../data'
import { addDays, fmtDate, isWeekend, pad, parse } from '../lib'
import { useStore } from '../store'
import { Avatar, StatusPill, STATUS_LABEL } from '../ui'

type Tab = 'hari-ini' | 'bulanan'
const FILTERS: ('semua' | Status)[] = ['semua', 'hadir', 'terlambat', 'wfh', 'izin', 'cuti', 'alpa', 'belum']

export default function Attendance() {
  const { me, attendance, employees, clockIn, clockOut } = useStore()
  const [tab, setTab] = useState<Tab>('hari-ini')
  const [filter, setFilter] = useState<'semua' | Status>('semua')
  const [wfh, setWfh] = useState(false)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const mine = attendance.find((a) => a.empId === me.id && a.date === TODAY)
  const clockedIn = !!mine?.in
  const clockedOut = !!mine?.out

  const month = TODAY.slice(0, 7)
  const monthRows = attendance.filter((a) => a.empId === me.id && a.date.startsWith(month))
  const tally = (...s: Status[]) => monthRows.filter((a) => s.includes(a.status)).length

  const todayRows = employees
    .map((e) => ({ e, a: attendance.find((x) => x.empId === e.id && x.date === TODAY) }))
    .filter(({ a }) => filter === 'semua' || (a?.status ?? 'belum') === filter)

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Absensi</h1>
          <p className="muted">{fmtDate(TODAY, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </header>

      <div className="clock-grid">
        <section className="card clock-card">
          <span className="muted small">Jam kerja 08:00 – 17:00, toleransi sampai 08:15</span>
          <div className="clock-time num" aria-live="off">
            {pad(now.getHours())}:{pad(now.getMinutes())}
            <small>:{pad(now.getSeconds())}</small>
          </div>
          <div className="clock-state">
            {mine ? <StatusPill status={mine.status} /> : <StatusPill status="belum" />}
            <span className="muted small num">
              Masuk {mine?.in ?? '–'} · Pulang {mine?.out ?? '–'}
            </span>
          </div>
          {!clockedIn && (
            <label className="check" htmlFor="wfh">
              <input id="wfh" type="checkbox" checked={wfh} onChange={(e) => setWfh(e.target.checked)} />
              Bekerja dari rumah hari ini
            </label>
          )}
          <div className="clock-actions">
            <button className="btn btn-primary btn-lg" disabled={clockedIn} onClick={() => clockIn(wfh)}>
              Clock in
            </button>
            <button className="btn btn-lg" disabled={!clockedIn || clockedOut} onClick={clockOut}>
              Clock out
            </button>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Ringkasan {fmtDate(TODAY, { month: 'long', year: 'numeric' })}</h2>
            <span className="muted small">{me.name}</span>
          </div>
          <div className="mini-tiles">
            <div><b>{tally('hadir')}</b><span>Hadir</span></div>
            <div><b>{tally('terlambat')}</b><span>Terlambat</span></div>
            <div><b>{tally('wfh')}</b><span>WFH</span></div>
            <div><b>{tally('izin', 'cuti')}</b><span>Izin / cuti</span></div>
            <div><b>{tally('alpa')}</b><span>Alpa</span></div>
          </div>
        </section>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'hari-ini'} onClick={() => setTab('hari-ini')}>Hari ini</button>
        <button role="tab" aria-selected={tab === 'bulanan'} onClick={() => setTab('bulanan')}>Rekap bulanan</button>
      </div>

      {tab === 'hari-ini' ? (
        <>
          <div className="chips" role="group" aria-label="Filter status kehadiran">
            {FILTERS.map((f) => (
              <button key={f} className={`chip ${filter === f ? 'on' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === 'semua' ? 'Semua' : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
          <div className="card table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Karyawan</th><th>Departemen</th><th>Masuk</th><th>Pulang</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {todayRows.map(({ e, a }) => (
                    <tr key={e.id}>
                      <td><div className="who"><Avatar name={e.name} /><b>{e.name}</b></div></td>
                      <td>{e.dept}</td>
                      <td className="num">{a?.in ?? '–'}</td>
                      <td className="num">{a?.out ?? '–'}</td>
                      <td><StatusPill status={a?.status ?? 'belum'} /></td>
                    </tr>
                  ))}
                  {todayRows.length === 0 && (
                    <tr><td colSpan={5} className="empty">Tidak ada karyawan dengan status ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <Monthly />
      )}
    </>
  )
}

function Monthly() {
  const { employees, attendance } = useStore()
  const month = TODAY.slice(0, 7)
  const first = `${month}-01`
  const lastDay = new Date(parse(first).getFullYear(), parse(first).getMonth() + 1, 0).getDate()
  const days = useMemo(() => Array.from({ length: lastDay }, (_, i) => addDays(first, i)), [first, lastDay])
  const map = useMemo(() => {
    const m = new Map<string, Status>()
    attendance.forEach((a) => m.set(`${a.empId}|${a.date}`, a.status))
    return m
  }, [attendance])

  return (
    <div className="card table-card">
      <div className="legend legend-pad">
        {(['hadir', 'terlambat', 'wfh', 'izin', 'cuti', 'alpa'] as Status[]).map((s) => (
          <span key={s}><i className={`dot s-${s}`} />{STATUS_LABEL[s]}</span>
        ))}
      </div>
      <div className="table-scroll">
        <table className="heat">
          <thead>
            <tr>
              <th className="sticky">Karyawan</th>
              {days.map((d) => (
                <th key={d} className={isWeekend(d) ? 'we' : ''}>{Number(d.slice(8))}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td className="sticky">{e.name}</td>
                {days.map((d) => {
                  const s = map.get(`${e.id}|${d}`)
                  const off = isWeekend(d) || d > TODAY
                  return (
                    <td key={d} className={off ? 'we' : ''}>
                      {!off && s && <span className={`cell s-${s}`} title={`${e.name}, ${fmtDate(d, { day: 'numeric', month: 'short' })}: ${STATUS_LABEL[s]}`} />}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
