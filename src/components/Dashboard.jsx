import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, PieChart, Pie, Cell, Label,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useCountUp } from '../hooks/useCountUp'

const GOLD    = '#c8a84b'
const GOLD_DIM = 'rgba(200,168,75,0.18)'
const BLUE_BAR = '#4a90d9'
const TEXT_S   = 'rgba(200,215,245,0.55)'
const GRID_C   = 'rgba(255,255,255,0.06)'
const CARD_BG  = '#0d1b2e'
const TOOLTIP_BG = 'rgba(8,16,36,0.97)'

const PIE_COLORS = [
  '#c8a84b', '#4a90d9', '#34d399', '#f87171',
  '#a78bfa', '#fb923c', '#38bdf8', '#f472b6',
]

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_WEEKLY = [
  { semana: '5 may',  ingresos: 620000 },
  { semana: '12 may', ingresos: 810000 },
  { semana: '19 may', ingresos: 740000 },
  { semana: '26 may', ingresos: 680000 },
]

const DEMO_PRODUCTOS = [
  { producto: 'Tomate',    cosechado: 480, vendido: 460 },
  { producto: 'Zucchini',  cosechado: 320, vendido: 160 },
  { producto: 'Lechuga',   cosechado: 290, vendido: 275 },
  { producto: 'Zanahoria', cosechado: 210, vendido: 200 },
  { producto: 'Espinaca',  cosechado: 180, vendido: 170 },
  { producto: 'Perejil',   cosechado: 150, vendido: 148 },
  { producto: 'Remolacha', cosechado: 130, vendido: 125 },
]

const DEMO_CLIENTES = [
  { nombre: 'Walmart',        total: 850000 },
  { nombre: 'Automercado',    total: 620000 },
  { nombre: 'Mega Súper',     total: 480000 },
  { nombre: 'BM Súper',       total: 380000 },
  { nombre: 'Perimercados',   total: 280000 },
  { nombre: 'Mercado Cenada', total: 150000 },
  { nombre: 'Frumusa',        total: 55000  },
  { nombre: 'Cruceros',       total: 35000  },
]

const DEMO_KPI = { cosechas: 158, ventas: 94, ingresos: 2850000 }

// ── Helpers ───────────────────────────────────────────────────────────────────
function isoDate(d) { return d.toISOString().split('T')[0] }

function startOfWeek(d) {
  const date = new Date(d)
  date.setDate(date.getDate() - date.getDay())
  date.setHours(0, 0, 0, 0)
  return date
}

function weekLabel(ws) {
  return ws.toLocaleDateString('es-CR', { month: 'short', day: 'numeric' })
}

function buildWeeklyData(ventas) {
  const today = new Date()
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const s = startOfWeek(today)
    s.setDate(s.getDate() - i * 7)
    return new Date(s)
  }).reverse()

  return weeks.map(wStart => {
    const wEnd = new Date(wStart)
    wEnd.setDate(wEnd.getDate() + 6)
    const total = ventas
      .filter(v => v.fecha >= isoDate(wStart) && v.fecha <= isoDate(wEnd))
      .reduce((s, v) => s + parseFloat(v.total || 0), 0)
    return { semana: weekLabel(wStart), ingresos: total }
  })
}

function buildProductoData(cosechas, ventas) {
  const map = {}
  cosechas.forEach(r => {
    if (!map[r.producto]) map[r.producto] = { cosechado: 0, vendido: 0 }
    map[r.producto].cosechado += parseFloat(r.cantidad || 0)
  })
  ventas.forEach(r => {
    if (!map[r.producto]) map[r.producto] = { cosechado: 0, vendido: 0 }
    map[r.producto].vendido += parseFloat(r.cantidad || 0)
  })
  return Object.entries(map)
    .map(([producto, v]) => ({ producto: producto.split(' ')[0], ...v }))
    .sort((a, b) => b.cosechado - a.cosechado)
    .slice(0, 7)
}

