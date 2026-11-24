import { useState } from 'react'

export interface TipRow {
  color?: string
  label: string
  value: string
}
export interface Tip {
  title: string
  rows: TipRow[]
  foot?: string
}

function TipBox({ tip, leftPct }: { tip: Tip; leftPct: number }) {
  const shift = leftPct > 72 ? '-100%' : leftPct < 28 ? '0%' : '-50%'
  return (
    <div className="tip" style={{ left: `${leftPct}%`, transform: `translateX(${shift})` }}>
      <b>{tip.title}</b>
      {tip.rows.map((r) => (
        <span className="tip-row" key={r.label}>
          {r.color && <i style={{ background: r.color }} />}
          <span>{r.label}</span>
          <em>{r.value}</em>
        </span>
      ))}
      {tip.foot && <span className="tip-foot">{tip.foot}</span>}
    </div>
  )
}

/* ---------- Batang bertumpuk ---------- */

export interface BarSeg {
  key: string
  label: string
  color: string
}
export interface BarDatum {
  id: string
  label: string
  values: Record<string, number>
  tip: Tip
}

export function StackedBars({ data, segs, max, ariaLabel }: { data: BarDatum[]; segs: BarSeg[]; max: number; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640
  const H = 240
  const m = { l: 32, r: 8, t: 10, b: 28 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const step = iw / data.length
  const bw = Math.min(step * 0.64, 28)
  const y = (v: number) => m.t + ih - (v / max) * ih
  const every = Math.ceil(data.length / 10)

  return (
    <div className="chart-wrap" onMouseLeave={() => setHover(null)}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
        {[0, max / 2, max].map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end" className="axis">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {data.map((p, i) => {
          const x = m.l + i * step + (step - bw) / 2
          const last = i === data.length - 1
          let acc = 0
          return (
            <g key={p.id}>
              {hover === i && <rect className="hover-band" x={m.l + i * step} y={m.t} width={step} height={ih} />}
              {segs.map((s) => {
                const v = p.values[s.key] ?? 0
                if (!v) return null
                const top = y(acc + v)
                const h = y(acc) - top
                acc += v
                return <rect key={s.key} x={x} y={top} width={bw} height={Math.max(h - 1, 0)} rx="2" style={{ fill: s.color }} />
              })}
              {(data.length - 1 - i) % every === 0 && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" className={`axis ${last ? 'axis-strong' : ''}`}>
                  {p.label}
                </text>
              )}
              <rect className="hit" x={m.l + i * step} y={0} width={step} height={H} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
            </g>
          )
        })}
      </svg>
      {hover !== null && <TipBox tip={data[hover].tip} leftPct={((m.l + (hover + 0.5) * step) / W) * 100} />}
    </div>
  )
}

/* ---------- Garis ---------- */

export interface LinePoint {
  label: string
  value: number | null
  tip: Tip
}

