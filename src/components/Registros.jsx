import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { exportToCSV, formatDateForFilename } from '../lib/csv'
import ConfirmModal from './ConfirmModal'
import DateInput from './DateInput'

const PERIODOS = [
  { id: 'hoy',    label: 'Hoy' },
  { id: 'ayer',   label: 'Ayer' },
  { id: '7dias',  label: '7 días' },
  { id: '30dias', label: '30 días' },
  { id: 'custom', label: 'Personalizado' },
]

function toISO(d) { return d.toISOString().split('T')[0] }

function getRange(periodo, desde, hasta) {
  const now = new Date()
  const hoy = toISO(now)
  const sub = days => { const d = new Date(now); d.setDate(d.getDate() - days); return toISO(d) }
  switch (periodo) {
    case 'hoy':    return { from: hoy,     to: hoy }
    case 'ayer':   return { from: sub(1),  to: sub(1) }
    case '7dias':  return { from: sub(6),  to: hoy }
    case '30dias': return { from: sub(29), to: hoy }
    case 'custom': return { from: desde || hoy, to: hasta || hoy }
    default:       return { from: sub(6),  to: hoy }
  }
}

function fmtFecha(fecha) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function fmtHora(ts) {
  return new Date(ts).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
}

function rangeLabel(from, to) {
  const opts = { day: 'numeric', month: 'short' }
  const f = new Date(from + 'T12:00:00')
  const t = new Date(to   + 'T12:00:00')
  if (from === to) {
    return f.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }
  return `${f.toLocaleDateString('es-CR', opts)} — ${t.toLocaleDateString('es-CR', { ...opts, year: 'numeric' })}`
}

