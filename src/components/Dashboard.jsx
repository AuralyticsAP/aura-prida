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

const GASTO_COLORS = {
  combustible:   '#f59e0b',
  fertilizantes: '#34d399',
  herramientas:  '#60a5fa',
  salarios:      '#c084fc',
  transporte:    '#fb923c',
  servicios:     '#38bdf8',
  otro:          '#94a3b8',
}

const LABOR_COLORS = {
  cosecha:       '#34d399',
  siembra:       '#c8a84b',
  mantenimiento: '#60a5fa',
  empaque:       '#c084fc',
  otro:          '#94a3b8',
}

const CATEGORIA_LABELS = {
  combustible:   '⛽ Combustible',
  fertilizantes: '🌱 Fertilizantes',
  herramientas:  '🔧 Herramientas',
  salarios:      '👷 Salarios',
  transporte:    '🚚 Transporte',
  servicios:     '💡 Servicios',
  otro:          '📌 Otro',
}

const LABOR_LABELS = {
  cosecha:       '🌿 Cosecha',
  siembra:       '🌱 Siembra',
  mantenimiento: '🔧 Mantenimiento',
  empaque:       '📦 Empaque',
  otro:          '📌 Otro',
}

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

const PERIODOS_DB = [
  { id: 'hoy',        label: 'Hoy' },
  { id: 'semana',     label: 'Esta semana' },
  { id: 'mes',        label: 'Este mes' },
  { id: 'ultimo_mes', label: 'Último mes' },
  { id: 'custom',     label: 'Personalizado' },
]

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_KPI_EXTENDED = {
  cosechas: 158, ventas: 94, ingresos: 2850000,
  gastos: 1470000, gananciaNeta: 1380000, personalPromedio: 7,
}

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
  { producto: 'Lechuga',   cosechado: 480, vendido: 420 },
  { producto: 'Tomate',    cosechado: 380, vendido: 340 },
  { producto: 'Zanahoria', cosechado: 290, vendido: 275 },
  { producto: 'Zucchini',  cosechado: 260, vendido: 185 },
  { producto: 'Apio',      cosechado: 180, vendido: 170 },
  { producto: 'Espinaca',  cosechado: 150, vendido: 145 },
]

const DEMO_CLIENTES = [
  { nombre: 'Walmart',      total: 850000 },
  { nombre: 'Automercado',  total: 620000 },
  { nombre: 'Mega Súper',   total: 480000 },
  { nombre: 'BM Súper',     total: 380000 },
  { nombre: 'Perimercados', total: 280000 },
  { nombre: 'Frumusa',      total: 150000 },
]

const DEMO_STAR   = { producto: 'Lechuga', vendido: 420, ingresos: 756000, pct: 38 }
const DEMO_LOSSES = [{ producto: 'Zucchini', cosechado: 260, vendido: 185, mermaKg: 40, sinDestino: 35, pct: 13 }]
const DEMO_MERMAS_SUMMARY = [
  { producto: 'Lechuga', cantidad: 45 },
  { producto: 'Tomate',  cantidad: 30 },
]
const DEMO_DEVOLUCIONES = { count: 3, perdida: 45000, reingreso: 18000 }
const DEMO_PERDIDAS = {
  totalMermasKg: 75, totalDevPerdida: 45000, pctPerdida: 8, showAlert: false,
  byProducto: [{ producto: 'Lechuga', cantidad: 45 }, { producto: 'Tomate', cantidad: 30 }],
  devByCliente: [{ cliente: 'Walmart', total: 32000 }, { cliente: 'Automercado', total: 13000 }],
  hasMermas: true, hasDev: true,
}

const DEMO_GASTOS_KPI        = { total: 1470000, count: 28 }
const DEMO_GASTOS_CATEGORIA  = [
  { categoria: 'salarios',      monto: 480000 },
  { categoria: 'fertilizantes', monto: 320000 },
  { categoria: 'combustible',   monto: 280000 },
  { categoria: 'transporte',    monto: 200000 },
  { categoria: 'servicios',     monto: 120000 },
  { categoria: 'herramientas',  monto: 70000  },
]
const DEMO_GASTOS_VS_INGRESOS = [
  { finca: 'Dulce Nombre', ingresos: 1800000, gastos: 850000 },
  { finca: 'Taras',        ingresos: 1050000, gastos: 620000 },
]
const DEMO_GASTOS_MENSUAL = [
  { mes: 'feb 26', monto: 380000 },
  { mes: 'mar 26', monto: 420000 },
  { mes: 'abr 26', monto: 395000 },
  { mes: 'may 26', monto: 485000 },
]

const DEMO_COMPRAS = {
  total: 320000, count: 18,
  topProveedor: { nombre: 'Dist. Agro Sur', total: 145000 },
  topProducto:  { nombre: 'Abono foliar',   total: 95000  },
  byFinca: [
    { finca: 'Dulce Nombre', total: 185000 },
    { finca: 'Taras',        total: 135000 },
  ],
}

const DEMO_PERSONAL = {
  totalPersonaDia: 420, promedioDia: 7,
  byLabor: [
    { tipo: 'cosecha',       total: 180 },
    { tipo: 'empaque',       total: 120 },
    { tipo: 'mantenimiento', total: 80  },
    { tipo: 'siembra',       total: 40  },
  ],
  byFinca: [
    { finca: 'Dulce Nombre', total: 240, dias: 30, promedio: 8 },
    { finca: 'Taras',        total: 180, dias: 30, promedio: 6 },
  ],
  topDia: ['2026-05-15', 22],
}

const DEMO_RENT = [
  {
    producto: 'Zanahoria', costoPropio: 800, costoProveedor: 500,
    mejorProveedor: 'Dist. Agro Sur', precioVenta: 1100,
    gananciaPropia: 300, gananciaCompra: 600, recomendacion: 'comprar',
  },
  {
    producto: 'Lechuga', costoPropio: 300, costoProveedor: 450,
    mejorProveedor: 'Semillas CR', precioVenta: 900,
    gananciaPropia: 600, gananciaCompra: 450, recomendacion: 'sembrar',
  },
  {
    producto: 'Tomate', costoPropio: 600, costoProveedor: 580,
    mejorProveedor: 'Agro Tico', precioVenta: 1250,
    gananciaPropia: 650, gananciaCompra: 670, recomendacion: 'indiferente',
  },
]

