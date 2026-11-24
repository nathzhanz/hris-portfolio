export const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (s: string, n: number) => {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}
export const isWeekend = (s: string) => {
  const g = parse(s).getDay()
  return g === 0 || g === 6
}
/** Jumlah hari kerja (Senin-Jumat) antara dua tanggal, inklusif. */
export const bizDays = (a: string, b: string) => {
  let n = 0
  for (let c = a; c <= b; c = addDays(c, 1)) if (!isWeekend(c)) n++
  return n
}
export const fmtDate = (s: string, o?: Intl.DateTimeFormatOptions) =>
  parse(s).toLocaleDateString('id-ID', o ?? { day: 'numeric', month: 'short', year: 'numeric' })
export const lastWorkday = (from: string = iso(new Date())) => {
  let c = from
  while (isWeekend(c)) c = addDays(c, -1)
  return c
}
export const nowHM = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
export const hue = (name: string) => {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

/** N hari kerja terakhir sampai `from`, urut dari yang terlama. */
export const lastWorkdays = (n: number, from: string) => {
  const out: string[] = []
  let c = from
  while (out.length < n) {
    if (!isWeekend(c)) out.unshift(c)
    c = addDays(c, -1)
  }
  return out
}

export const timeAgo = (ts: number, now: number = Date.now()) => {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 10) return 'baru saja'
  if (s < 60) return `${s} dtk lalu`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} mnt lalu`
  return `${Math.floor(m / 60)} jam lalu`
}
