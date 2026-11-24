import { useMemo, useState, type FormEvent } from 'react'
import { DEPTS, TODAY, balanceOf, type ContractType, type Dept, type Employee } from '../data'
import { addDays, fmtDate, isWeekend } from '../lib'
import { useStore } from '../store'
import { Avatar, Drawer, Icon, LeavePill, Modal, StatusPill, STATUS_LABEL } from '../ui'

type SortKey = 'name' | 'dept' | 'role' | 'type' | 'join'

const TYPES: ContractType[] = ['Tetap', 'Kontrak', 'Probation']

export default function Employees() {
  const { employees, attendance, isHR } = useStore()
  const [q, setQ] = useState('')
  const [dept, setDept] = useState<'' | Dept>('')
  const [type, setType] = useState<'' | ContractType>('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 })

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return employees
      .filter((e) => (!dept || e.dept === dept) && (!type || e.type === type))
      .filter((e) => !s || `${e.name} ${e.role} ${e.email}`.toLowerCase().includes(s))
      .sort((a, b) => {
        const r = sort.key === 'join' ? a.join.localeCompare(b.join) : String(a[sort.key]).localeCompare(String(b[sort.key]), 'id')
        return (r || a.name.localeCompare(b.name, 'id')) * sort.dir
      })
  }, [employees, q, dept, type, sort])

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))
  const th = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button className="th-sort" onClick={() => toggleSort(key)}>
        {label}
        <Icon name={sort.key === key ? (sort.dir === 1 ? 'up' : 'down') : 'sort'} size={13} />
      </button>
    </th>
  )

  const statusToday = (id: string) => attendance.find((a) => a.empId === id && a.date === TODAY)?.status ?? 'belum'
  const open = employees.find((e) => e.id === openId) ?? null

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Data karyawan</h1>
          <p className="muted">{employees.length} karyawan aktif di {DEPTS.length} departemen</p>
        </div>
        {isHR && (
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} /> Tambah karyawan
          </button>
        )}
      </header>

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={16} />
          <input id="emp-search" type="search" placeholder="Cari nama, jabatan, atau email" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select id="emp-dept" aria-label="Filter departemen" value={dept} onChange={(e) => setDept(e.target.value as Dept | '')}>
          <option value="">Semua departemen</option>
          {DEPTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select id="emp-type" aria-label="Filter status kepegawaian" value={type} onChange={(e) => setType(e.target.value as ContractType | '')}>
          <option value="">Semua status</option>
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {th('name', 'Karyawan')}
                {th('dept', 'Departemen')}
                {th('role', 'Jabatan')}
                {th('type', 'Status')}
                {th('join', 'Bergabung')}
                <th>Hari ini</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} tabIndex={0} className="clickable" onClick={() => setOpenId(e.id)} onKeyDown={(ev) => ev.key === 'Enter' && setOpenId(e.id)}>
                  <td>
                    <div className="who">
                      <Avatar name={e.name} />
                      <div>
                        <b>{e.name}</b>
                        <span className="muted small">{e.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{e.dept}</td>
                  <td>{e.role}</td>
                  <td>
                    <span className={`tag tag-${e.type.toLowerCase()}`}>{e.type}</span>
                  </td>
                  <td className="num">{fmtDate(e.join)}</td>
                  <td>
                    <StatusPill status={statusToday(e.id)} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    Tidak ada karyawan yang cocok dengan pencarian ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-foot muted small">
          Menampilkan {rows.length} dari {employees.length} karyawan
        </div>
      </div>

      {open && <Profile emp={open} onClose={() => setOpenId(null)} />}
      {adding && <AddForm onClose={() => setAdding(false)} />}
    </>
  )
}