const DEMO_PERFILES = [
  {
    cliente: 'Walmart', favorito: 'Lechuga', totalKg: 800, totalIngresos: 1240000, ultimaCompra: '2026-05-22',
    productos: [
      { nombre: 'Lechuga',   kg: 450, ingresos: 630000 },
      { nombre: 'Tomate',    kg: 200, ingresos: 380000 },
      { nombre: 'Zanahoria', kg: 150, ingresos: 230000 },
    ],
  },
  {
    cliente: 'Automercado', favorito: 'Tomate', totalKg: 400, totalIngresos: 820000, ultimaCompra: '2026-05-24',
    productos: [
      { nombre: 'Tomate',   kg: 300, ingresos: 570000 },
      { nombre: 'Zucchini', kg: 100, ingresos: 250000 },
    ],
  },
  {
    cliente: 'Frumusa', favorito: 'Lechuga', totalKg: 280, totalIngresos: 420000, ultimaCompra: '2026-05-20',
    productos: [
      { nombre: 'Lechuga', kg: 200, ingresos: 280000 },
      { nombre: 'Apio',    kg: 80,  ingresos: 140000 },
    ],
  },
]

const DEMO_ALERTAS = [
  { tipo: 'warning', icon: '📦', msg: 'Zucchini: 35 kg sin destino registrado (13% de lo cosechado)' },
  { tipo: 'info',    icon: '👥', msg: 'Frumusa no ha comprado en los últimos 14 días' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
// Use LOCAL date to avoid UTC offset shifting the day in Costa Rica (UTC-6)
function isoDate(d) {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
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

function getDBRange(periodo, customDesde, customHasta) {
  const now = new Date()
  const hoy = isoDate(now)
  switch (periodo) {
    case 'hoy': return { from: hoy, to: hoy }
    case 'semana': {
      const s = new Date(now)
      const day = s.getDay()
      s.setDate(s.getDate() + (day === 0 ? -6 : 1 - day))
      return { from: isoDate(s), to: hoy }
    }
    case 'mes':
      return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: hoy }
    case 'ultimo_mes': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const e = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: isoDate(s), to: isoDate(e) }
    }
    case 'custom': return { from: customDesde || hoy, to: customHasta || hoy }
    default: return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: hoy }
  }
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
  const totals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  ventas.forEach(r => {
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

function buildGastosKPI(gastos) {
  const total = gastos.reduce((s, r) => s + parseFloat(r.monto || 0), 0)
  return { total: Math.round(total), count: gastos.length }
}

function buildGastosByCategoria(gastos) {
  const map = {}
  gastos.forEach(r => {
    map[r.categoria] = (map[r.categoria] || 0) + parseFloat(r.monto || 0)
  })
  return Object.entries(map)
    .map(([categoria, monto]) => ({ categoria, monto: Math.round(monto) }))
    .sort((a, b) => b.monto - a.monto)
}

function buildIngresosVsGastos(ventas, gastos) {
  const ingMap = {}, gasMap = {}
  ventas.forEach(r => {
    const nombre = r.fincas?.nombre || 'Sin finca'
    ingMap[nombre] = (ingMap[nombre] || 0) + parseFloat(r.total || 0)
  })
  gastos.forEach(r => {
    const nombre = r.fincas?.nombre || 'Sin finca'
    gasMap[nombre] = (gasMap[nombre] || 0) + parseFloat(r.monto || 0)
  })
  const all = new Set([...Object.keys(ingMap), ...Object.keys(gasMap)])
  return [...all].map(finca => ({
    finca,
    ingresos: Math.round(ingMap[finca] || 0),
    gastos:   Math.round(gasMap[finca] || 0),
  })).sort((a, b) => b.ingresos - a.ingresos)
}

function buildGastosMensuales(gastosHist) {
  const map = {}
  gastosHist.forEach(r => {
    const mes = r.fecha.slice(0, 7)
    map[mes] = (map[mes] || 0) + parseFloat(r.monto || 0)
  })
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, monto]) => {
      const [y, m] = mes.split('-')
      const label = new Date(parseInt(y), parseInt(m) - 1, 1)
        .toLocaleDateString('es-CR', { month: 'short', year: '2-digit' })
      return { mes: label, monto: Math.round(monto) }
    })
}

