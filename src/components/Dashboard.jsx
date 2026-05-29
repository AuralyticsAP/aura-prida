import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, PieChart, Pie, Cell, Label,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useCountUp } from '../hooks/useCountUp'

const GOLD      = '#c8a84b'
const GOLD_DIM  = 'rgba(200,168,75,0.18)'
const BLUE_BAR  = '#4a90d9'
const GREEN_VAL = '#34d399'
const TEXT_S    = 'rgba(200,215,245,0.55)'
const GRID_C    = 'rgba(255,255,255,0.06)'
const CARD_BG   = '#0d1b2e'
const TOOLTIP_BG = 'rgba(8,16,36,0.97)'

const PIE_COLORS = [
  '#c8a84b', '#4a90d9', '#34d399', '#f87171',
  '#a78bfa', '#fb923c', '#38bdf8', '#f472b6',
]

// Mon-Sun order for the bar chart (Latin America standard)
const DIAS_SEMANA = [
  { key: 1, label: 'Lun' },
  { key: 2, label: 'Mar' },
  { key: 3, label: 'Mié' },
  { key: 4, label: 'Jue' },
  { key: 5, label: 'Vie' },
  { key: 6, label: 'Sáb' },
  { key: 0, label: 'Dom' },
]

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_WEEKLY = [
  { semana: '5 may',  ingresos: 620000 },
  { semana: '12 may', ingresos: 810000 },
  { semana: '19 may', ingresos: 740000 },
  { semana: '26 may', ingresos: 680000 },
]

