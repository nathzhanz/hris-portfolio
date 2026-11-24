import { useMemo, useState, type FormEvent } from 'react'
import { CURRENT_Q, CURRENT_Q_LABEL, DEPTS, QUARTER_LABELS, RATINGS, YEAR, deltaOf, ratingOf, scoreOf, type Dept, type Employee, type Perf } from '../data'
import { fmtDate } from '../lib'
import { useStore } from '../store'
import { Avatar, Drawer, Icon, Modal, RatingPill } from '../ui'
import { LineChart, type LinePoint } from '../charts'

type SortKey = 'score' | 'name' | 'delta'

function Trend({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="muted small">-</span>
  if (delta === 0) return <span className="trend flat num">0</span>
  return (
    <span className={`trend num ${delta > 0 ? 'up' : 'down'}`} aria-label={`${delta > 0 ? 'Naik' : 'Turun'} ${Math.abs(delta)} poin dari kuartal sebelumnya`}>
      <Icon name={delta > 0 ? 'up' : 'down'} size={13} />
      {Math.abs(delta)}
    </span>
  )
}

function ScoreBar({ score }: { score: number | null }) {
  if (score == null) return <span className="muted small">-</span>
  const kind = ratingOf(score).kind
  return (
    <div className="score">
      <b className="num">{score}</b>
      <div className="score-track" aria-hidden="true">
        <span className={`k-${kind}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function quarterPoints(p: Perf, empName?: string): LinePoint[] {
  return QUARTER_LABELS.map((q, i) => ({
    label: q,
    value: p.quarters[i],
    tip: {
      title: `${q} ${YEAR}${empName ? ` · ${empName}` : ''}`,
      rows: [{ label: 'Skor', value: p.quarters[i] == null ? 'Belum ada' : String(p.quarters[i]) }],
    },
  }))
}

export function PerfDetail({ emp, perf }: { emp: Employee; perf: Perf }) {
  const score = scoreOf(perf)
  const rating = ratingOf(score)
  const delta = deltaOf(perf)
  return (
    <>
      <div className="perf-top">
        <div>
          <span className="tile-label">Skor {CURRENT_Q_LABEL}</span>
          <strong className="perf-score num">{score ?? '-'}</strong>
        </div>
        <div className="perf-meta">
          <RatingPill rating={rating} />
          <Trend delta={delta} />
        </div>
      </div>

      <h4>Skor per kuartal {YEAR}</h4>
      <LineChart
        points={quarterPoints(perf)}
        yMin={40}
        yMax={100}
        ticks={[40, 70, 100]}
        height={190}
        ariaLabel={`Grafik skor kinerja ${emp.name} per kuartal ${YEAR}`}
      />

      <h4>Target kuartal ini</h4>
      <ul className="goals">
        {perf.goals.map((g) => (
          <li key={g.id}>
            <div className="goal-head">
              <b>{g.title}</b>
              <span className="num">{g.progress}%</span>
            </div>
            <div className="goal-track" role="img" aria-label={`${g.title}: ${g.progress} persen dari target ${g.target}`}>
              <span style={{ width: `${g.progress}%` }} />
            </div>
            <span className="muted small">Target: {g.target}</span>
          </li>
        ))}
      </ul>

      <h4>Catatan atasan</h4>
      {perf.reviewed ? (
        <div className="note-box">
          <p>{perf.note}</p>
          <span className="muted small">
            {perf.reviewer} · {perf.reviewedAt && fmtDate(perf.reviewedAt, { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      ) : (
        <p className="muted small">Review {CURRENT_Q_LABEL} belum diisi oleh {perf.reviewer}. Skor di atas masih sementara.</p>
      )}
    </>
  )
}

function ReviewModal({ emp, perf, onClose }: { emp: Employee; perf: Perf; onClose: () => void }) {
  const { reviewPerformance } = useStore()
  const [score, setScore] = useState(scoreOf(perf) ?? 75)
  const [note, setNote] = useState(perf.note)
  const [err, setErr] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return setErr('Tulis catatan singkat untuk karyawan.')
    reviewPerformance(emp.id, score, note.trim())
    onClose()
  }
  const setNum = (v: string) => setScore(Math.min(100, Math.max(0, Number(v) || 0)))

  return (
    <Modal title={`Review ${CURRENT_Q_LABEL}: ${emp.name}`} onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <label htmlFor="rv-score">
          Skor kinerja
          <div className="range-row">
            <input id="rv-range" aria-label="Geser skor" type="range" min={0} max={100} value={score} onChange={(e) => setNum(e.target.value)} />
            <input id="rv-score" className="num" type="number" min={0} max={100} value={score} onChange={(e) => setNum(e.target.value)} />
          </div>
          <span className="small">
            Penilaian: <RatingPill rating={ratingOf(score)} />
          </span>
        </label>
        <label htmlFor="rv-note">
          Catatan
          <textarea id="rv-note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Apa yang sudah baik dan apa yang perlu ditingkatkan" />
        </label>
        {err && <p className="error" role="alert">{err}</p>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>Batal</button>
          <button type="submit" className="btn btn-primary">Simpan review</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Performance() {
  const { employees, perf, isHR, me } = useStore()
  const [q, setQ] = useState('')
  const [dept, setDept] = useState<'' | Dept>('')
  const [sort, setSort] = useState<SortKey>('score')
  const [openId, setOpenId] = useState<string | null>(null)
  const [reviewId, setReviewId] = useState<string | null>(null)

  const rows = useMemo(
    () =>
      employees
        .map((e) => ({ e, p: perf.find((x) => x.empId === e.id)! }))
        .filter((r) => r.p),
    [employees, perf],
  )

  const stats = useMemo(() => {
    const scored = rows.filter((r) => scoreOf(r.p) != null)
    const avg = scored.length ? Math.round((scored.reduce((s, r) => s + (scoreOf(r.p) as number), 0) / scored.length) * 10) / 10 : 0
    const dist = RATINGS.map((rt) => ({ rt, n: scored.filter((r) => ratingOf(scoreOf(r.p)).label === rt.label).length }))
    const reviewed = scored.filter((r) => r.p.reviewed).length
    const quarterAvg: LinePoint[] = QUARTER_LABELS.map((ql, i) => {
      const vals = rows.map((r) => r.p.quarters[i]).filter((v): v is number => v != null)
      const v = i <= CURRENT_Q && vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null
      return { label: ql, value: v, tip: { title: `${ql} ${YEAR}`, rows: [{ label: 'Rata-rata skor', value: v == null ? 'Belum ada' : String(v) }, { label: 'Karyawan dinilai', value: String(vals.length) }] } }
    })
    return { scored: scored.length, avg, dist, reviewed, quarterAvg, attention: dist[3].n }
  }, [rows])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows
      .filter((r) => (!dept || r.e.dept === dept) && (!s || `${r.e.name} ${r.e.role}`.toLowerCase().includes(s)))
      .sort((a, b) => {
        if (sort === 'name') return a.e.name.localeCompare(b.e.name, 'id')
        const av = sort === 'score' ? scoreOf(a.p) : deltaOf(a.p)
        const bv = sort === 'score' ? scoreOf(b.p) : deltaOf(b.p)
        return (bv ?? -999) - (av ?? -999) || a.e.name.localeCompare(b.e.name, 'id')
      })
  }, [rows, q, dept, sort])

  const open = rows.find((r) => r.e.id === openId) ?? null
  const reviewing = rows.find((r) => r.e.id === reviewId) ?? null
  const maxDist = Math.max(1, ...stats.dist.map((d) => d.n))

  /* ---------- Tampilan karyawan: kinerja sendiri ---------- */
  if (!isHR) {
    const mine = rows.find((r) => r.e.id === me.id)
    return (
      <>
        <header className="page-head">
          <div>
            <h1>Kinerja saya</h1>
            <p className="muted">Ringkasan penilaian {CURRENT_Q_LABEL} dan progres target kamu.</p>
          </div>
        </header>
        <section className="card perf-own">{mine ? <PerfDetail emp={me} perf={mine.p} /> : <p className="empty">Belum ada data penilaian.</p>}</section>
      </>
    )
  }

  const SORTS: { id: SortKey; label: string }[] = [
    { id: 'score', label: 'Skor tertinggi' },
    { id: 'delta', label: 'Kenaikan terbesar' },
    { id: 'name', label: 'Nama' },
  ]

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Kinerja karyawan</h1>
          <p className="muted">Penilaian {CURRENT_Q_LABEL} untuk {employees.length} karyawan</p>
        </div>
      </header>

      <section className="tiles" aria-label="Ringkasan kinerja">
        <div className="tile">
          <span className="tile-label">Rata-rata skor</span>
          <strong className="tile-value">{stats.avg}</strong>
          <span className="tile-sub">{stats.scored} karyawan sudah punya skor</span>
        </div>
        <div className="tile">
          <span className="tile-label">Sangat baik</span>
          <strong className="tile-value">{stats.dist[0].n}</strong>
          <span className="tile-sub">Skor 85 ke atas</span>
        </div>
        <div className="tile tile-warn">
          <span className="tile-label">Perlu perhatian</span>
          <strong className="tile-value">{stats.attention}</strong>
          <span className="tile-sub">Skor di bawah 60</span>
        </div>
        <div className="tile">
          <span className="tile-label">Review selesai</span>
          <strong className="tile-value">
            {stats.reviewed}
            <small>/{stats.scored}</small>
          </strong>
          <span className="tile-sub">Oleh atasan langsung</span>
        </div>
      </section>

      <div className="grid-2 even">
        <section className="card">
          <div className="card-head">
            <h2>Sebaran penilaian</h2>
          </div>
          <ul className="bars dist">
            {stats.dist.map((d) => (
              <li key={d.rt.label}>
                <span>{d.rt.label}</span>
                <div className="bar-track">
                  <div className={`bar-fill k-${d.rt.kind}`} style={{ width: `${(d.n / maxDist) * 100}%` }} />
                </div>
                <b>{d.n}</b>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Rata-rata skor per kuartal</h2>
          </div>
          <LineChart points={stats.quarterAvg} yMin={50} yMax={100} ticks={[50, 75, 100]} height={190} ariaLabel={`Grafik rata-rata skor kinerja per kuartal ${YEAR}`} />
        </section>
      </div>

      <div className="toolbar perf-toolbar">
        <label className="search">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Cari nama atau jabatan" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select aria-label="Filter departemen" value={dept} onChange={(e) => setDept(e.target.value as Dept | '')}>
          <option value="">Semua departemen</option>
          {DEPTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <div className="seg inline" role="group" aria-label="Urutkan">
          {SORTS.map((s) => (
            <button key={s.id} aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Karyawan</th>
                <th>Departemen</th>
                <th>Skor</th>
                <th>Penilaian</th>
                <th>Tren</th>
                <th>Review</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {list.map(({ e, p }) => {
                const sc = scoreOf(p)
                return (
                  <tr key={e.id} tabIndex={0} className="clickable" onClick={() => setOpenId(e.id)} onKeyDown={(ev) => ev.key === 'Enter' && setOpenId(e.id)}>
                    <td>
                      <div className="who">
                        <Avatar name={e.name} />
                        <div>
                          <b>{e.name}</b>
                          <span className="muted small">{e.role}</span>
                        </div>
                      </div>
                    </td>
                    <td>{e.dept}</td>
                    <td><ScoreBar score={sc} /></td>
                    <td><RatingPill rating={ratingOf(sc)} /></td>
                    <td><Trend delta={deltaOf(p)} /></td>
                    <td>{sc == null ? <span className="muted small">-</span> : p.reviewed ? <span className="small">Selesai</span> : <span className="small muted">Menunggu</span>}</td>
                    <td>
                      {sc != null && (
                        <button
                          className="btn btn-sm"
                          onClick={(ev) => {
                            ev.stopPropagation()
                            setReviewId(e.id)
                          }}
                        >
                          {p.reviewed ? 'Ubah' : 'Isi review'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">Tidak ada karyawan yang cocok dengan filter ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-foot muted small">
          Menampilkan {list.length} dari {rows.length} karyawan
        </div>
      </div>

      {open && (
        <Drawer title={open.e.name} onClose={() => setOpenId(null)}>
          <p className="muted small drawer-sub">
            {open.e.role} · {open.e.dept} · atasan: {open.p.reviewer}
          </p>
          <PerfDetail emp={open.e} perf={open.p} />
        </Drawer>
      )}
      {reviewing && <ReviewModal emp={reviewing.e} perf={reviewing.p} onClose={() => setReviewId(null)} />}
    </>
  )
}