function buildDevolucionesSummary(devoluciones) {
  return devoluciones.reduce((acc, r) => {
    acc.count++
    const total = parseFloat(r.total || 0)
    if (r.puede_revenderse) acc.reingreso += total
    else acc.perdida += total
    return acc
  }, { count: 0, perdida: 0, reingreso: 0 })
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
  const bestProv = {}
  ppData.forEach(item => {
    const provNombre = provMap[item.proveedor_id]
    if (!provNombre) return
    const key = item.nombre.toLowerCase().trim()
    if (!bestProv[key] || parseFloat(item.precio) < bestProv[key].precio) {
      bestProv[key] = { precio: parseFloat(item.precio), proveedor: provNombre }
    }
  })

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

// ── NEW build functions ───────────────────────────────────────────────────────
function buildPerdidasCombinadas(cosechas, mermas, devoluciones) {
  const totalMermasKg = mermas.reduce((s, r) => s + parseFloat(r.cantidad || 0), 0)
  const byProducto = {}
  mermas.forEach(r => { byProducto[r.producto] = (byProducto[r.producto] || 0) + parseFloat(r.cantidad || 0) })
  const byProductoArr = Object.entries(byProducto)
    .map(([producto, cantidad]) => ({ producto, cantidad: Math.round(cantidad * 10) / 10 }))
    .sort((a, b) => b.cantidad - a.cantidad)
  const devPerdida = devoluciones.filter(r => !r.puede_revenderse)
  const totalDevPerdida = devPerdida.reduce((s, r) => s + parseFloat(r.total || 0), 0)
  const clienteMap = {}
  devPerdida.forEach(r => { clienteMap[r.cliente] = (clienteMap[r.cliente] || 0) + parseFloat(r.total || 0) })
  const devByCliente = Object.entries(clienteMap)
    .map(([cliente, total]) => ({ cliente, total: Math.round(total) }))
    .sort((a, b) => b.total - a.total)
  const totalProduccion = cosechas.reduce((s, r) => s + parseFloat(r.cantidad || 0), 0)
  const pctPerdida = totalProduccion > 0 ? Math.round((totalMermasKg / totalProduccion) * 100) : 0
  return {
    totalMermasKg:  Math.round(totalMermasKg * 10) / 10,
    totalDevPerdida: Math.round(totalDevPerdida),
    pctPerdida,
    showAlert: pctPerdida > 10,
    byProducto: byProductoArr,
    devByCliente,
    hasMermas: mermas.length > 0,
    hasDev: devPerdida.length > 0,
  }
}

function buildComprasSummary(compras) {
  const total = compras.reduce((s, r) => s + parseFloat(r.total || 0), 0)
  const provMap = {}, prodMap = {}, fincaMap = {}
  compras.forEach(r => {
    const prov = r.proveedores?.nombre || 'Sin proveedor'
    provMap[prov] = (provMap[prov] || 0) + parseFloat(r.total || 0)
    prodMap[r.producto] = (prodMap[r.producto] || 0) + parseFloat(r.total || 0)
    const finca = r.fincas?.nombre || 'Sin finca'
    fincaMap[finca] = (fincaMap[finca] || 0) + parseFloat(r.total || 0)
  })
  const topProv = Object.entries(provMap).sort((a, b) => b[1] - a[1])[0]
  const topProd = Object.entries(prodMap).sort((a, b) => b[1] - a[1])[0]
  const byFinca = Object.entries(fincaMap).map(([finca, t]) => ({ finca, total: Math.round(t) }))
  return {
    total: Math.round(total),
    count: compras.length,
    topProveedor: topProv ? { nombre: topProv[0], total: Math.round(topProv[1]) } : null,
    topProducto:  topProd ? { nombre: topProd[0], total: Math.round(topProd[1]) } : null,
    byFinca,
  }
}

function buildPersonalSummary(personal) {
  const totalPersonaDia = personal.reduce((s, r) => s + (r.cantidad_personas || 0), 0)
  const laborMap = {}, fincaPersona = {}, fincaDias = {}
  personal.forEach(r => {
    laborMap[r.tipo_labor] = (laborMap[r.tipo_labor] || 0) + (r.cantidad_personas || 0)
    const f = r.fincas?.nombre || 'Sin finca'
    fincaPersona[f] = (fincaPersona[f] || 0) + (r.cantidad_personas || 0)
    if (!fincaDias[f]) fincaDias[f] = new Set()
    fincaDias[f].add(r.fecha)
  })
  const byLabor = Object.entries(laborMap).map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total)
  const byFinca = Object.entries(fincaPersona).map(([finca, total]) => {
    const dias = fincaDias[finca]?.size || 1
    return { finca, total, dias, promedio: Math.round((total / dias) * 10) / 10 }
  })
  const diaMap = {}
  personal.forEach(r => { diaMap[r.fecha] = (diaMap[r.fecha] || 0) + (r.cantidad_personas || 0) })
  const topDia = Object.entries(diaMap).sort((a, b) => b[1] - a[1])[0]
  const totalDias = new Set(personal.map(r => r.fecha)).size
  const promedioDia = totalDias > 0 ? Math.round((totalPersonaDia / totalDias) * 10) / 10 : 0
  return { totalPersonaDia, promedioDia, byLabor, byFinca, topDia }
}

function buildAlertas(cosArr, venW2, merArr, devArr) {
  const alertas = []
  // Mermas > 10%
  const totalCos = cosArr.reduce((s, r) => s + parseFloat(r.cantidad || 0), 0)
  const totalMer = merArr.reduce((s, r) => s + parseFloat(r.cantidad || 0), 0)
  if (totalCos > 0 && totalMer / totalCos > 0.10)
    alertas.push({ tipo: 'danger', icon: '⚠️', msg: `Mermas al ${Math.round((totalMer / totalCos) * 100)}% de la producción — supera el límite del 10%` })
  // Producto sin destino
  const venMap = {}, cosMap = {}, merMap = {}
  cosArr.forEach(r => { cosMap[r.producto] = (cosMap[r.producto] || 0) + parseFloat(r.cantidad || 0) })
  venW2.forEach(r  => { venMap[r.producto] = (venMap[r.producto] || 0) + parseFloat(r.cantidad || 0) })
  merArr.forEach(r => { merMap[r.producto] = (merMap[r.producto] || 0) + parseFloat(r.cantidad || 0) })
  Object.entries(cosMap).forEach(([p, c]) => {
    const sin = c - (venMap[p] || 0) - (merMap[p] || 0)
    if (c > 10 && sin > 0 && sin / c > 0.20)
      alertas.push({ tipo: 'warning', icon: '📦', msg: `${p}: ${Math.round(sin)} kg sin destino (${Math.round((sin / c) * 100)}% de lo cosechado)` })
  })
  // Cliente sin comprar 14d
  const now = new Date(); const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 14)
  const cutStr = cutoff.toISOString().split('T')[0]
  const recent = new Set(venW2.filter(r => r.fecha >= cutStr).map(r => r.nombre_cliente))
  const allC   = new Set(venW2.map(r => r.nombre_cliente))
  allC.forEach(c => { if (!recent.has(c)) alertas.push({ tipo: 'info', icon: '👥', msg: `${c} no ha comprado en los últimos 14 días` }) })
  // Dev mismo cliente >= 2
  const devMap = {}
  devArr.forEach(r => { if (!r.puede_revenderse) devMap[r.cliente] = (devMap[r.cliente] || 0) + 1 })
  Object.entries(devMap).forEach(([c, n]) => {
    if (n >= 2) alertas.push({ tipo: 'warning', icon: '↩️', msg: `${c} tiene ${n} devoluciones sin reingreso en el período` })
  })
  return alertas.slice(0, 8)
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

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, sub }) {
  return (
    <div style={{ paddingBottom: 4, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16, marginTop: 8 }}>
      <p className="db-header-eyebrow">{sub}</p>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f4f6fc', margin: 0 }}>{icon} {title}</h3>
    </div>
  )
}