function Profile({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const { attendance, leaves } = useStore()
  const bal = balanceOf(emp, leaves)
  const recent = useMemo(() => {
    const out: string[] = []
    let c = TODAY
    while (out.length < 14) {
      if (!isWeekend(c)) out.unshift(c)
      c = addDays(c, -1)
    }
    return out
  }, [])
  const mine = leaves.filter((l) => l.empId === emp.id).slice(0, 3)
  const tenure = Math.max(0, Math.floor((new Date(TODAY).getTime() - new Date(emp.join).getTime()) / (86400000 * 30.4)))

  return (
    <Drawer title="Profil karyawan" onClose={onClose}>
      <div className="profile-top">
        <Avatar name={emp.name} size={64} />
        <div>
          <h3>{emp.name}</h3>
          <p className="muted">
            {emp.role} · {emp.dept}
          </p>
          <span className={`tag tag-${emp.type.toLowerCase()}`}>{emp.type}</span>
        </div>
      </div>

      <dl className="facts">
        <div><dt><Icon name="mail" size={15} />Email</dt><dd>{emp.email}</dd></div>
        <div><dt><Icon name="phone" size={15} />Telepon</dt><dd className="num">{emp.phone}</dd></div>
        <div><dt><Icon name="pin" size={15} />Kota</dt><dd>{emp.city}</dd></div>
        <div><dt><Icon name="calendar" size={15} />Bergabung</dt><dd>{fmtDate(emp.join)} ({tenure} bulan)</dd></div>
      </dl>

      <h4>Saldo cuti tahunan</h4>
      {bal.quota === 0 ? (
        <p className="muted small">Belum berhak cuti tahunan selama masa probation.</p>
      ) : (
        <>
          <div className="meter" role="img" aria-label={`Terpakai ${bal.used}, menunggu ${bal.pending}, sisa ${bal.remaining} dari ${bal.quota} hari`}>
            <span className="m-used" style={{ width: `${(bal.used / bal.quota) * 100}%` }} />
            <span className="m-pending" style={{ width: `${(bal.pending / bal.quota) * 100}%` }} />
          </div>
          <p className="small muted">
            Terpakai {bal.used} · Menunggu {bal.pending} · <b className="ink">Sisa {bal.remaining}</b> dari {bal.quota} hari
          </p>
        </>
      )}

      <h4>Kehadiran 14 hari kerja terakhir</h4>
      <div className="strip">
        {recent.map((d) => {
          const s = attendance.find((a) => a.empId === emp.id && a.date === d)?.status
          return <span key={d} className={`cell s-${s ?? 'none'}`} title={`${fmtDate(d, { day: 'numeric', month: 'short' })}: ${s ? STATUS_LABEL[s] : 'Belum bergabung'}`} />
        })}
      </div>

      <h4>Pengajuan terbaru</h4>
      {mine.length === 0 ? (
        <p className="muted small">Belum ada pengajuan cuti atau izin.</p>
      ) : (
        <ul className="list compact">
          {mine.map((l) => (
            <li key={l.id}>
              <div className="grow">
                <b>{l.type}</b>
                <span className="muted small">
                  {fmtDate(l.from, { day: 'numeric', month: 'short' })}
                  {l.to !== l.from && ` – ${fmtDate(l.to, { day: 'numeric', month: 'short' })}`} · {l.days} hari
                </span>
              </div>
              <LeavePill status={l.status} />
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  )
}

function AddForm({ onClose }: { onClose: () => void }) {
  const { addEmployee } = useStore()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [dept, setDept] = useState<Dept>('Engineering')
  const [type, setType] = useState<ContractType>('Probation')
  const [join, setJoin] = useState(TODAY)
  const [city, setCity] = useState('Jakarta')
  const [err, setErr] = useState('')

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    if (!name.trim() || !role.trim()) {
      setErr('Nama dan jabatan wajib diisi.')
      return
    }
    const email = `${name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/ +/g, '.')}@nusakreasi.co.id`
    addEmployee({ name: name.trim(), role: role.trim(), dept, type, join, city, email })
    onClose()
  }

  return (
    <Modal title="Tambah karyawan" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label htmlFor="f-name">Nama lengkap
          <input id="f-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label htmlFor="f-role">Jabatan
          <input id="f-role" value={role} onChange={(e) => setRole(e.target.value)} />
        </label>
        <div className="form-row">
          <label htmlFor="f-dept">Departemen
            <select id="f-dept" value={dept} onChange={(e) => setDept(e.target.value as Dept)}>
              {DEPTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label htmlFor="f-type">Status
            <select id="f-type" value={type} onChange={(e) => setType(e.target.value as ContractType)}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label htmlFor="f-join">Tanggal bergabung
            <input id="f-join" type="date" value={join} onChange={(e) => setJoin(e.target.value)} />
          </label>
          <label htmlFor="f-city">Kota
            <input id="f-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
        </div>
        {err && <p className="error" role="alert">{err}</p>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>Batal</button>
          <button type="submit" className="btn btn-primary">Simpan karyawan</button>
        </div>
      </form>
    </Modal>
  )
}
