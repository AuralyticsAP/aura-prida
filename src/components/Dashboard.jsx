import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, PieChart, Pie, Cell, Label,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useCountUp } from '../hooks/useCountUp'

const GOLD  = '#C4A012'
const NAVY  = '#1A2D5A'
const GREEN = '#3AAE38'
const TEXT_S = 'rgba(244,246,252,0.55)'
const GRID   = 'rgba(255,255,255,0.07)'

const PIE_COLORS = [GOLD, '#60a5fa', GREEN, '#f87171', '#a78bfa', '#fb923c', '#34d399', '#f472b6']

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_WEEKLY = [
  { semana: 'Sem 1', ingresos: 620000 },
  { semana: 'Sem 2', ingresos: 810000 },
  { semana: 'Sem 3', ingresos: 740000 },
  { semana: 'Sem 4', ingresos: 680000 },
]

const DEMO_PRODUCTOS = [
  { producto: 'Tomate',       cosechado: 480, vendido: 460 },
  { producto: 'Zucchini',     cosechado: 320, vendido: 160 },
  { producto: 'Lechuga',      cosechado: 290, vendido: 275 },
  { producto: 'Zanahoria',    cosechado: 210, vendido: 200 },
  { producto: 'Espinaca',     cosechado: 180, vendido: 170 },
  { producto: 'Perejil',      cosechado: 150, vendido: 148 },
  { producto: 'Remolacha',    cosechado: 130, vendido: 125 },
]

const DEMO_CLIENTES = [
  { nombre: 'Walmart',         total: 850000 },
  { nombre: 'Automercado',     total: 620000 },
  { nombre: 'Mega Súper',      total: 480000 },
  { nombre: 'BM Supermercados',total: 380000 },
  { nombre: 'Perimercados',    total: 280000 },
  { nombre: 'Mercado Cenada',  total: 150000 },
  { nombre: 'Frumusa',         total: 55000  },
  { nombre: 'Cruceros',        total: 35000  },
]