// ── Rentabilidad section ──────────────────────────────────────────────────────
const RENT_LABEL = {
  sembrar:     { text: '🌱 Conviene sembrar',  cls: 'rent-sembrar'      },
  comprar:     { text: '🛒 Conviene comprar',  cls: 'rent-comprar'      },
  indiferente: { text: '⚖️ Indiferente',       cls: 'rent-indiferente'  },
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
  const [dbPeriodo, setDbPeriodo]     = useState('mes')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')
  const [fincaFilter, setFincaFilter] = useState(null)
  const [fincas, setFincas]           = useState([])
  const [loading, setLoading]         = useState(false)

  // KPIs
  const [kpi, setKpi] = useState({ cosechas: 0, ventas: 0, ingresos: 0, gastos: 0, gananciaNeta: 0, personalPromedio: 0 })

  // Ventas
  const [weeklyData, setWeeklyData]   = useState([])
  const [dayData, setDayData]         = useState([])
  const [prodData, setProdData]       = useState([])
  const [clientData, setClientData]   = useState([])
  const [starProduct, setStarProduct] = useState(null)
  const [perfiles, setPerfiles]       = useState([])

  // Pérdidas
  const [perdidas, setPerdidas]             = useState({ totalMermasKg: 0, totalDevPerdida: 0, pctPerdida: 0, showAlert: false, byProducto: [], devByCliente: [], hasMermas: false, hasDev: false })
  const [lossAlerts, setLossAlerts]         = useState([])
  const [mermasSummary, setMermasSummary]   = useState([])

  // Gastos
  const [gastosKPI, setGastosKPI]               = useState({ total: 0, count: 0 })
  const [gastosByCategoria, setGastosByCategoria] = useState([])
  const [gastosVsIngresos, setGastosVsIngresos]   = useState([])
  const [gastosMensual, setGastosMensual]         = useState([])

  // Compras
  const [comprasSummary, setComprasSummary] = useState({ total: 0, count: 0, topProveedor: null, topProducto: null, byFinca: [] })

  // Personal
  const [personalSummary, setPersonalSummary] = useState({ totalPersonaDia: 0, promedioDia: 0, byLabor: [], byFinca: [], topDia: null })

  // Rentabilidad
  const [rentData, setRentData] = useState([])

  // Alertas
  const [alertas, setAlertas] = useState([])

  // Other
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    supabase.from('fincas').select('id,nombre').eq('activo', true).order('id').then(({ data }) => {
      setFincas(data || [])
    })
  }, [])

  const fetchReal = useCallback(async (fincaId, from, to, fromW, from4M) => {
    setLoading(true)
    const applyFinca = q => fincaId != null ? q.eq('finca_id', fincaId) : q

    const [
      { data: c }, { data: v }, { data: cW }, { data: vW },
      { data: prodsCost }, { data: ppData }, { data: provsActive }, { data: m }, { data: dev },
      { data: g }, { data: gHist }, { data: comp }, { data: pers },
    ] = await Promise.all([
      applyFinca(supabase.from('cosechas').select('cantidad,producto').eq('estado','activo').gte('fecha',from).lte('fecha',to)),
      applyFinca(supabase.from('ventas').select('total,cantidad,producto,nombre_cliente,precio_unitario,finca_id,fincas(nombre)').eq('estado','activo').gte('fecha',from).lte('fecha',to)),
      applyFinca(supabase.from('cosechas').select('fecha,cantidad,producto').eq('estado','activo').gte('fecha',fromW).lte('fecha',to)),
      applyFinca(supabase.from('ventas').select('fecha,total,cantidad,producto,nombre_cliente').eq('estado','activo').gte('fecha',fromW).lte('fecha',to)),
      supabase.from('productos').select('nombre,costo_produccion').eq('activo',true).not('costo_produccion','is',null),
      supabase.from('proveedor_productos').select('nombre,precio,proveedor_id'),
      supabase.from('proveedores').select('id,nombre').eq('estado','activo'),
      applyFinca(supabase.from('mermas').select('cantidad,producto').eq('estado','activo').gte('fecha',from).lte('fecha',to)),
      applyFinca(supabase.from('devoluciones').select('total,puede_revenderse,cliente').eq('estado','activo').gte('fecha',from).lte('fecha',to)),
      applyFinca(supabase.from('gastos').select('monto,categoria,finca_id,fincas(nombre)').eq('estado','activo').gte('fecha',from).lte('fecha',to)),
      applyFinca(supabase.from('gastos').select('monto,fecha').eq('estado','activo').gte('fecha',from4M).lte('fecha',to)),
      applyFinca(supabase.from('compras').select('total,producto,proveedor_id,finca_id,fincas(nombre),proveedores(nombre)').eq('estado','activo').gte('fecha',from).lte('fecha',to)),
      applyFinca(supabase.from('personal_diario').select('cantidad_personas,tipo_labor,fecha,finca_id,fincas(nombre)').eq('estado','activo').gte('fecha',from).lte('fecha',to)),
    ])

    const cosArr   = c    || []
    const venArr   = v    || []
    const cosW2    = cW   || []
    const venW2    = vW   || []
    const merArr   = m    || []
    const devArr   = dev  || []
    const gasArr   = g    || []
    const gasHistArr = gHist || []
    const compArr  = comp || []
    const persArr  = pers || []

    const totalIngresos = venArr.reduce((s, r) => s + parseFloat(r.total || 0), 0)
    const totalGastos   = gasArr.reduce((s, r) => s + parseFloat(r.monto || 0), 0)
    const persTotal     = persArr.reduce((s, r) => s + (r.cantidad_personas || 0), 0)
    const persDias      = new Set(persArr.map(r => r.fecha)).size
    const persPromedio  = persDias > 0 ? Math.round((persTotal / persDias) * 10) / 10 : 0

    // Build proveedor id→nombre map
    const provMap = {}
    ;(provsActive || []).forEach(p => { provMap[p.id] = p.nombre })

    setKpi({
      cosechas: cosArr.length,
      ventas: venArr.length,
      ingresos: totalIngresos,
      gastos: totalGastos,
      gananciaNeta: totalIngresos - totalGastos,
      personalPromedio: persPromedio,
    })
    setWeeklyData(buildWeeklyData(venW2))
    setDayData(buildDayOfWeekData(venW2))
    setProdData(buildProductoData(cosW2, venW2))
    setClientData(buildClienteData(venW2))
    setStarProduct(buildStarProduct(venArr))
    setMermasSummary(buildMermasSummary(merArr))
    setPerdidas(buildPerdidasCombinadas(cosArr, merArr, devArr))
    setLossAlerts(buildLossAlerts(cosArr, venArr, merArr))
    setGastosKPI(buildGastosKPI(gasArr))
    setGastosByCategoria(buildGastosByCategoria(gasArr))
    setGastosVsIngresos(buildIngresosVsGastos(venArr, gasArr))
    setGastosMensual(buildGastosMensuales(gasHistArr))
    setComprasSummary(buildComprasSummary(compArr))
    setPersonalSummary(buildPersonalSummary(persArr))
    setRentData(buildRentabilidad(prodsCost || [], ppData || [], provMap, venArr))
    setPerfiles(buildClientePerfiles(venW2))
    setAlertas(buildAlertas(cosArr, venW2, merArr, devArr))
    setHasData(cosArr.length > 0 || venArr.length > 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (mode === 'real') {
      if (dbPeriodo === 'custom' && (!customDesde || !customHasta)) return
      const { from, to } = getDBRange(dbPeriodo, customDesde, customHasta)
      const now = new Date()
      const thirtyD = new Date(now); thirtyD.setDate(thirtyD.getDate() - 29)
      const fromW   = isoDate(thirtyD)
      const from4M  = isoDate(new Date(now.getFullYear(), now.getMonth() - 3, 1))
      fetchReal(fincaFilter, from, to, fromW, from4M)
    } else {
      // Demo mode
      setKpi({
        cosechas: DEMO_KPI_EXTENDED.cosechas,
        ventas: DEMO_KPI_EXTENDED.ventas,
        ingresos: DEMO_KPI_EXTENDED.ingresos,
        gastos: DEMO_KPI_EXTENDED.gastos,
        gananciaNeta: DEMO_KPI_EXTENDED.gananciaNeta,
        personalPromedio: DEMO_KPI_EXTENDED.personalPromedio,
      })
      setWeeklyData(DEMO_WEEKLY)
      setDayData(DEMO_DAYS)
      setProdData(DEMO_PRODUCTOS)
      setClientData(DEMO_CLIENTES)
      setStarProduct(DEMO_STAR)
      setMermasSummary(DEMO_MERMAS_SUMMARY)
      setPerdidas(DEMO_PERDIDAS)
      setLossAlerts(DEMO_LOSSES)
      setGastosKPI(DEMO_GASTOS_KPI)
      setGastosByCategoria(DEMO_GASTOS_CATEGORIA)
      setGastosVsIngresos(DEMO_GASTOS_VS_INGRESOS)
      setGastosMensual(DEMO_GASTOS_MENSUAL)
      setComprasSummary(DEMO_COMPRAS)
      setPersonalSummary(DEMO_PERSONAL)
      setRentData(DEMO_RENT)
      setPerfiles(DEMO_PERFILES)
      setAlertas(DEMO_ALERTAS)
      setHasData(true)
      setLoading(false)
    }
  }, [mode, fincaFilter, dbPeriodo, customDesde, customHasta, fetchReal])

  const totalClientes = clientData.reduce((s, r) => s + r.total, 0)
  const maxDay = dayData.length ? Math.max(...dayData.map(d => d.ventas)) : 1

  return (
    <div className="db-root">

      {/* ── Header ── */}
      <div className="db-header">
        <div className="db-header-left">
          <p className="db-header-eyebrow">Panel de control</p>
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

      {/* ── Period filter bar ── */}
      {mode === 'real' && (
        <>
          <div className="db-period-bar">
            {PERIODOS_DB.map(p => (
              <button
                key={p.id}
                className={`db-period-btn ${dbPeriodo === p.id ? 'active' : ''}`}
                onClick={() => setDbPeriodo(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {dbPeriodo === 'custom' && (
            <div className="db-custom-range">
              <label>Desde:</label>
              <input
                type="date"
                value={customDesde}
                onChange={e => setCustomDesde(e.target.value)}
              />
              <label>Hasta:</label>
              <input
                type="date"
                value={customHasta}
                onChange={e => setCustomHasta(e.target.value)}
              />
            </div>
          )}
        </>
      )}

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
      ) : (
        <>
          {/* ── Section 1: KPIs ── */}
          <div className="db-kpi-grid">
            <KpiCard icon="🌿" label="Cosechas del período"  value={kpi.cosechas}       accent={GOLD} />
            <KpiCard icon="💰" label="Ventas del período"    value={kpi.ventas}          accent={BLUE_BAR} />
            <KpiCard icon="📈" label="Ingresos totales"      value={kpi.ingresos}        accent={GREEN_VAL} isCurrency />
            <KpiCard icon="💸" label="Gastos operativos"     value={kpi.gastos}          accent="#f87171" isCurrency />
            <KpiCard icon="🏦" label="Ganancia neta"         value={kpi.gananciaNeta}    accent={kpi.gananciaNeta >= 0 ? GREEN_VAL : '#f87171'} isCurrency />
            <KpiCard icon="👷" label="Personal prom./día"    value={kpi.personalPromedio} accent="#c084fc" />
          </div>

          {/* ── Section 2: Ventas ── */}
          <SectionHeader icon="📊" title="Ventas" sub="Análisis de ingresos" />

          {/* Area chart weekly */}
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

          {/* Ventas por día | Producto estrella */}
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

          {/* Cosechado vs Vendido | Donut clientes */}
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

          {/* ── Section 3: Pérdidas ── */}
          <SectionHeader icon="⚠️" title="Pérdidas" sub="Mermas y devoluciones" />
          {(perdidas.hasMermas || perdidas.hasDev || lossAlerts.length > 0) ? (
            <>

              {/* Alert banner if >10% */}
              {perdidas.showAlert && (
                <div className="db-loss-banner">
                  <div className="db-loss-banner-head">
                    <span className="db-loss-pulse" />
                    <span className="db-loss-banner-title">
                      🚨 Mermas al {perdidas.pctPerdida}% de la producción — supera el límite del 10%
                    </span>
                  </div>
                </div>
              )}

              {/* KPI metrics row */}
              <div className="db-gastos-kpi-row">
                <div className="db-gastos-kpi-card">
                  <span className="db-gastos-kpi-label">Total mermas (kg)</span>
                  <span className="db-gastos-kpi-value db-gastos-kpi-danger">
                    {perdidas.totalMermasKg.toLocaleString('es-CR')} kg
                  </span>
                </div>
                {perdidas.hasDev && (
                  <div className="db-gastos-kpi-card">
                    <span className="db-gastos-kpi-label">Pérdida en devoluciones</span>
                    <span className="db-gastos-kpi-value db-gastos-kpi-danger">
                      ₡{perdidas.totalDevPerdida.toLocaleString('es-CR')}
                    </span>
                  </div>
                )}
                <div className="db-gastos-kpi-card">
                  <span className="db-gastos-kpi-label">% Pérdida producción</span>
                  <span className={`db-gastos-kpi-value ${perdidas.pctPerdida > 10 ? 'db-gastos-kpi-danger' : 'db-gastos-kpi-ok'}`}>
                    {perdidas.pctPerdida}%
                  </span>
                </div>
              </div>

              {/* Charts row */}
              {(perdidas.byProducto.length > 0 || perdidas.devByCliente.length > 0) && (
                <div className="db-charts-row">
                  {perdidas.byProducto.length > 0 && (
                    <div className="db-chart-card">
                      <div className="db-chart-header">
                        <h3 className="db-chart-title">Mermas por producto</h3>
                        <span className="db-chart-sub">kg perdidos</span>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={perdidas.byProducto}
                          layout="vertical"
                          margin={{ top: 8, right: 24, left: 90, bottom: 0 }}
                          barSize={18}
                        >
                          <CartesianGrid stroke={GRID_C} horizontal={false} />
                          <XAxis type="number" tick={{ fill: TEXT_S, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v} kg`} />
                          <YAxis type="category" dataKey="producto" tick={{ fill: TEXT_S, fontSize: 12 }} axisLine={false} tickLine={false} width={85} />
                          <Tooltip
                            formatter={val => [`${val} kg`, 'Merma']}
                            contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GOLD_DIM}`, borderRadius: 10, fontSize: 13 }}
                            itemStyle={{ color: '#e8edf8' }}
                          />
                          <Bar dataKey="cantidad" name="Merma" fill="#fb923c" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {perdidas.devByCliente.length > 0 && (
                    <div className="db-chart-card">
                      <div className="db-chart-header">
                        <h3 className="db-chart-title">Devoluciones (pérdida)</h3>
                        <span className="db-chart-sub">Por cliente · no reingresado</span>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={perdidas.devByCliente}
                          layout="vertical"
                          margin={{ top: 8, right: 24, left: 100, bottom: 0 }}
                          barSize={18}
                        >
                          <CartesianGrid stroke={GRID_C} horizontal={false} />
                          <XAxis type="number" tick={{ fill: TEXT_S, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₡${(v/1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="cliente" tick={{ fill: TEXT_S, fontSize: 12 }} axisLine={false} tickLine={false} width={95} />
                          <Tooltip
                            formatter={val => [`₡${Math.round(val).toLocaleString('es-CR')}`, 'Pérdida']}
                            contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GOLD_DIM}`, borderRadius: 10, fontSize: 13 }}
                            itemStyle={{ color: '#e8edf8' }}
                          />
                          <Bar dataKey="total" name="Pérdida" fill="#f87171" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {/* Loss alerts (sin destino) */}
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
            </>
          ) : (
            <div className="db-chart-card" style={{ textAlign: 'center', padding: '28px 16px' }}>
              <p style={{ color: 'rgba(200,215,245,0.4)', fontSize: 14 }}>Sin mermas ni devoluciones registradas en este período.</p>
            </div>
          )}

          {/* ── Section 4: Gastos ── */}
          <SectionHeader icon="💸" title="Gastos operativos" sub="Control financiero" />
          {gastosKPI.count > 0 ? (
            <>

              <div className="db-gastos-kpi-row">
                <div className="db-gastos-kpi-card">
                  <span className="db-gastos-kpi-label">Total gastos del período</span>
                  <span className="db-gastos-kpi-value db-gastos-kpi-danger">
                    ₡{gastosKPI.total.toLocaleString('es-CR')}
                  </span>
                </div>
                {gastosByCategoria[0] && (
                  <div className="db-gastos-kpi-card">
                    <span className="db-gastos-kpi-label">Categoría principal</span>
                    <span className="db-gastos-kpi-value" style={{ fontSize: 18 }}>
                      {CATEGORIA_LABELS[gastosByCategoria[0].categoria] || gastosByCategoria[0].categoria}
                    </span>
                    <span className="db-gastos-kpi-sub">
                      ₡{gastosByCategoria[0].monto.toLocaleString('es-CR')} · {gastosKPI.total > 0 ? Math.round((gastosByCategoria[0].monto / gastosKPI.total) * 100) : 0}% del total
                    </span>
                  </div>
                )}
                {gastosVsIngresos.length > 0 && (() => {
                  const totalIng = gastosVsIngresos.reduce((s, r) => s + r.ingresos, 0)
                  const balance  = totalIng - gastosKPI.total
                  return (
                    <div className="db-gastos-kpi-card">
                      <span className="db-gastos-kpi-label">Balance neto del período</span>
                      <span className={`db-gastos-kpi-value ${balance >= 0 ? 'db-gastos-kpi-ok' : 'db-gastos-kpi-danger'}`}>
                        {balance >= 0 ? '+' : ''}₡{Math.abs(balance).toLocaleString('es-CR')}
                      </span>
                      <span className="db-gastos-kpi-sub">Ingresos − Gastos</span>
                    </div>
                  )
                })()}
              </div>

              <div className="db-charts-row">
                <div className="db-chart-card">
                  <div className="db-chart-header">
                    <h3 className="db-chart-title">Gastos por categoría</h3>
                    <span className="db-chart-sub">Período actual</span>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={gastosByCategoria}
                      layout="vertical"
                      margin={{ top: 8, right: 24, left: 120, bottom: 0 }}
                      barSize={18}
                    >
                      <CartesianGrid stroke={GRID_C} horizontal={false} />
                      <XAxis type="number" tick={{ fill: TEXT_S, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₡${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="categoria" tick={{ fill: TEXT_S, fontSize: 12 }} axisLine={false} tickLine={false} width={115} tickFormatter={v => CATEGORIA_LABELS[v] || v} />
                      <Tooltip
                        formatter={val => [`₡${Math.round(val).toLocaleString('es-CR')}`, 'Gasto']}
                        contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GOLD_DIM}`, borderRadius: 10, fontSize: 13 }}
                        itemStyle={{ color: '#e8edf8' }}
                      />
                      <Bar dataKey="monto" name="Gasto" radius={[0, 6, 6, 0]}>
                        {gastosByCategoria.map((d, i) => (
                          <Cell key={i} fill={GASTO_COLORS[d.categoria] || '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {gastosVsIngresos.length > 0 && (
                  <div className="db-chart-card">
                    <div className="db-chart-header">
                      <h3 className="db-chart-title">Ingresos vs Gastos</h3>
                      <span className="db-chart-sub">Por finca · período actual</span>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={gastosVsIngresos} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barGap={4} barSize={28}>
                        <CartesianGrid stroke={GRID_C} vertical={false} />
                        <XAxis dataKey="finca" tick={{ fill: TEXT_S, fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: TEXT_S, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₡${(v/1000).toFixed(0)}k`} width={58} />
                        <Tooltip
                          formatter={(val, name) => [`₡${Math.round(val).toLocaleString('es-CR')}`, name]}
                          contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GOLD_DIM}`, borderRadius: 10, fontSize: 13 }}
                          itemStyle={{ color: '#e8edf8' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 14, fontSize: 13 }} formatter={n => <span style={{ color: TEXT_S }}>{n}</span>} />
                        <Bar dataKey="ingresos" name="Ingresos" fill={GREEN_VAL} radius={[5, 5, 0, 0]} />
                        <Bar dataKey="gastos"   name="Gastos"   fill="#f87171"  radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {gastosMensual.length > 1 && (
                <div className="db-chart-card db-chart-full">
                  <div className="db-chart-header">
                    <h3 className="db-chart-title">Tendencia de gastos</h3>
                    <span className="db-chart-sub">Últimos 4 meses</span>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={gastosMensual} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barSize={40}>
                      <CartesianGrid stroke={GRID_C} vertical={false} />
                      <XAxis dataKey="mes" tick={{ fill: TEXT_S, fontSize: 13 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: TEXT_S, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₡${(v/1000).toFixed(0)}k`} width={58} />
                      <Tooltip
                        formatter={val => [`₡${Math.round(val).toLocaleString('es-CR')}`, 'Gastos']}
                        contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GOLD_DIM}`, borderRadius: 10, fontSize: 13 }}
                        itemStyle={{ color: '#e8edf8' }}
                      />
                      <Bar dataKey="monto" name="Gastos" fill="#f87171" radius={[6, 6, 0, 0]}>
                        {gastosMensual.map((d, i) => (
                          <Cell key={i} fill={i === gastosMensual.length - 1 ? '#fb923c' : 'rgba(248,113,113,0.5)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="db-chart-card" style={{ textAlign: 'center', padding: '28px 16px' }}>
              <p style={{ color: 'rgba(200,215,245,0.4)', fontSize: 14 }}>Sin gastos registrados en este período. Usá el módulo 💸 Gastos para registrar.</p>
            </div>
          )}

          {/* ── Section 5: Compras ── */}
          <SectionHeader icon="🛒" title="Compras a proveedores" sub="Insumos y materiales" />
          {comprasSummary.count > 0 ? (
            <>

              <div className="db-gastos-kpi-row">
                <div className="db-gastos-kpi-card">
                  <span className="db-gastos-kpi-label">Total compras</span>
                  <span className="db-gastos-kpi-value" style={{ color: '#60a5fa' }}>
                    ₡{comprasSummary.total.toLocaleString('es-CR')}
                  </span>
                  <span className="db-gastos-kpi-sub">{comprasSummary.count} registros</span>
                </div>
                {comprasSummary.topProveedor && (
                  <div className="db-gastos-kpi-card">
                    <span className="db-gastos-kpi-label">Top proveedor</span>
                    <span className="db-gastos-kpi-value" style={{ fontSize: 18 }}>
                      {comprasSummary.topProveedor.nombre}
                    </span>
                    <span className="db-gastos-kpi-sub">
                      ₡{comprasSummary.topProveedor.total.toLocaleString('es-CR')}
                    </span>
                  </div>
                )}
                {comprasSummary.topProducto && (
                  <div className="db-gastos-kpi-card">
                    <span className="db-gastos-kpi-label">Top producto comprado</span>
                    <span className="db-gastos-kpi-value" style={{ fontSize: 18 }}>
                      {comprasSummary.topProducto.nombre}
                    </span>
                    <span className="db-gastos-kpi-sub">
                      ₡{comprasSummary.topProducto.total.toLocaleString('es-CR')}
                    </span>
                  </div>
                )}
              </div>

              {comprasSummary.byFinca.length > 1 && (
                <div className="db-chart-card db-chart-full">
                  <div className="db-chart-header">
                    <h3 className="db-chart-title">Compras por finca</h3>
                    <span className="db-chart-sub">Distribución del gasto en insumos</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={comprasSummary.byFinca} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barSize={40}>
                      <CartesianGrid stroke={GRID_C} vertical={false} />
                      <XAxis dataKey="finca" tick={{ fill: TEXT_S, fontSize: 13 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: TEXT_S, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₡${(v/1000).toFixed(0)}k`} width={58} />
                      <Tooltip
                        formatter={val => [`₡${Math.round(val).toLocaleString('es-CR')}`, 'Compras']}
                        contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GOLD_DIM}`, borderRadius: 10, fontSize: 13 }}
                        itemStyle={{ color: '#e8edf8' }}
                      />
                      <Bar dataKey="total" name="Compras" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <div className="db-chart-card" style={{ textAlign: 'center', padding: '28px 16px' }}>
              <p style={{ color: 'rgba(200,215,245,0.4)', fontSize: 14 }}>Sin compras registradas en este período. Usá el módulo 🛒 Compras para registrar.</p>
            </div>
          )}

          {/* ── Section 6: Personal ── */}
          <SectionHeader icon="👷" title="Personal" sub="Gestión de mano de obra" />
          {personalSummary.totalPersonaDia > 0 ? (
            <>

              <div className="db-gastos-kpi-row">
                <div className="db-gastos-kpi-card">
                  <span className="db-gastos-kpi-label">Total persona-día</span>
                  <span className="db-gastos-kpi-value" style={{ color: '#c084fc' }}>
                    {personalSummary.totalPersonaDia.toLocaleString('es-CR')}
                  </span>
                </div>
                <div className="db-gastos-kpi-card">
                  <span className="db-gastos-kpi-label">Promedio personas/día</span>
                  <span className="db-gastos-kpi-value" style={{ color: '#c084fc' }}>
                    {personalSummary.promedioDia}
                  </span>
                </div>
                {personalSummary.topDia && (
                  <div className="db-gastos-kpi-card">
                    <span className="db-gastos-kpi-label">Día más activo</span>
                    <span className="db-gastos-kpi-value" style={{ fontSize: 18 }}>
                      {fmtFechaCorta(personalSummary.topDia[0])}
                    </span>
                    <span className="db-gastos-kpi-sub">
                      {personalSummary.topDia[1]} personas
                    </span>
                  </div>
                )}
              </div>

              {(personalSummary.byLabor.length > 0 || personalSummary.byFinca.length > 0) && (
                <div className="db-charts-row">
                  {personalSummary.byLabor.length > 0 && (
                    <div className="db-chart-card">
                      <div className="db-chart-header">
                        <h3 className="db-chart-title">Personal por tipo labor</h3>
                        <span className="db-chart-sub">Persona-día acumulado</span>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={personalSummary.byLabor}
                            dataKey="total"
                            nameKey="tipo"
                            innerRadius="40%" outerRadius="70%"
                            paddingAngle={3}
                            startAngle={90} endAngle={-270}
                          >
                            {personalSummary.byLabor.map((d, i) => (
                              <Cell key={i} fill={LABOR_COLORS[d.tipo] || PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val, name) => [`${val} persona-día`, LABOR_LABELS[name] || name]}
                            contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GOLD_DIM}`, borderRadius: 10, fontSize: 13 }}
                            itemStyle={{ color: '#e8edf8' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="db-pie-legend">
                        {personalSummary.byLabor.map((d, i) => (
                          <div key={i} className="db-pie-row">
                            <span className="db-pie-dot" style={{ background: LABOR_COLORS[d.tipo] || PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="db-pie-name">{LABOR_LABELS[d.tipo] || d.tipo}</span>
                            <span className="db-pie-pct">{d.total}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {personalSummary.byFinca.length > 0 && (
                    <div className="db-chart-card">
                      <div className="db-chart-header">
                        <h3 className="db-chart-title">Personal por finca</h3>
                        <span className="db-chart-sub">Promedio diario</span>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={personalSummary.byFinca} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barSize={36}>
                          <CartesianGrid stroke={GRID_C} vertical={false} />
                          <XAxis dataKey="finca" tick={{ fill: TEXT_S, fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: TEXT_S, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                          <Tooltip
                            formatter={(val, name) => [val, name === 'promedio' ? 'Promedio/día' : 'Total persona-día']}
                            contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GOLD_DIM}`, borderRadius: 10, fontSize: 13 }}
                            itemStyle={{ color: '#e8edf8' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: 14, fontSize: 13 }} formatter={n => <span style={{ color: TEXT_S }}>{n === 'promedio' ? 'Promedio/día' : 'Total'}</span>} />
                          <Bar dataKey="total"    name="total"    fill="rgba(192,132,252,0.4)" radius={[5, 5, 0, 0]} />
                          <Bar dataKey="promedio" name="promedio" fill="#c084fc"               radius={[5, 5, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="db-chart-card" style={{ textAlign: 'center', padding: '28px 16px' }}>
              <p style={{ color: 'rgba(200,215,245,0.4)', fontSize: 14 }}>Sin registros de personal en este período. Usá el módulo 👷 Personal para registrar.</p>
            </div>
          )}

          {/* ── Section 7: Rentabilidad ── */}
          <SectionHeader icon="⚖️" title="Rentabilidad" sub="Producción propia vs proveedores" />
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

          {/* ── Section 8: Alertas ── */}
          <SectionHeader icon="🔔" title="Alertas" sub="Situaciones que requieren atención" />
          {alertas.length > 0 ? (
            <div className="db-alertas-list">
              {alertas.map((a, i) => (
                <div key={i} className={`db-alerta-item db-alerta-${a.tipo}`}>
                  <span className="db-alerta-icon">{a.icon}</span>
                  <span className="db-alerta-msg">{a.msg}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="db-chart-card" style={{ textAlign: 'center', padding: '28px 16px' }}>
              <p style={{ color: '#34d399', fontSize: 14, fontWeight: 600 }}>✅ Todo en orden — sin alertas activas en este período.</p>
            </div>
          )}

          {/* ── Section 9: Perfil de Clientes ── */}
          <SectionHeader icon="👥" title="Perfil de Clientes" sub="Hábitos de compra" />
          <div className="db-chart-card db-chart-full">
            <ClientePerfilesSection data={perfiles} />
          </div>

        </>
      )}
    </div>
  )
}