export default function Registros({ onRefresh, canArchive = false, canDelete = false }) {
  const [periodo, setPeriodo]         = useState('7dias')
  const [desde, setDesde]             = useState('')
  const [hasta, setHasta]             = useState('')
  const [busqProd, setBusqProd]       = useState('')
  const [busqCliente, setBusqCliente] = useState('')

  const [cosechas, setCosechas] = useState([])
  const [ventas, setVentas]     = useState([])
  const [loading, setLoading]   = useState(true)

  const [showArchivados, setShowArchivados] = useState(false)
  const [archCosechas, setArchCosechas]     = useState([])
  const [archVentas, setArchVentas]         = useState([])
  const [loadingArch, setLoadingArch]       = useState(false)

  const [confirmDel, setConfirmDel]         = useState(null)
  const [archConfirmDel, setArchConfirmDel] = useState(null)

  // ── Fetch principal ───────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    const { from, to } = getRange(periodo, desde, hasta)
    const [{ data: c }, { data: v }] = await Promise.all([
      supabase.from('cosechas').select('*').eq('estado', 'activo')
        .gte('fecha', from).lte('fecha', to)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('ventas').select('*').eq('estado', 'activo')
        .gte('fecha', from).lte('fecha', to)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false }),
    ])
    setCosechas(c || [])
    setVentas(v || [])
    setLoading(false)
  }, [periodo, desde, hasta])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Fetch archivados ──────────────────────────────────────────────────────
  const fetchArchivados = useCallback(async () => {
    setLoadingArch(true)
    const [{ data: c }, { data: v }] = await Promise.all([
      supabase.from('cosechas').select('*').eq('estado', 'archivado')
        .order('fecha', { ascending: false }),
      supabase.from('ventas').select('*').eq('estado', 'archivado')
        .order('fecha', { ascending: false }),
    ])
    setArchCosechas(c || [])
    setArchVentas(v || [])
    setLoadingArch(false)
  }, [])

  useEffect(() => { if (showArchivados) fetchArchivados() }, [showArchivados, fetchArchivados])

  // ── Filtros en memoria ────────────────────────────────────────────────────
  const filtCosechas = cosechas.filter(r =>
    !busqProd || r.producto.toLowerCase().includes(busqProd.toLowerCase())
  )
  const filtVentas = ventas.filter(r =>
    (!busqProd    || r.producto.toLowerCase().includes(busqProd.toLowerCase())) &&
    (!busqCliente || r.nombre_cliente.toLowerCase().includes(busqCliente.toLowerCase()))
  )
  const totalIngresos = filtVentas.reduce((s, r) => s + parseFloat(r.total || 0), 0)

  // ── Acciones ──────────────────────────────────────────────────────────────
  const handleArchive = async (tabla, id) => {
    await supabase.from(tabla).update({ estado: 'archivado' }).eq('id', id)
    fetchData()
    onRefresh?.()
  }

  const handleDelete = async () => {
    const { tabla, id } = confirmDel
    await supabase.from(tabla).delete().eq('id', id)
    setConfirmDel(null)
    fetchData()
    onRefresh?.()
  }

  const handleRestore = async (tabla, id) => {
    await supabase.from(tabla).update({ estado: 'activo' }).eq('id', id)
    fetchArchivados()
    onRefresh?.()
  }

  const handleArchDelete = async () => {
    const { tabla, id } = archConfirmDel
    await supabase.from(tabla).delete().eq('id', id)
    setArchConfirmDel(null)
    fetchArchivados()
  }

  // ── Exports ───────────────────────────────────────────────────────────────
  const exportCosechas = () => {
    const data = filtCosechas.map(r => ({
      Fecha: r.fecha, Producto: r.producto, Cantidad: r.cantidad,
      Unidad: r.unidad, Notas: r.notas || '', Hora: fmtHora(r.created_at),
    }))
    exportToCSV(data, `cosechas_${formatDateForFilename(new Date())}.csv`)
  }

  const exportVentas = () => {
    const data = filtVentas.map(r => ({
      Fecha: r.fecha, Producto: r.producto, Cantidad: r.cantidad, Unidad: r.unidad,
      Cliente: r.nombre_cliente, 'Precio Unitario': r.precio_unitario,
      Total: r.total, Notas: r.notas || '', Hora: fmtHora(r.created_at),
    }))
    exportToCSV(data, `ventas_${formatDateForFilename(new Date())}.csv`)
  }

  const { from, to } = getRange(periodo, desde, hasta)

  return (
    <div className="registros-section">

      {/* ── Filtros ── */}
      <div className="card reg-filters-card">
        <div className="reg-period-row">
          {PERIODOS.map(p => (
            <button
              key={p.id}
              className={`reg-period-btn ${periodo === p.id ? 'active' : ''}`}
              onClick={() => setPeriodo(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {periodo === 'custom' && (
          <div className="reg-custom-range">
            <div className="form-group">
              <label>Desde</label>
              <DateInput value={desde} onChange={e => setDesde(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Hasta</label>
              <DateInput value={hasta} onChange={e => setHasta(e.target.value)} />
            </div>
          </div>
        )}

        <div className="reg-search-row">
          <div className="reg-search-wrap">
            <span className="reg-search-icon">🔍</span>
            <input
              className="reg-search-input"
              placeholder="Filtrar por producto..."
              value={busqProd}
              onChange={e => setBusqProd(e.target.value)}
            />
            {busqProd && (
              <button className="reg-search-clear" onClick={() => setBusqProd('')}>✕</button>
            )}
          </div>
          <div className="reg-search-wrap">
            <span className="reg-search-icon">👤</span>
            <input
              className="reg-search-input"
              placeholder="Filtrar por cliente..."
              value={busqCliente}
              onChange={e => setBusqCliente(e.target.value)}
            />
            {busqCliente && (
              <button className="reg-search-clear" onClick={() => setBusqCliente('')}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Resumen del período ── */}
      <div className="reg-summary-bar">
        <span className="reg-range-label">{rangeLabel(from, to)}</span>
        <div className="reg-chips">
          <span className="reg-chip reg-chip-green">🌿 {filtCosechas.length} cosecha{filtCosechas.length !== 1 ? 's' : ''}</span>
          <span className="reg-chip reg-chip-blue">💰 {filtVentas.length} venta{filtVentas.length !== 1 ? 's' : ''}</span>
          {totalIngresos > 0 && (
            <span className="reg-chip reg-chip-gold">
              📈 ₡{totalIngresos.toLocaleString('es-CR')}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card registros-card">
          <div className="loading-state">Cargando registros...</div>
        </div>
      ) : (
        <>
          {/* ── Cosechas ── */}
          <div className="card registros-card">
            <div className="registros-header">
              <div className="registros-header-left">
                <span className="card-icon">🌿</span>
                <h3>Cosechas ({filtCosechas.length})</h3>
              </div>
              {filtCosechas.length > 0 && (
                <button className="btn-export" onClick={exportCosechas}>↓ CSV</button>
              )}
            </div>

            {filtCosechas.length === 0 ? (
              <p className="empty-state">No hay cosechas en este período.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Unidad</th>
                      <th>Notas</th>
                      <th>Hora</th>
                      {(canArchive || canDelete) && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtCosechas.map(r => (
                      <tr key={r.id}>
                        <td className="td-hora reg-td-fecha">{fmtFecha(r.fecha)}</td>
                        <td className="td-producto">{r.producto}</td>
                        <td className="td-number">{r.cantidad}</td>
                        <td>{r.unidad}</td>
                        <td className="td-notas">{r.notas || '—'}</td>
                        <td className="td-hora">{fmtHora(r.created_at)}</td>
                        {(canArchive || canDelete) && (
                          <td className="td-actions">
                            {canArchive && (
                              <button className="btn-action-archive" title="Archivar"
                                onClick={() => handleArchive('cosechas', r.id)}>🗃️</button>
                            )}
                            {canDelete && (
                              <button className="btn-action-delete" title="Eliminar"
                                onClick={() => setConfirmDel({ tabla: 'cosechas', id: r.id, label: r.producto })}>🗑️</button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Ventas ── */}
          <div className="card registros-card">
            <div className="registros-header">
              <div className="registros-header-left">
                <span className="card-icon">💰</span>
                <h3>Ventas ({filtVentas.length})</h3>
              </div>
              {filtVentas.length > 0 && (
                <button className="btn-export" onClick={exportVentas}>↓ CSV</button>
              )}
            </div>

            {filtVentas.length === 0 ? (
              <p className="empty-state">No hay ventas en este período.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Unidad</th>
                      <th>Cliente</th>
                      <th>Precio</th>
                      <th>Total</th>
                      <th>Hora</th>
                      {(canArchive || canDelete) && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtVentas.map(r => (
                      <tr key={r.id}>
                        <td className="td-hora reg-td-fecha">{fmtFecha(r.fecha)}</td>
                        <td className="td-producto">{r.producto}</td>
                        <td className="td-number">{r.cantidad}</td>
                        <td>{r.unidad}</td>
                        <td className="td-producto">{r.nombre_cliente}</td>
                        <td className="td-number">₡{parseFloat(r.precio_unitario).toLocaleString('es-CR')}</td>
                        <td className="td-total">₡{parseFloat(r.total).toLocaleString('es-CR')}</td>
                        <td className="td-hora">{fmtHora(r.created_at)}</td>
                        {(canArchive || canDelete) && (
                          <td className="td-actions">
                            {canArchive && (
                              <button className="btn-action-archive" title="Archivar"
                                onClick={() => handleArchive('ventas', r.id)}>🗃️</button>
                            )}
                            {canDelete && (
                              <button className="btn-action-delete" title="Eliminar"
                                onClick={() => setConfirmDel({ tabla: 'ventas', id: r.id, label: r.producto })}>🗑️</button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} className="tf-label">Total del período:</td>
                      <td className="td-total tf-total">
                        ₡{totalIngresos.toLocaleString('es-CR')}
                      </td>
                      <td></td>
                      {(canArchive || canDelete) && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ── Archivados ── */}
          <div className="card registros-card archivados-section">
            <div className="registros-header">
              <div className="registros-header-left">
                <span className="card-icon">📦</span>
                <h3>
                  Archivados
                  {showArchivados && !loadingArch && ` (${archCosechas.length + archVentas.length})`}
                </h3>
              </div>
              <button className="btn-export" onClick={() => setShowArchivados(v => !v)}>
                {showArchivados ? 'Ocultar' : 'Ver archivados'}
              </button>
            </div>

            {showArchivados && (
              loadingArch ? (
                <div className="loading-state">Cargando archivados...</div>
              ) : (
                <div className="archivados-content">
                  {archCosechas.length > 0 && (
                    <>
                      <p className="archivados-subtitle">🌿 Cosechas archivadas ({archCosechas.length})</p>
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr><th>Fecha</th><th>Producto</th><th>Cantidad</th><th>Unidad</th><th></th></tr>
                          </thead>
                          <tbody>
                            {archCosechas.map(r => (
                              <tr key={r.id}>
                                <td className="td-hora">{fmtFecha(r.fecha)}</td>
                                <td className="td-producto">{r.producto}</td>
                                <td className="td-number">{r.cantidad}</td>
                                <td>{r.unidad}</td>
                                {(canArchive || canDelete) && (
                                  <td className="td-actions">
                                    {canArchive && (
                                      <button className="btn-action-restore" title="Restaurar"
                                        onClick={() => handleRestore('cosechas', r.id)}>↩</button>
                                    )}
                                    {canDelete && (
                                      <button className="btn-action-delete" title="Eliminar permanentemente"
                                        onClick={() => setArchConfirmDel({ tabla: 'cosechas', id: r.id, label: r.producto })}>🗑️</button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {archVentas.length > 0 && (
                    <>
                      <p className="archivados-subtitle">💰 Ventas archivadas ({archVentas.length})</p>
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr><th>Fecha</th><th>Producto</th><th>Cliente</th><th>Total</th><th></th></tr>
                          </thead>
                          <tbody>
                            {archVentas.map(r => (
                              <tr key={r.id}>
                                <td className="td-hora">{fmtFecha(r.fecha)}</td>
                                <td className="td-producto">{r.producto}</td>
                                <td>{r.nombre_cliente}</td>
                                <td className="td-total">₡{parseFloat(r.total).toLocaleString('es-CR')}</td>
                                {(canArchive || canDelete) && (
                                  <td className="td-actions">
                                    {canArchive && (
                                      <button className="btn-action-restore" title="Restaurar"
                                        onClick={() => handleRestore('ventas', r.id)}>↩</button>
                                    )}
                                    {canDelete && (
                                      <button className="btn-action-delete" title="Eliminar permanentemente"
                                        onClick={() => setArchConfirmDel({ tabla: 'ventas', id: r.id, label: r.producto })}>🗑️</button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {archCosechas.length === 0 && archVentas.length === 0 && (
                    <p className="empty-state">No hay registros archivados.</p>
                  )}
                </div>
              )
            )}
          </div>
        </>
      )}

      {confirmDel && (
        <ConfirmModal
          message={`¿Seguro que desea eliminar el registro de "${confirmDel.label}"?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {archConfirmDel && (
        <ConfirmModal
          message={`¿Eliminar permanentemente "${archConfirmDel.label}"? Esta acción no se puede deshacer.`}
          onConfirm={handleArchDelete}
          onCancel={() => setArchConfirmDel(null)}
        />
      )}
    </div>
  )
}
