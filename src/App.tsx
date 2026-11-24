import { useEffect, useRef, useState } from 'react'
import Attendance from './pages/Attendance'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Leave from './pages/Leave'
import Performance from './pages/Performance'
import { StoreProvider, useStore } from './store'
import { Avatar, Icon, useNow } from './ui'
import { timeAgo } from './lib'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'karyawan', label: 'Karyawan', icon: 'users' },
  { id: 'absensi', label: 'Absensi', icon: 'clock' },
  { id: 'cuti', label: 'Cuti & izin', icon: 'calendar' },
  { id: 'kinerja', label: 'Kinerja', icon: 'trend' },
]

const readHash = () => {
  const h = window.location.hash.replace('#', '')
  return NAV.some((n) => n.id === h) ? h : 'dashboard'
}

function Shell() {
  const [page, setPage] = useState(readHash)
  const { role, setRole, me, toast, feed, unread, markRead, live, setLive } = useStore()
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const now = useNow(15000)
  const [dark, setDark] = useState<boolean | null>(null)

  useEffect(() => {
    const on = () => setPage(readHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  useEffect(() => {
    if (dark === null) document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    if (!bellOpen) return
    const onDown = (e: MouseEvent) => bellRef.current && !bellRef.current.contains(e.target as Node) && setBellOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setBellOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [bellOpen])

  const toggleBell = () => {
    if (!bellOpen) markRead()
    setBellOpen(!bellOpen)
  }

  const go = (p: string) => {
    window.location.hash = p
    setPage(p)
    window.scrollTo({ top: 0 })
  }
  const isDark = dark ?? window.matchMedia('(prefers-color-scheme: dark)').matches

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo" aria-hidden="true">N</span>
          <div>
            <b>Nusa HRIS</b>
            <span>PT Nusa Kreasi Digital</span>
          </div>
        </div>
        <nav aria-label="Menu utama">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} className={page === n.id ? 'active' : ''} aria-current={page === n.id ? 'page' : undefined} onClick={(e) => { e.preventDefault(); go(n.id) }}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
        <p className="side-note">Demo portfolio dengan data fiktif. Aktivitas live disimulasikan di browser, dan semua perubahan hanya tersimpan selama halaman terbuka.</p>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="seg" role="group" aria-label="Lihat sebagai">
            <button aria-pressed={role === 'hr'} onClick={() => setRole('hr')}>HR Admin</button>
            <button aria-pressed={role === 'staff'} onClick={() => setRole('staff')}>Karyawan</button>
          </div>
          <button className={`live-pill ${live ? 'on' : ''}`} onClick={() => setLive(!live)} aria-pressed={live} aria-label={live ? 'Jeda pembaruan live' : 'Lanjutkan pembaruan live'}>
            <i />
            {live ? 'Live' : 'Dijeda'}
            <Icon name={live ? 'pause' : 'play'} size={12} />
          </button>
          <div className="bell-wrap" ref={bellRef}>
            <button className="icon-btn" onClick={toggleBell} aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'} aria-expanded={bellOpen}>
              <Icon name="bell" />
              {unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
            </button>
            {bellOpen && (
              <div className="notif-panel" role="dialog" aria-label="Notifikasi">
                <div className="notif-head">
                  <b>Notifikasi</b>
                  <span className="muted small">{live ? 'Live' : 'Dijeda'}</span>
                </div>
                {feed.length === 0 ? (
                  <p className="empty">Belum ada notifikasi.</p>
                ) : (
                  <ul>
                    {feed.slice(0, 8).map((f) => (
                      <li key={f.id}>
                        <span>{f.text}</span>
                        <span className="muted small">{timeAgo(f.ts, now)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <button className="icon-btn" onClick={() => setDark(!isDark)} aria-label={isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}>
            <Icon name={isDark ? 'sun' : 'moon'} />
          </button>
          <div className="me">
            <Avatar name={me.name} size={30} />
            <div>
              <b>{me.name}</b>
              <span>{me.role}</span>
            </div>
          </div>
        </div>
        <main className="content fade-in" key={page}>
          {page === 'dashboard' && <Dashboard go={go} />}
          {page === 'karyawan' && <Employees />}
          {page === 'absensi' && <Attendance />}
          {page === 'cuti' && <Leave />}
          {page === 'kinerja' && <Performance />}
        </main>
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