const DEMO_KPI = {
  cosechas: 158,
  ventas: 94,
  ingresos: 2850000,
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function startOfWeek(d) {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

function isoDate(d) {
  return d.toISOString().split('T')[0]
}

function weekLabel(weekStart) {
  return weekStart.toLocaleDateString('es-CR', { month: 'short', day: 'numeric' })
}

function buildWeeklyData(ventas) {
  const today = new Date()
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const start = startOfWeek(today)
    start.setDate(start.getDate() - i * 7)
    return start
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
    .map(([producto, vals]) => ({ producto: producto.split(' ')[0], ...vals }))
    .sort((a, b) => b.cosechado - a.cosechado)
    .slice(0, 8)
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
    .map(([producto, cosechado]) => ({ producto, cosechado: Math.round(cosechado), vendido: Math.round(ven[producto] || 0) }))
    .sort((a, b) => (b.cosechado - b.vendido) - (a.cosechado - a.vendido))
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, prefix = '₡', isCurrency = false }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || GOLD }}>
          {p.name}: {isCurrency ? `₡${Math.round(p.value).toLocaleString('es-CR')}` : `${Math.round(p.value)} kg`}
        </p>
      ))}
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, isCurrency = false }) {
  const displayed = useCountUp(value)
  return (
    <div className="kpi-card">
      <span className="kpi-icon">{icon}</span>
      <div className="kpi-value">
        {isCurrency
          ? `₡${Math.round(displayed).toLocaleString('es-CR')}`
          : Math.round(displayed).toLocaleString('es-CR')}
      </div>
      <div className="kpi-label">{label}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [mode, setMode] = useState('real')
  const [loading, setLoading] = useState(false)

  const [kpi, setKpi]               = useState({ cosechas: 0, ventas: 0, ingresos: 0 })
  const [weeklyData, setWeeklyData] = useState([])
  const [prodData, setProdData]     = useState([])
  const [clientData, setClientData] = useState([])
  const [alerts, setAlerts]         = useState([])
  const [hasData, setHasData]       = useState(false)

  const fetchReal = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const from = isoDate(firstDay)
    const to   = isoDate(now)

    // 4 weeks back for charts
    const fourWeeksAgo = new Date(now)
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
    const fromW = isoDate(fourWeeksAgo)

    const [{ data: c }, { data: v }, { data: cW }, { data: vW }] = await Promise.all([
      supabase.from('cosechas').select('cantidad, producto').eq('estado', 'activo').gte('fecha', from).lte('fecha', to),
      supabase.from('ventas').select('total, cantidad, producto, nombre_cliente').eq('estado', 'activo').gte('fecha', from).lte('fecha', to),
      supabase.from('cosechas').select('fecha, cantidad, producto').eq('estado', 'activo').gte('fecha', fromW).lte('fecha', to),
      supabase.from('ventas').select('fecha, total, cantidad, producto, nombre_cliente').eq('estado', 'activo').gte('fecha', fromW).lte('fecha', to),
    ])

    const cosArr = c || []
    const venArr = v || []
    const cosW   = cW || []
    const venW   = vW || []

    const totalIngresos = venArr.reduce((s, r) => s + parseFloat(r.total || 0), 0)

    setKpi({ cosechas: cosArr.length, ventas: venArr.length, ingresos: totalIngresos })
    setWeeklyData(buildWeeklyData(venW))
    setProdData(buildProductoData(cosW, venW))
    setClientData(buildClienteData(venW))
    setAlerts(buildAlerts(cosW, venW))
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
    <div className="dashboard-section">
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">Dashboard</h2>
          <p className="section-date">
            {mode === 'real' ? 'Este mes · datos reales' : 'Datos de ejemplo'}
          </p>
        </div>
        <div className="mode-toggle-wrap">
          {mode === 'demo' && <span className="badge-demo">DEMO</span>}
          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === 'real' ? 'active' : ''}`}
              onClick={() => setMode('real')}
            >Datos Reales</button>
            <button
              className={`mode-btn ${mode === 'demo' ? 'active' : ''}`}
              onClick={() => setMode('demo')}
            >Demo</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Cargando dashboard...</div>
      ) : !hasData && mode === 'real' ? (
        <div className="card dashboard-empty">
          <span className="dashboard-empty-icon">📊</span>
          <p>Aún no hay suficientes datos.<br />Seguí registrando cosechas y ventas.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="kpi-grid">
            <KpiCard icon="🌿" label="Cosechas del mes" value={kpi.cosechas} />
            <KpiCard icon="💰" label="Ventas del mes"   value={kpi.ventas} />
            <KpiCard icon="📈" label="Ingresos en ₡"   value={kpi.ingresos} isCurrency />
          </div>

          {/* Area chart — ingresos semanales */}
          <div className="card chart-card">
            <h3 className="chart-title">Ingresos por semana</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={GOLD} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="semana" tick={{ fill: TEXT_S, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: TEXT_S, fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `₡${(v / 1000).toFixed(0)}k`}
                  width={58}
                />
                <Tooltip content={<ChartTooltip isCurrency />} />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  name="Ingresos"
                  stroke={GOLD}
                  strokeWidth={2.5}
                  fill="url(#goldGrad)"
                  dot={{ r: 4, fill: GOLD, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart — cosechado vs vendido */}
          <div className="card chart-card">
            <h3 className="chart-title">Cosechado vs Vendido (kg)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={prodData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={3} barSize={12}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="producto" tick={{ fill: TEXT_S, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: TEXT_S, fontSize: 11 }} axisLine={false} tickLine={false} width={42} />
                <Tooltip content={<ChartTooltip isCurrency={false} />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: TEXT_S, paddingTop: 8 }}
                  formatter={val => <span style={{ color: TEXT_S }}>{val}</span>}
                />
                <Bar dataKey="cosechado" name="Cosechado" fill={GOLD}  radius={[4, 4, 0, 0]} />
                <Bar dataKey="vendido"   name="Vendido"   fill={NAVY}  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut — ventas por cliente */}
          <div className="card chart-card">
            <h3 className="chart-title">Ventas por cliente</h3>
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={clientData}
                    dataKey="total"
                    nameKey="nombre"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {clientData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        const { cx, cy } = viewBox
                        return (
                          <g>
                            <text x={cx} y={cy - 8} textAnchor="middle" fill={GOLD} fontSize={15} fontWeight={700}>
                              ₡{(totalClientes / 1000000).toFixed(1)}M
                            </text>
                            <text x={cx} y={cy + 12} textAnchor="middle" fill={TEXT_S} fontSize={11}>
                              total
                            </text>
                          </g>
                        )
                      }}
                    />
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`₡${Math.round(val).toLocaleString('es-CR')}`, name]}
                    contentStyle={{ background: 'rgba(20,30,60,0.95)', border: '1px solid rgba(196,160,18,0.25)', borderRadius: 10, fontSize: 13 }}
                    itemStyle={{ color: '#f4f6fc' }}
                    labelStyle={{ color: TEXT_S }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {clientData.map((d, i) => (
                  <div key={i} className="pie-legend-item">
                    <span className="pie-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="pie-legend-name">{d.nombre}</span>
                    <span className="pie-legend-pct">
                      {totalClientes > 0 ? Math.round((d.total / totalClientes) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="card alerts-card">
              <div className="alerts-header">
                <span className="card-icon">⚠️</span>
                <h3>Alertas de inventario</h3>
              </div>
              <p className="alerts-subtitle">Productos con mucho más cosechado que vendido este mes</p>
              {alerts.map((a, i) => (
                <div key={i} className="alert-item">
                  <span className="alert-producto">{a.producto}</span>
                  <span className="alert-detail">
                    <span style={{ color: GOLD }}>↑ {a.cosechado} kg cosechado</span>
                    {' · '}
                    <span style={{ color: TEXT_S }}>{a.vendido} kg vendido</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