const DEMO_DAYS = [
  { dia: 'Lun', ventas: 520000 },
  { dia: 'Mar', ventas: 310000 },
  { dia: 'Mié', ventas: 485000 },
  { dia: 'Jue', ventas: 275000 },
  { dia: 'Vie', ventas: 350000 },
  { dia: 'Sáb', ventas: 210000 },
  { dia: 'Dom', ventas: 95000  },
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

const DEMO_PERFILES = [
  {
    cliente: 'Walmart',
    favorito: 'Lechuga',
    totalKg: 800,
    totalIngresos: 1240000,
    ultimaCompra: '2026-05-22',
    productos: [
      { nombre: 'Lechuga',   kg: 450, ingresos: 630000 },
      { nombre: 'Tomate',    kg: 200, ingresos: 380000 },
      { nombre: 'Zanahoria', kg: 150, ingresos: 230000 },
    ],
  },
  {
    cliente: 'Automercado',
    favorito: 'Tomate',
    totalKg: 400,
    totalIngresos: 820000,
    ultimaCompra: '2026-05-24',
    productos: [
      { nombre: 'Tomate',   kg: 300, ingresos: 570000 },
      { nombre: 'Zucchini', kg: 100, ingresos: 250000 },
    ],
  },
  {
    cliente: 'Frumusa',
    favorito: 'Lechuga',
    totalKg: 280,
    totalIngresos: 420000,
    ultimaCompra: '2026-05-20',
    productos: [
      { nombre: 'Lechuga', kg: 200, ingresos: 280000 },
      { nombre: 'Apio',    kg: 80,  ingresos: 140000 },
    ],
  },
  {
    cliente: 'Mega Súper',
    favorito: 'Zanahoria',
    totalKg: 220,
    totalIngresos: 310000,
    ultimaCompra: '2026-05-18',
    productos: [
      { nombre: 'Zanahoria', kg: 220, ingresos: 310000 },
    ],
  },
]

const DEMO_STAR   = { producto: 'Tomate', vendido: 460, ingresos: 920000, pct: 34 }
const DEMO_KPI    = { cosechas: 158, ventas: 94, ingresos: 2850000 }
const DEMO_LOSSES = [{ producto: 'Zucchini', cosechado: 320, vendido: 160, mermaKg: 85, sinDestino: 75, pct: 23 }]
const DEMO_MERMAS_SUMMARY = [
  { producto: 'Zucchini', cantidad: 85 },
  { producto: 'Tomate',   cantidad: 30 },
]

const DEMO_RENT = [
  {
    producto: 'Zanahoria',
    costoPropio: 800,
    costoProveedor: 500,
    mejorProveedor: 'Dist. Agro Sur',
    precioVenta: 1100,
    gananciaPropia: 300,
    gananciaCompra: 600,
    recomendacion: 'comprar',
  },
  {
    producto: 'Lechuga',
    costoPropio: 300,
    costoProveedor: 450,
    mejorProveedor: 'Semillas CR',
    precioVenta: 900,
    gananciaPropia: 600,
    gananciaCompra: 450,
    recomendacion: 'sembrar',
  },
  {
    producto: 'Tomate',
    costoPropio: 600,
    costoProveedor: 580,
    mejorProveedor: 'Agro Tico',
    precioVenta: 1250,
    gananciaPropia: 650,
    gananciaCompra: 670,
    recomendacion: 'indiferente',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
// Use LOCAL date to avoid UTC offset shifting the day in Costa Rica (UTC-6)
function isoDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtFechaCorta(fechaStr) {
  if (!fechaStr) return '—'
  return new Date(fechaStr.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CR', {
    day: 'numeric', month: 'short',
  })
}

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

function buildDayOfWeekData(ventas) {
  // totals indexed 0 (Dom) to 6 (Sáb)
  const totals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  ventas.forEach(r => {
    // .slice(0,10) handles both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss+00:00" formats
    const fechaStr = (r.fecha || '').slice(0, 10)
    if (fechaStr.length < 10) return
    const day = new Date(fechaStr + 'T12:00:00').getDay()
    totals[day] += parseFloat(r.total || 0)
  })
  return DIAS_SEMANA.map(({ key, label }) => ({ dia: label, ventas: Math.round(totals[key]) }))
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

function buildStarProduct(ventas) {
  const map = {}
  ventas.forEach(r => {
    if (!map[r.producto]) map[r.producto] = { vendido: 0, ingresos: 0 }
    map[r.producto].vendido  += parseFloat(r.cantidad || 0)
    map[r.producto].ingresos += parseFloat(r.total    || 0)
  })
  const totalKg = Object.values(map).reduce((s, v) => s + v.vendido, 0)
  const sorted  = Object.entries(map).sort((a, b) => b[1].vendido - a[1].vendido)
  if (!sorted.length) return null
  const [name, data] = sorted[0]
  return {
    producto: name,
    vendido:  Math.round(data.vendido),
    ingresos: Math.round(data.ingresos),
    pct: totalKg > 0 ? Math.round((data.vendido / totalKg) * 100) : 0,
  }
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

function buildClientePerfiles(ventas) {
  const map = {}
  ventas.forEach(v => {
    const c = v.nombre_cliente || 'Sin cliente'
    if (!map[c]) map[c] = { cliente: c, productos: {}, totalIngresos: 0, ultimaCompra: '' }
    const prod = v.producto
    if (!map[c].productos[prod]) map[c].productos[prod] = { kg: 0, ingresos: 0 }
    map[c].productos[prod].kg       += parseFloat(v.cantidad || 0)
    map[c].productos[prod].ingresos += parseFloat(v.total    || 0)
    map[c].totalIngresos            += parseFloat(v.total    || 0)
    const fecha = (v.fecha || '').slice(0, 10)
    if (fecha > map[c].ultimaCompra) map[c].ultimaCompra = fecha
  })
  return Object.values(map)
    .map(c => {
      const prods = Object.entries(c.productos)
        .map(([nombre, d]) => ({ nombre, kg: Math.round(d.kg * 10) / 10, ingresos: Math.round(d.ingresos) }))
        .sort((a, b) => b.kg - a.kg)
      const favorito = prods[0]?.nombre || '—'
      const totalKg  = Math.round(prods.reduce((s, p) => s + p.kg, 0) * 10) / 10
      return { cliente: c.cliente, productos: prods, favorito, totalKg, totalIngresos: Math.round(c.totalIngresos), ultimaCompra: c.ultimaCompra }
    })
    .sort((a, b) => b.totalIngresos - a.totalIngresos)
}

function buildMermasSummary(mermas) {
  const map = {}
  mermas.forEach(r => {
    map[r.producto] = (map[r.producto] || 0) + parseFloat(r.cantidad || 0)
  })
  return Object.entries(map)
    .map(([producto, cantidad]) => ({ producto, cantidad: Math.round(cantidad * 10) / 10 }))
    .sort((a, b) => b.cantidad - a.cantidad)
}

function buildLossAlerts(cosechas, ventas, mermas = []) {
  const cos = {}, ven = {}, mer = {}
  cosechas.forEach(r => { cos[r.producto] = (cos[r.producto] || 0) + parseFloat(r.cantidad || 0) })
  ventas.forEach(r   => { ven[r.producto] = (ven[r.producto] || 0) + parseFloat(r.cantidad || 0) })
  mermas.forEach(r   => { mer[r.producto] = (mer[r.producto] || 0) + parseFloat(r.cantidad || 0) })
  return Object.entries(cos)
    .filter(([p, c]) => {
      const sinDestino = c - (ven[p] || 0) - (mer[p] || 0)
      return c > 10 && sinDestino > 0 && (sinDestino / c) > 0.20
    })
    .map(([producto, cosechado]) => {
      const vendido    = Math.round(ven[producto] || 0)
      const mermaKg    = Math.round(mer[producto] || 0)
      const sinDestino = Math.round(cosechado - vendido - mermaKg)
      const pct        = Math.round((sinDestino / cosechado) * 100)
      return { producto, cosechado: Math.round(cosechado), vendido, mermaKg, sinDestino, pct }
    })
    .sort((a, b) => b.sinDestino - a.sinDestino)
}

function buildRentabilidad(prodsCost, ppData, provMap, ventas) {
  // Mapa de mejor precio de proveedor por nombre de producto (case-insensitive)
  const bestProv = {}
  ppData.forEach(item => {
    const provNombre = provMap[item.proveedor_id]
    if (!provNombre) return
    const key = item.nombre.toLowerCase().trim()
    if (!bestProv[key] || parseFloat(item.precio) < bestProv[key].precio) {
      bestProv[key] = { precio: parseFloat(item.precio), proveedor: provNombre }
    }
  })

  // Mapa de precio de venta promedio por producto
  const ventaMap = {}
  ventas.forEach(v => {
    const key = v.producto.toLowerCase().trim()
    if (!ventaMap[key]) ventaMap[key] = { sum: 0, count: 0 }
    ventaMap[key].sum   += parseFloat(v.precio_unitario || 0)
    ventaMap[key].count += 1
  })

  return prodsCost
    .filter(p => p.costo_produccion != null)
    .map(prod => {
      const key         = prod.nombre.toLowerCase().trim()
      const ventaEntry  = ventaMap[key]
      const precioVenta = ventaEntry && ventaEntry.count > 0
        ? ventaEntry.sum / ventaEntry.count
        : null

      const costoPropio     = parseFloat(prod.costo_produccion)
      const provEntry       = bestProv[key] || null
      const costoProveedor  = provEntry ? provEntry.precio : null
      const mejorProveedor  = provEntry ? provEntry.proveedor : null

      const gananciaPropia = precioVenta != null ? precioVenta - costoPropio : null
      const gananciaCompra = precioVenta != null && costoProveedor != null
        ? precioVenta - costoProveedor
        : null

      let recomendacion = 'sembrar'
      if (gananciaPropia != null && gananciaCompra != null) {
        const diff      = gananciaCompra - gananciaPropia
        const threshold = Math.max(Math.abs(gananciaPropia) * 0.10, 50)
        if      (diff >  threshold) recomendacion = 'comprar'
        else if (diff < -threshold) recomendacion = 'sembrar'
        else                        recomendacion = 'indiferente'
      } else if (gananciaPropia == null && gananciaCompra != null) {
        recomendacion = 'comprar'
      }

      return {
        producto: prod.nombre,
        costoPropio,
        costoProveedor,
        mejorProveedor,
        precioVenta:    precioVenta    != null ? Math.round(precioVenta)    : null,
        gananciaPropia: gananciaPropia != null ? Math.round(gananciaPropia) : null,
        gananciaCompra: gananciaCompra != null ? Math.round(gananciaCompra) : null,
        recomendacion,
      }
    })
    .filter(r => r.gananciaPropia != null || r.gananciaCompra != null)
    .sort((a, b) => {
      const order = { comprar: 0, indiferente: 1, sembrar: 2 }
      return order[a.recomendacion] - order[b.recomendacion]
    })
}

// ── Tooltips ──────────────────────────────────────────────────────────────────
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

function DayTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="db-tooltip">
      <p className="db-tooltip-label">{label}</p>
      <p className="db-tooltip-row" style={{ color: GOLD }}>
        <span className="db-tooltip-name">Ventas</span>
        <span className="db-tooltip-val">₡{Math.round(payload[0].value).toLocaleString('es-CR')}</span>
      </p>
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, isCurrency = false, accent = GOLD }) {
  const displayed = useCountUp(value)
  return (
    <div className="db-kpi-card">
      <div className="db-kpi-top">
        <span className="db-kpi-icon">{icon}</span>
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

// ── Producto estrella ─────────────────────────────────────────────────────────
function StarProductCard({ star }) {
  const displayed = useCountUp(star.vendido)
  return (
    <div className="db-chart-card db-star-card">
      <div className="db-chart-header">
        <h3 className="db-chart-title">Producto estrella</h3>
        <span className="db-chart-sub">Más vendido del mes</span>
      </div>
      <div className="db-star-body">
        <div className="db-star-trophy">⭐</div>
        <div className="db-star-name">{star.producto}</div>
        <div className="db-star-kg">
          <span className="db-star-kg-num">{Math.round(displayed).toLocaleString('es-CR')}</span>
          <span className="db-star-kg-unit"> kg vendidos</span>
        </div>
        <div className="db-star-track-wrap">
          <div className="db-star-track">
            <div className="db-star-fill" style={{ width: `${Math.min(star.pct, 100)}%` }} />
          </div>
          <span className="db-star-pct">{star.pct}% del total</span>
        </div>
        {star.ingresos > 0 && (
          <div className="db-star-ingresos">
            ₡{Math.round(star.ingresos).toLocaleString('es-CR')} generados
          </div>
        )}
      </div>
    </div>
  )
}

// ── Rentabilidad section ──────────────────────────────────────────────────────
const RENT_LABEL = {
  sembrar:      { text: '🌱 Conviene sembrar',           cls: 'rent-sembrar'      },
  comprar:      { text: '🛒 Conviene comprar',           cls: 'rent-comprar'      },
  indiferente:  { text: '⚖️ Indiferente',               cls: 'rent-indiferente'  },
}

function fmt(n) {
  if (n == null) return '—'
  return `₡${Math.round(n).toLocaleString('es-CR')}`
}

function RentabilidadSection({ data }) {
  const comprarAlerts = data.filter(r => r.recomendacion === 'comprar' && r.mejorProveedor)

  return (
    <div className="db-rent-section">
      {/* Header */}
      <div className="db-chart-header" style={{ marginBottom: 0 }}>
        <h3 className="db-chart-title">Análisis de Rentabilidad</h3>
        <span className="db-chart-sub">Producción propia vs compra a proveedores</span>
      </div>

      {/* Alertas doradas: conviene comprar */}
      {comprarAlerts.length > 0 && (
        <div className="db-rent-alerts">
          {comprarAlerts.map((r, i) => (
            <div key={i} className="db-rent-alert-row">
              <span className="db-rent-alert-bulb">💡</span>
              <p className="db-rent-alert-text">
                Considere comprarle <strong>{r.producto}</strong> a{' '}
                <strong>{r.mejorProveedor}</strong> en vez de sembrarlo —{' '}
                ahorra{' '}
                <strong style={{ color: GREEN_VAL }}>
                  ₡{Math.abs((r.gananciaCompra ?? 0) - (r.gananciaPropia ?? 0)).toLocaleString('es-CR')}/kg
                </strong>{' '}
                en ganancia.
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      <div className="db-rent-table-wrap">
        <table className="db-rent-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="num">Costo propio<br/><small>₡/kg</small></th>
              <th className="num">Costo proveedor<br/><small>₡/kg</small></th>
              <th className="num">Precio venta<br/><small>₡/kg prom.</small></th>
              <th className="num">Ganancia propia<br/><small>₡/kg</small></th>
              <th className="num">Ganancia compra<br/><small>₡/kg</small></th>
              <th>Recomendación</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => {
              const rec = RENT_LABEL[r.recomendacion]
              return (
                <tr key={i} className={`rent-row-${r.recomendacion}`}>
                  <td className="db-rent-prod">{r.producto}</td>
                  <td className="num">{fmt(r.costoPropio)}</td>
                  <td className="num">
                    {r.costoProveedor != null
                      ? <>{fmt(r.costoProveedor)}<br/><small className="rent-prov-name">{r.mejorProveedor}</small></>
                      : <span className="rent-nd">Sin datos</span>}
                  </td>
                  <td className="num">{fmt(r.precioVenta)}</td>
                  <td className={`num rent-gan ${r.gananciaPropia != null && r.gananciaPropia < 0 ? 'negative' : ''}`}>
                    {fmt(r.gananciaPropia)}
                  </td>
                  <td className={`num rent-gan ${r.gananciaCompra != null && r.gananciaCompra < 0 ? 'negative' : ''}`}>
                    {fmt(r.gananciaCompra)}
                  </td>
                  <td>
                    <span className={`rent-badge ${rec.cls}`}>{rec.text}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="db-rent-note">
        * Lógica: si la diferencia de ganancia entre opciones es menor al 10%, se considera indiferente.
        Los costos de producción se configuran en la tabla de Productos de Supabase.
      </p>
    </div>
  )
}

// ── Perfil de clientes ────────────────────────────────────────────────────────
function ClientePerfilesSection({ data }) {
  const [expanded, setExpanded] = useState(() => new Set())

  const toggle = nombre => setExpanded(prev => {
    const next = new Set(prev)
    next.has(nombre) ? next.delete(nombre) : next.add(nombre)
    return next
  })

  if (!data.length) {
    return (
      <div className="db-perfiles-section">
        <div className="db-chart-header" style={{ marginBottom: 0 }}>
          <h3 className="db-chart-title">Perfil de Clientes</h3>
          <span className="db-chart-sub">Hábitos de compra · últimos 30 días</span>
        </div>
        <div className="db-perfiles-empty">
          <span>👥</span>
          <p>Sin ventas registradas en el período.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="db-perfiles-section">
      <div className="db-chart-header" style={{ marginBottom: 0 }}>
        <h3 className="db-chart-title">Perfil de Clientes</h3>
        <span className="db-chart-sub">Hábitos de compra · últimos 30 días</span>
      </div>

      <div className="db-perfiles-grid">
        {data.map(c => {
          const isOpen   = expanded.has(c.cliente)
          const initials = c.cliente.slice(0, 2).toUpperCase()
          const maxKg    = c.productos[0]?.kg || 1

          return (
            <div
              key={c.cliente}
              className={`db-perfil-card${isOpen ? ' db-perfil-card--open' : ''}`}
            >
              {/* ── Header clickable ── */}
              <div className="db-perfil-header" onClick={() => toggle(c.cliente)}>
                <div className="db-perfil-avatar">{initials}</div>
                <div className="db-perfil-info">
                  <span className="db-perfil-name">{c.cliente}</span>
                  <div className="db-perfil-chips">
                    <span className="db-perfil-fav">⭐ {c.favorito}</span>
                    <span className="db-perfil-total">₡{c.totalIngresos.toLocaleString('es-CR')}</span>
                  </div>
                </div>
                <div className="db-perfil-right">
                  <span className="db-perfil-fecha">{fmtFechaCorta(c.ultimaCompra)}</span>
                  <span className="db-perfil-chevron">{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* ── Expanded body ── */}
              {isOpen && (
                <div className="db-perfil-body">
                  <p className="db-perfil-body-title">Productos comprados</p>
                  {c.productos.map((p, i) => (
                    <div key={i} className="db-perfil-prod-row">
                      <span className="db-perfil-prod-name">{p.nombre}</span>
                      <div className="db-perfil-prod-track">
                        <div
                          className="db-perfil-prod-bar"
                          style={{ width: `${Math.min(Math.round((p.kg / maxKg) * 100), 100)}%` }}
                        />
                      </div>
                      <span className="db-perfil-prod-kg">{p.kg.toLocaleString('es-CR')} kg</span>
                      <span className="db-perfil-prod-ing">₡{p.ingresos.toLocaleString('es-CR')}</span>
                    </div>
                  ))}
                  <div className="db-perfil-body-footer">
                    <span>Total: <strong>{c.totalKg.toLocaleString('es-CR')} kg</strong></span>
                    <span className="db-perfil-ultima">Última compra: {fmtFechaCorta(c.ultimaCompra)}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [mode, setMode]               = useState('real')
  const [fincaFilter, setFincaFilter] = useState(null) // null = ambas
  const [fincas, setFincas]           = useState([])
  const [loading, setLoading]         = useState(false)
  const [kpi, setKpi]                 = useState({ cosechas: 0, ventas: 0, ingresos: 0 })
  const [weeklyData, setWeeklyData]   = useState([])
  const [dayData, setDayData]         = useState([])
  const [prodData, setProdData]       = useState([])
  const [clientData, setClientData]   = useState([])
  const [starProduct, setStarProduct] = useState(null)
  const [lossAlerts, setLossAlerts]   = useState([])
  const [rentData, setRentData]       = useState([])
  const [perfiles, setPerfiles]       = useState([])
  const [hasData, setHasData]         = useState(false)
  const [mermasSummary, setMermasSummary] = useState([])

  useEffect(() => {
    supabase.from('fincas').select('id,nombre').eq('activo', true).order('id').then(({ data }) => {
      setFincas(data || [])
    })
  }, [])

  const fetchReal = useCallback(async (fincaId = null) => {
    setLoading(true)
    const now      = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const from     = isoDate(firstDay)
    const to       = isoDate(now)
    const thirtyD  = new Date(now)
    thirtyD.setDate(thirtyD.getDate() - 29) // 30-day window inclusive
    const fromW    = isoDate(thirtyD)

    const applyFinca = (q) => fincaId != null ? q.eq('finca_id', fincaId) : q

    const [
      { data: c }, { data: v }, { data: cW }, { data: vW },
      { data: prodsCost }, { data: ppData }, { data: provsActive }, { data: m },
    ] = await Promise.all([
      applyFinca(supabase.from('cosechas').select('cantidad,producto').eq('estado','activo').gte('fecha',from).lte('fecha',to)),
      applyFinca(supabase.from('ventas').select('total,cantidad,producto,nombre_cliente,precio_unitario').eq('estado','activo').gte('fecha',from).lte('fecha',to)),
      applyFinca(supabase.from('cosechas').select('fecha,cantidad,producto').eq('estado','activo').gte('fecha',fromW).lte('fecha',to)),
      applyFinca(supabase.from('ventas').select('fecha,total,cantidad,producto,nombre_cliente').eq('estado','activo').gte('fecha',fromW).lte('fecha',to)),
      supabase.from('productos').select('nombre,costo_produccion').eq('activo',true).not('costo_produccion','is',null),
      supabase.from('proveedor_productos').select('nombre,precio,proveedor_id'),
      supabase.from('proveedores').select('id,nombre').eq('estado','activo'),
      applyFinca(supabase.from('mermas').select('cantidad,producto').eq('estado','activo').gte('fecha',from).lte('fecha',to)),
    ])

    const cosArr = c || [], venArr = v || [], cosW2 = cW || [], venW2 = vW || [], merArr = m || []
    const totalIngresos = venArr.reduce((s, r) => s + parseFloat(r.total || 0), 0)

    // Build proveedor id→nombre map
    const provMap = {}
    ;(provsActive || []).forEach(p => { provMap[p.id] = p.nombre })

    setKpi({ cosechas: cosArr.length, ventas: venArr.length, ingresos: totalIngresos })
    setWeeklyData(buildWeeklyData(venW2))
    setDayData(buildDayOfWeekData(venW2))
    setProdData(buildProductoData(cosW2, venW2))
    setClientData(buildClienteData(venW2))
    setStarProduct(buildStarProduct(venArr))
    setMermasSummary(buildMermasSummary(merArr))
    setLossAlerts(buildLossAlerts(cosArr, venArr, merArr))
    setRentData(buildRentabilidad(prodsCost || [], ppData || [], provMap, venArr))
    setPerfiles(buildClientePerfiles(venW2))
    setHasData(cosArr.length > 0 || venArr.length > 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (mode === 'real') {
      fetchReal(fincaFilter)
    } else {
      setKpi(DEMO_KPI)
      setWeeklyData(DEMO_WEEKLY)
      setDayData(DEMO_DAYS)
      setProdData(DEMO_PRODUCTOS)
      setClientData(DEMO_CLIENTES)
      setStarProduct(DEMO_STAR)
      setMermasSummary(DEMO_MERMAS_SUMMARY)
      setLossAlerts(DEMO_LOSSES)
      setRentData(DEMO_RENT)
      setPerfiles(DEMO_PERFILES)
      setHasData(true)
      setLoading(false)
    }
  }, [mode, fincaFilter, fetchReal])

  const totalClientes = clientData.reduce((s, r) => s + r.total, 0)
  const maxDay = dayData.length ? Math.max(...dayData.map(d => d.ventas)) : 1

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

      {/* ── Filtro finca ── */}
      <div className="db-finca-bar">
        <span className="db-finca-label">🌿 Finca:</span>
        <div className="db-finca-pills">
          <button
            className={`db-finca-pill ${fincaFilter === null ? 'active' : ''}`}
            onClick={() => setFincaFilter(null)}
          >
            Ambas
          </button>
          {fincas.map(f => (
            <button
              key={f.id}
              className={`db-finca-pill ${fincaFilter === f.id ? 'active' : ''}`}
              onClick={() => setFincaFilter(f.id)}
            >
              {f.nombre}
            </button>
          ))}
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
            <KpiCard icon="📈" label="Ingresos totales" value={kpi.ingresos} accent={GREEN_VAL} isCurrency />
          </div>

          {/* ── Mermas registradas (ámbar) ── */}
          {mermasSummary.length > 0 && (
            <div className="db-mermas-banner">
              <div className="db-mermas-banner-head">
                <span className="db-mermas-pulse" />
                <span className="db-mermas-banner-title">⚠️ Mermas registradas este mes</span>
              </div>
              <div className="db-mermas-rows">
                {mermasSummary.map((a, i) => (
                  <div key={i} className="db-mermas-row">
                    <span className="db-mermas-prod">{a.producto}</span>
                    <span className="db-mermas-kg">{a.cantidad.toLocaleString('es-CR')} kg registrados como pérdida</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Alertas de pérdida sin destino (rojo) ── */}
          {lossAlerts.length > 0 && (
            <div className="db-loss-banner">
              <div className="db-loss-banner-head">
                <span className="db-loss-pulse" />
                <span className="db-loss-banner-title">🚨 Inventario sin destino registrado</span>
              </div>
              {lossAlerts.map((a, i) => {
                const soldPct  = a.cosechado > 0 ? Math.round((a.vendido  / a.cosechado) * 100) : 0
                const mermaPct = a.cosechado > 0 ? Math.round((a.mermaKg / a.cosechado) * 100) : 0
                return (
                  <div key={i} className="db-loss-row">
                    <div className="db-loss-main">
                      <span className="db-loss-phrase">
                        Atención: <strong>{a.sinDestino} kg de {a.producto}</strong> sin destino registrado
                      </span>
                      <span className="db-loss-detail">
                        {a.pct}% sin destino — {a.vendido} kg vendidos
                        {a.mermaKg > 0 ? ` · ${a.mermaKg} kg en mermas` : ''} · {a.cosechado} kg cosechados este mes
                      </span>
                    </div>
                    <div className="db-loss-gauge-wrap">
                      <div className="db-loss-gauge-track">
                        <div className="db-loss-gauge-sold"  style={{ width: `${soldPct}%` }} />
                        {a.mermaKg > 0 && (
                          <div className="db-loss-gauge-merma" style={{ width: `${mermaPct}%`, left: `${soldPct}%` }} />
                        )}
                        <div className="db-loss-gauge-lost"  style={{ width: `${a.pct}%`, left: `${soldPct + mermaPct}%` }} />
                      </div>
                      <div className="db-loss-gauge-labels">
                        <span style={{ color: BLUE_BAR }}>✓ {a.vendido} kg vendidos</span>
                        {a.mermaKg > 0 && <span style={{ color: '#fb923c' }}>⚠ {a.mermaKg} kg merma</span>}
                        <span style={{ color: '#f87171' }}>✗ {a.sinDestino} kg sin destino</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

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
                <XAxis dataKey="semana" tick={{ fill: TEXT_S, fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: TEXT_S, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₡${(v/1000).toFixed(0)}k`} width={64} />
                <Tooltip content={<DashTooltip isCurrency />} />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke={GOLD} strokeWidth={3} fill="url(#areaGold)"
                  dot={{ r: 5, fill: GOLD, stroke: CARD_BG, strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: GOLD, stroke: CARD_BG, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Ventas por día | Producto estrella ── */}
          <div className="db-charts-row">
            <div className="db-chart-card">
              <div className="db-chart-header">
                <h3 className="db-chart-title">Ventas por día</h3>
                <span className="db-chart-sub">Por día de la semana (últimos 30 días)</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dayData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barSize={36}>
                  <CartesianGrid stroke={GRID_C} vertical={false} />
                  <XAxis dataKey="dia" tick={{ fill: TEXT_S, fontSize: 13 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: TEXT_S, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₡${(v/1000).toFixed(0)}k`} width={58} />
                  <Tooltip content={<DayTooltip />} />
                  <Bar dataKey="ventas" name="Ventas" radius={[6, 6, 0, 0]}>
                    {dayData.map((d, i) => (
                      <Cell key={i} fill={d.ventas === maxDay ? GOLD : 'rgba(200,168,75,0.35)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {starProduct ? (
              <StarProductCard star={starProduct} />
            ) : (
              <div className="db-chart-card db-star-card">
                <div className="db-chart-header">
                  <h3 className="db-chart-title">Producto estrella</h3>
                  <span className="db-chart-sub">Más vendido del mes</span>
                </div>
                <div className="db-star-body">
                  <p style={{ color: TEXT_S, fontSize: 14 }}>Sin ventas registradas aún.</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Cosechado vs Vendido | Donut clientes ── */}
          <div className="db-charts-row">
            <div className="db-chart-card">
              <div className="db-chart-header">
                <h3 className="db-chart-title">Cosechado vs Vendido</h3>
                <span className="db-chart-sub">Por producto (kg)</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={prodData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barGap={4} barSize={14}>
                  <CartesianGrid stroke={GRID_C} vertical={false} />
                  <XAxis dataKey="producto" tick={{ fill: TEXT_S, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: TEXT_S, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<DashTooltip isCurrency={false} />} />
                  <Legend wrapperStyle={{ paddingTop: 14, fontSize: 13 }} formatter={n => <span style={{ color: TEXT_S }}>{n}</span>} />
                  <Bar dataKey="cosechado" name="Cosechado" fill={GOLD}     radius={[5, 5, 0, 0]} />
                  <Bar dataKey="vendido"   name="Vendido"   fill={BLUE_BAR} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="db-chart-card">
              <div className="db-chart-header">
                <h3 className="db-chart-title">Ventas por cliente</h3>
                <span className="db-chart-sub">Distribución del período</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={clientData} dataKey="total" nameKey="nombre"
                    innerRadius="48%" outerRadius="75%" paddingAngle={3}
                    startAngle={90} endAngle={-270}
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
                    itemStyle={{ color: '#e8edf8' }} labelStyle={{ color: TEXT_S }}
                  />
                </PieChart>
              </ResponsiveContainer>
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
          </div>

          {/* ── Perfil de clientes ── */}
          <div className="db-chart-card db-chart-full">
            <ClientePerfilesSection data={perfiles} />
          </div>

          {/* ── Rentabilidad ── */}
          <div className="db-chart-card db-chart-full">
            {rentData.length > 0 ? (
              <RentabilidadSection data={rentData} />
            ) : (
              <div className="db-rent-section">
                <div className="db-chart-header" style={{ marginBottom: 0 }}>
                  <h3 className="db-chart-title">Análisis de Rentabilidad</h3>
                  <span className="db-chart-sub">Producción propia vs compra a proveedores</span>
                </div>
                <div className="db-rent-empty">
                  <span className="db-rent-empty-icon">⚖️</span>
                  <p className="db-rent-empty-title">Sin datos de costo de producción</p>
                  <p className="db-rent-empty-desc">
                    Para activar este análisis, ingresá el costo de producción (₡/kg)
                    de cada cultivo desde el catálogo de productos.
                  </p>
                  <div className="db-rent-code">
                    🥬 Tab Catálogos → seleccionar producto → ✏️ Editar → Costo de producción
                  </div>
                  <p className="db-rent-empty-hint">
                    Solo los <strong>admins</strong> pueden editar el catálogo.
                    El análisis aparecerá aquí automáticamente en cuanto haya al menos un costo cargado.
                  </p>
                </div>
              </div>
            )}
          </div>

        </>
      )}
    </div>
  )
}