export function LineChart({
  points,
  yMin,
  yMax,
  ticks,
  suffix = '',
  avg,
  ariaLabel,
  height = 220,
}: {
  points: LinePoint[]
  yMin: number
  yMax: number
  ticks: number[]
  suffix?: string
  avg?: { value: number; label: string }
  ariaLabel: string
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640
  const H = height
  const m = { l: 40, r: 16, t: 22, b: 28 }
  const iw = W - m.l - m.r
  const ih = H - m.t - m.b
  const step = iw / points.length
  const cx = (i: number) => m.l + (i + 0.5) * step
  const y = (v: number) => m.t + ih - ((v - yMin) / (yMax - yMin)) * ih
  const every = Math.ceil(points.length / 8)

  const runs: { x: number; y: number }[][] = []
  let cur: { x: number; y: number }[] = []
  points.forEach((p, i) => {
    if (p.value == null) {
      if (cur.length) runs.push(cur)
      cur = []
    } else cur.push({ x: cx(i), y: y(p.value) })
  })
  if (cur.length) runs.push(cur)
  const line = runs.filter((r) => r.length > 1).map((r) => 'M' + r.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')).join(' ')
  const area = runs
    .filter((r) => r.length > 1)
    .map((r) => `M${r[0].x.toFixed(1)} ${m.t + ih} L` + r.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L') + ` L${r[r.length - 1].x.toFixed(1)} ${m.t + ih} Z`)
    .join(' ')
  let lastIdx = -1
  points.forEach((p, i) => p.value != null && (lastIdx = i))
  const showDots = points.length <= 14

  return (
    <div className="chart-wrap" onMouseLeave={() => setHover(null)}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end" className="axis">
              {t}
              {suffix}
            </text>
          </g>
        ))}
        {avg && (
          <g>
            <line x1={m.l} x2={W - m.r} y1={y(avg.value)} y2={y(avg.value)} className="avg-line" />
            <text x={W - m.r} y={y(avg.value) - 5} textAnchor="end" className="axis">
              {avg.label}
            </text>
          </g>
        )}
        {area && <path d={area} className="area" />}
        {line && <path d={line} className="line" />}
        {hover !== null && <line className="guide" x1={cx(hover)} x2={cx(hover)} y1={m.t} y2={m.t + ih} />}
        {points.map((p, i) => {
          if (p.value == null) return null
          const isLast = i === lastIdx
          const on = hover === i
          if (!showDots && !isLast && !on) return null
          return (
            <g key={i}>
              {(isLast || on) && <circle cx={cx(i)} cy={y(p.value)} r="9" className="halo" />}
              <circle cx={cx(i)} cy={y(p.value)} r={isLast || on ? 4.5 : 3} className="dot-pt" />
            </g>
          )
        })}
        {lastIdx >= 0 && (
          <text x={cx(lastIdx)} y={y(points[lastIdx].value as number) - 12} textAnchor="middle" className="axis axis-strong">
            {points[lastIdx].value}
            {suffix}
          </text>
        )}
        {points.map((p, i) =>
          (points.length - 1 - i) % every === 0 ? (
            <text key={`l${i}`} x={cx(i)} y={H - 8} textAnchor="middle" className={`axis ${i === points.length - 1 ? 'axis-strong' : ''}`}>
              {p.label}
            </text>
          ) : null,
        )}
        {points.map((p, i) => (
          <rect key={`h${i}`} className="hit" x={m.l + i * step} y={0} width={step} height={H} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
        ))}
      </svg>
      {hover !== null && <TipBox tip={points[hover].tip} leftPct={(cx(hover) / W) * 100} />}
    </div>
  )
}

/* ---------- Donat ---------- */

export interface DonutSeg {
  key: string
  label: string
  value: number
  color: string
}

export function Donut({ segs, centerValue, centerLabel, ariaLabel }: { segs: DonutSeg[]; centerValue: string; centerLabel: string; ariaLabel: string }) {
  const [active, setActive] = useState<string | null>(null)
  const R = 70
  const C = 2 * Math.PI * R
  const sum = segs.reduce((s, x) => s + x.value, 0)
  const shown = segs.filter((s) => s.value > 0)
  const act = segs.find((s) => s.key === active)
  let offset = 0

  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox="0 0 200 200" role="img" aria-label={ariaLabel}>
        <circle cx="100" cy="100" r={R} className="donut-track" />
        <g transform="rotate(-90 100 100)">
          {shown.map((s) => {
            const len = (s.value / sum) * C
            const el = (
              <circle
                key={s.key}
                cx="100"
                cy="100"
                r={R}
                className="donut-seg"
                style={{ stroke: s.color, opacity: active && active !== s.key ? 0.3 : 1 }}
                strokeDasharray={`${Math.max(len - 2, 0.5)} ${C}`}
                strokeDashoffset={-offset}
                onMouseEnter={() => setActive(s.key)}
                onMouseLeave={() => setActive(null)}
              />
            )
            offset += len
            return el
          })}
        </g>
        <text x="100" y="100" textAnchor="middle" className="donut-value">
          {act ? act.value : centerValue}
        </text>
        <text x="100" y="122" textAnchor="middle" className="donut-label">
          {act ? act.label : centerLabel}
        </text>
      </svg>
      <ul className="donut-legend">
        {segs.map((s) => (
          <li key={s.key} className={active && active !== s.key ? 'dim' : ''} onMouseEnter={() => setActive(s.key)} onMouseLeave={() => setActive(null)}>
            <i style={{ background: s.color }} />
            <span>{s.label}</span>
            <b className="num">{s.value}</b>
            <span className="muted small num">{sum ? Math.round((s.value / sum) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
