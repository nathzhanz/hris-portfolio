import { useState, type FormEvent } from 'react'
import { LEAVE_TYPES, TODAY, balanceOf, type LeaveStatus, type LeaveType } from '../data'
import { bizDays, fmtDate } from '../lib'
import { useStore } from '../store'
import { Avatar, Icon, LeavePill, Modal } from '../ui'

const TABS: ('Semua' | LeaveStatus)[] = ['Semua', 'Menunggu', 'Disetujui', 'Ditolak']

export default function Leave() {
  const { me, employees, leaves, isHR, submitLeave, decideLeave } = useStore()
  const [type, setType] = useState<LeaveType>('Cuti Tahunan')
  const [from, setFrom] = useState(TODAY)
  const [to, setTo] = useState(TODAY)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<(typeof TABS)[number]>('Semua')
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState<string | null>(null)

  const bal = balanceOf(me, leaves)
  const days = to >= from ? bizDays(from, to) : 0
  const annual = type === 'Cuti Tahunan'

  const visible = leaves
    .filter((l) => isHR || l.empId === me.id)
    .filter((l) => tab === 'Semua' || l.status === tab)

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    if (to < from) return setErr('Tanggal selesai tidak boleh sebelum tanggal mulai.')
    if (days === 0) return setErr('Rentang tanggal ini hanya berisi akhir pekan. Pilih hari kerja.')
    if (!reason.trim()) return setErr('Tulis alasan singkat agar HR bisa memproses pengajuan.')
    if (annual && days > bal.remaining) return setErr(`Sisa cuti tahunan kamu ${bal.remaining} hari, pengajuan ini ${days} hari.`)
    setErr('')
    const id = submitLeave({ type, from, to, reason: reason.trim() })
    setFlash(id)
    window.setTimeout(() => setFlash((f) => (f === id ? null : f)), 2600)
    setReason('')
    setTab('Semua')
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Cuti dan izin</h1>
          <p className="muted">{isHR ? 'Kelola pengajuan seluruh karyawan.' : 'Ajukan cuti dan pantau statusnya.'}</p>
        </div>
      </header>

      <div className="leave-grid">
        <section className="card">
          <div className="card-head">
            <h2>Ajukan cuti atau izin</h2>
            <span className="muted small">sebagai {me.name}</span>
          </div>
          <form className="form" onSubmit={submit}>
            <label htmlFor="l-type">Jenis
              <select id="l-type" value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
                {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <div className="form-row">
              <label htmlFor="l-from">Mulai
                <input id="l-from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value) }} />
              </label>
              <label htmlFor="l-to">Selesai
                <input id="l-to" type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
            </div>
            <label htmlFor="l-reason">Alasan
              <textarea id="l-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: acara keluarga di luar kota" />
            </label>
            <p className="summary num">
              {days} hari kerja
              {annual && bal.quota > 0 && <> · sisa cuti setelah pengajuan <b>{Math.max(bal.remaining - days, 0)}</b> hari</>}
            </p>
            {err && <p className="error" role="alert">{err}</p>}
            <button type="submit" className="btn btn-primary">Kirim pengajuan</button>
          </form>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Saldo cuti tahunan</h2>
            <span className="muted small">{fmtDate(TODAY, { year: 'numeric' })}</span>
          </div>
          {bal.quota === 0 ? (
            <p className="muted">Kamu masih probation, jadi belum berhak cuti tahunan. Izin dan sakit tetap bisa diajukan.</p>
          ) : (
            <>
              <div className="balance"><strong>{bal.remaining}</strong><span>hari tersisa dari {bal.quota}</span></div>
              <div className="meter" role="img" aria-label={`Terpakai ${bal.used}, menunggu ${bal.pending}, sisa ${bal.remaining} hari`}>
                <span className="m-used" style={{ width: `${(bal.used / bal.quota) * 100}%` }} />
                <span className="m-pending" style={{ width: `${(bal.pending / bal.quota) * 100}%` }} />
              </div>
              <ul className="key">
                <li><i className="dot m-used" />Terpakai <b>{bal.used}</b></li>
                <li><i className="dot m-pending" />Menunggu persetujuan <b>{bal.pending}</b></li>
                <li><i className="dot m-free" />Tersedia <b>{bal.remaining}</b></li>
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t} <span className="count">{leaves.filter((l) => (isHR || l.empId === me.id) && (t === 'Semua' || l.status === t)).length}</span>
          </button>
        ))}
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Karyawan</th><th>Jenis</th><th>Tanggal</th><th>Hari</th><th>Alasan</th><th>Status</th>{isHR && <th aria-label="Aksi" />}</tr>
            </thead>
            <tbody>
              {visible.map((l) => {
                const e = employees.find((x) => x.id === l.empId)!
                return (
                  <tr key={l.id} className={flash === l.id ? 'flash' : undefined}>
                    <td><div className="who"><Avatar name={e.name} /><b>{e.name}</b></div></td>
                    <td>{l.type}</td>
                    <td className="num nowrap">
                      {fmtDate(l.from, { day: 'numeric', month: 'short' })}
                      {l.to !== l.from && ` – ${fmtDate(l.to, { day: 'numeric', month: 'short' })}`}
                    </td>
                    <td className="num">{l.days}</td>
                    <td className="reason">
                      {l.reason}
                      {l.note && <span className="muted small">Catatan HR: {l.note}</span>}
                    </td>
                    <td><LeavePill status={l.status} /></td>
                    {isHR && (
                      <td>
                        {l.status === 'Menunggu' && (
                          <div className="row-actions">
                            <button className="btn btn-sm" onClick={() => decideLeave(l.id, 'Disetujui')}><Icon name="check" size={14} />Setujui</button>
                            <button className="btn btn-sm btn-danger" onClick={() => { setRejecting(l.id); setNote('') }}>Tolak</button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
              {visible.length === 0 && (
                <tr><td colSpan={isHR ? 7 : 6} className="empty">Belum ada pengajuan di kategori ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rejecting && (
        <Modal title="Tolak pengajuan" onClose={() => setRejecting(null)}>
          <form className="form" onSubmit={(ev) => { ev.preventDefault(); decideLeave(rejecting, 'Ditolak', note.trim()); setRejecting(null) }}>
            <label htmlFor="r-note">Catatan untuk karyawan (opsional)
              <textarea id="r-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
            </label>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setRejecting(null)}>Batal</button>
              <button type="submit" className="btn btn-danger-solid">Tolak pengajuan</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