function buildClienteData(ventas) {
  const map = {}
  ventas.forEach(r => {
    const name = r.nombre_cliente || 'Otro'
    map[name] = (map[name] || 0) + parseFloat(r.total || 0)
  })
  return Object.entries(map)
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
}

function buildAlerts(cosechas, ventas) {
  const cos = {}, ven = {}
  cosechas.forEach(r => { cos[r.producto] = (cos[r.producto] || 0) + parseFloat(r.cantidad || 0) })
  ventas.forEach(r   => { ven[r.producto] = (ven[r.producto] || 0) + parseFloat(r.cantidad || 0) })
  return Object.entries(cos)
    .filter(([p, c]) => c > (ven[p] || 0) * 1.25 && c > 10)
    .map(([producto, cosechado]) => ({
      producto,
      cosechado: Math.round(cosechado),
      vendido: Math.round(ven[producto] || 0),
    }))
    .sort((a, b) => (b.cosechado - b.vendido) - (a.cosechado - a.vendido))
}

// ── Tooltip personalizado ─────────────────────────────────────────────────────
function DashTooltip({ active, payload, label, isCurrency = false }) {
  if (!active || !payload?.length) return null
  return (
    <div className="db-tooltip">
      <p className="db-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="db-tooltip-row" style={{ color: p.color }}>
          <span className="db-tooltip-name">{p.name}</span>
          <span className="db-tooltip-val">
            {isCurrency
              ? `₡${Math.round(p.value).toLocaleString('es-CR')}`
              : `${Math.round(p.value)} kg`}
          </span>
        </p>
      ))}
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, isCurrency = false, accent = GOLD, trend }) {
  const displayed = useCountUp(value)
  return (
    <div className="db-kpi-card">
      <div className="db-kpi-top">
        <span className="db-kpi-icon">{icon}</span>
        {trend && <span className={`db-kpi-trend ${trend > 0 ? 'up' : 'down'}`}>{trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%</span>}
      </div>
      <div className="db-kpi-value" style={{ color: accent }}>
        {isCurrency
          ? `₡${Math.round(displayed).toLocaleString('es-CR')}`
          : Math.round(displayed).toLocaleString('es-CR')}
      </div>
      <div className="db-kpi-label">{label}</div>
      <div className="db-kpi-bar" style={{ '--accent': accent }} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [mode, setMode]             = useState('real')
  const [loading, setLoading]       = useState(false)
  const [kpi, setKpi]               = useState({ cosechas: 0, ventas: 0, ingresos: 0 })
  const [weeklyData, setWeeklyData] = useState([])
  const [prodData, setProdData]     = useState([])
  const [clientData, setClientData] = useState([])
  const [alerts, setAlerts]         = useState([])
  const [hasData, setHasData]       = useState(false)

  const fetchReal = useCallback(async () => {
    setLoading(true)
    const now      = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const from     = isoDate(firstDay)
    const to       = isoDate(now)
    const fourW    = new Date(now)
    fourW.setDate(fourW.getDate() - 28)
    const fromW    = isoDate(fourW)

    const [{ data: c }, { data: v }, { data: cW }, { data: vW }] = await Promise.all([
      supabase.from('cosechas').select('cantidad,producto').eq('estado','activo').gte('fecha',from).lte('fecha',to),
      supabase.from('ventas').select('total,cantidad,producto,nombre_cliente').eq('estado','activo').gte('fecha',from).lte('fecha',to),
      supabase.from('cosechas').select('fecha,cantidad,producto').eq('estado','activo').gte('fecha',fromW).lte('fecha',to),
      supabase.from('ventas').select('fecha,total,cantidad,producto,nombre_cliente').eq('estado','activo').gte('fecha',fromW).lte('fecha',to),
    ])

    const cosArr = c || [], venArr = v || [], cosW2 = cW || [], venW2 = vW || []
    const totalIngresos = venArr.reduce((s, r) => s + parseFloat(r.total || 0), 0)

    setKpi({ cosechas: cosArr.length, ventas: venArr.length, ingresos: totalIngresos })
    setWeeklyData(buildWeeklyData(venW2))
    setProdData(buildProductoData(cosW2, venW2))
    setClientData(buildClienteData(venW2))
    setAlerts(buildAlerts(cosW2, venW2))
    setHasData(cosArr.length > 0 || venArr.length > 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (mode === 'real') {
      fetchReal()
    } else {
      setKpi(DEMO_KPI)
      setWeeklyData(DEMO_WEEKLY)
      setProdData(DEMO_PRODUCTOS)
      setClientData(DEMO_CLIENTES)
      setAlerts([{ producto: 'Zucchini', cosechado: 320, vendido: 160 }])
      setHasData(true)
      setLoading(false)
    }
  }, [mode, fetchReal])

  const totalClientes = clientData.reduce((s, r) => s + r.total, 0)

  return (
    <div className="db-root">

      {/* ── Header ── */}
      <div className="db-header">
        <div className="db-header-left">
          <p className="db-header-eyebrow">Resumen del mes</p>
          <h2 className="db-header-title">Dashboard</h2>
        </div>
        <div className="db-mode-wrap">
          {mode === 'demo' && <span className="db-badge-demo">DEMO</span>}
          <div className="db-mode-toggle">
            <button className={`db-mode-btn ${mode === 'real' ? 'active' : ''}`} onClick={() => setMode('real')}>
              Datos Reales
            </button>
            <button className={`db-mode-btn ${mode === 'demo' ? 'active' : ''}`} onClick={() => setMode('demo')}>
              Demo
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Cargando dashboard...</div>
      ) : !hasData && mode === 'real' ? (
        <div className="db-empty">
          <div className="db-empty-icon">📊</div>
          <h3>Sin datos todavía</h3>
          <p>Seguí registrando cosechas y ventas para ver el dashboard aquí.</p>
        </div>
      ) : (
        <>
          {/* ── KPIs ── */}
          <div className="db-kpi-grid">
            <KpiCard icon="🌿" label="Cosechas del mes" value={kpi.cosechas} accent={GOLD} />
            <KpiCard icon="💰" label="Ventas del mes"   value={kpi.ventas}   accent={BLUE_BAR} />
            <KpiCard icon="📈" label="Ingresos totales" value={kpi.ingresos} accent="#34d399" isCurrency />
          </div>

          {/* ── Area chart (full width) ── */}
          <div className="db-chart-card db-chart-full">
            <div className="db-chart-header">
              <h3 className="db-chart-title">Ingresos semanales</h3>
              <span className="db-chart-sub">Últimas 4 semanas</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklyData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={GOLD} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID_C} vertical={false} />
                <XAxis
                  dataKey="semana"
                  tick={{ fill: TEXT_S, fontSize: 13, fontWeight: 500 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: TEXT_S, fontSize: 12 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `₡${(v / 1000).toFixed(0)}k`}
                  width={64}
                />
                <Tooltip content={<DashTooltip isCurrency />} />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  name="Ingresos"
                  stroke={GOLD}
                  strokeWidth={3}
                  fill="url(#areaGold)"
                  dot={{ r: 5, fill: GOLD, stroke: CARD_BG, strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: GOLD, stroke: CARD_BG, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Two-column row ── */}
          <div className="db-charts-row">

            {/* Bar chart */}
            <div className="db-chart-card">
              <div className="db-chart-header">
                <h3 className="db-chart-title">Cosechado vs Vendido</h3>
                <span className="db-chart-sub">Por producto (kg)</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={prodData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barGap={4} barSize={14}>
                  <CartesianGrid stroke={GRID_C} vertical={false} />
                  <XAxis
                    dataKey="producto"
                    tick={{ fill: TEXT_S, fontSize: 11 }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: TEXT_S, fontSize: 11 }}
                    axisLine={false} tickLine={false}
                    width={40}
                  />
                  <Tooltip content={<DashTooltip isCurrency={false} />} />
                  <Legend
                    wrapperStyle={{ paddingTop: 14, fontSize: 13 }}
                    formatter={name => <span style={{ color: TEXT_S }}>{name}</span>}
                  />
                  <Bar dataKey="cosechado" name="Cosechado" fill={GOLD}     radius={[5, 5, 0, 0]} />
                  <Bar dataKey="vendido"   name="Vendido"   fill={BLUE_BAR} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Donut chart */}
            <div className="db-chart-card">
              <div className="db-chart-header">
                <h3 className="db-chart-title">Ventas por cliente</h3>
                <span className="db-chart-sub">Distribución del período</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={clientData}
                    dataKey="total"
                    nameKey="nombre"
                    innerRadius="48%"
                    outerRadius="75%"
                    paddingAngle={3}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {clientData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                    <Label
                      content={({ viewBox: { cx, cy } }) => (
                        <g>
                          <text x={cx} y={cy - 9} textAnchor="middle" fill={GOLD} fontSize={16} fontWeight={800}>
                            ₡{totalClientes >= 1e6
                              ? `${(totalClientes / 1e6).toFixed(1)}M`
                              : `${(totalClientes / 1000).toFixed(0)}k`}
                          </text>
                          <text x={cx} y={cy + 11} textAnchor="middle" fill={TEXT_S} fontSize={11}>
                            total ventas
                          </text>
                        </g>
                      )}
                    />
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`₡${Math.round(val).toLocaleString('es-CR')}`, name]}
                    contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GOLD_DIM}`, borderRadius: 10, fontSize: 13 }}
                    itemStyle={{ color: '#e8edf8' }}
                    labelStyle={{ color: TEXT_S }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Leyenda compacta */}
              <div className="db-pie-legend">
                {clientData.map((d, i) => {
                  const pct = totalClientes > 0 ? Math.round((d.total / totalClientes) * 100) : 0
                  return (
                    <div key={i} className="db-pie-row">
                      <span className="db-pie-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="db-pie-name">{d.nombre}</span>
                      <span className="db-pie-pct">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>{/* end .db-charts-row */}

          {/* ── Alerts (full width) ── */}
          {alerts.length > 0 && (
            <div className="db-alerts-card">
              <div className="db-alerts-head">
                <span className="db-alerts-icon">⚠️</span>
                <div>
                  <h3 className="db-alerts-title">Alertas de inventario</h3>
                  <p className="db-alerts-sub">Productos con exceso de cosecha frente a ventas</p>
                </div>
              </div>
              <div className="db-alerts-list">
                {alerts.map((a, i) => {
                  const surplus = a.cosechado - a.vendido
                  const pct = a.vendido > 0 ? Math.round((surplus / a.vendido) * 100) : 100
                  return (
                    <div key={i} className="db-alert-row">
                      <div className="db-alert-left">
                        <span className="db-alert-product">{a.producto}</span>
                        <span className="db-alert-desc">
                          {surplus} kg sin vender ({pct}% de exceso)
                        </span>
                      </div>
                      <div className="db-alert-bars">
                        <div className="db-alert-bar-wrap">
                          <span className="db-alert-bar-label">Cosechado</span>
                          <div className="db-alert-bar-track">
                            <div className="db-alert-bar-fill gold" style={{ width: '100%' }} />
                          </div>
                          <span className="db-alert-bar-val">{a.cosechado} kg</span>
                        </div>
                        <div className="db-alert-bar-wrap">
                          <span className="db-alert-bar-label">Vendido</span>
                          <div className="db-alert-bar-track">
                            <div
                              className="db-alert-bar-fill blue"
                              style={{ width: `${a.cosechado > 0 ? Math.round((a.vendido / a.cosechado) * 100) : 0}%` }}
                            />
                          </div>
                          <span className="db-alert-bar-val">{a.vendido} kg</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </>
      )}
    </div>
  )
}
