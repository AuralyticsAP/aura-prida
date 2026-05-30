import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { UNIDADES_COMPRAS } from '../lib/constants'
import ConfirmModal from './ConfirmModal'
import AbonoPagoModal from './AbonoPagoModal'
import { exportToCSV, formatDateForFilename } from '../lib/csv'
import DateInput from './DateInput'

const today = new Date().toISOString().split('T')[0]

const INIT_FORM = {
  finca_id:          '',
  proveedor_id:      '',
  producto:          '',
  cantidad:          '',
  unidad:            'kg',
  precio_unitario:   '',
  fecha:             today,
  fecha_vencimiento: '',
  notas:             '',
  pago_inmediato:    false,
}

const PERIODOS = [
  { id: 'hoy',    label: 'Hoy'    },
  { id: 'ayer',   label: 'Ayer'   },
  { id: '7dias',  label: '7 días' },
  { id: '30dias', label: '30 días'},
  { id: 'custom', label: 'Personalizado' },
]

const PAGO_ESTADOS = [
  { id: null,        label: 'Todos'     },
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'parcial',   label: 'Parcial'   },
  { id: 'pagado',    label: 'Pagado'    },
]

const PAGO_BADGE_CFG = {
  pendiente: { label: 'Pendiente', cls: 'pago-badge pago-pendiente' },
  parcial:   { label: 'Parcial',   cls: 'pago-badge pago-parcial'   },
  pagado:    { label: 'Pagado',    cls: 'pago-badge pago-pagado'     },
}

function PagoBadge({ estado }) {
  const cfg = PAGO_BADGE_CFG[estado] || PAGO_BADGE_CFG.pendiente
  return <span className={cfg.cls}>{cfg.label}</span>
}

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
    default:       return { from: sub(29), to: hoy }
  }
}

function fmtFecha(f) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-CR', {
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
  if (from === to)
    return f.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return `${f.toLocaleDateString('es-CR', opts)} — ${t.toLocaleDateString('es-CR', { ...opts, year: 'numeric' })}`
}

function getSaldo(r) {
  const abonado = (r.abonos_compras || []).reduce((s, a) => s + parseFloat(a.monto || 0), 0)
  return Math.max(0, parseFloat(r.total || 0) - abonado)
}

export default function Compras({ fincas = [], session, canWrite, canArchive, canDelete, showToast }) {
  const [view, setView] = useState(canWrite ? 'form' : 'historial')

  // ── Catálogos ──────────────────────────────────────────────────────────────
  const [proveedores, setProveedores] = useState([])

  useEffect(() => {
    supabase.from('proveedores').select('id,nombre').eq('estado', 'activo').order('nombre')
      .then(({ data }) => setProveedores(data || []))
  }, [])

  // ── Estado form ───────────────────────────────────────────────────────────
  const [form, setForm]             = useState(INIT_FORM)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError]   = useState(null)

  // ── Estado historial ──────────────────────────────────────────────────────
  const [compras, setCompras]         = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [periodo, setPeriodo]         = useState('30dias')
  const [desde, setDesde]             = useState('')
  const [hasta, setHasta]             = useState('')
  const [fincaFilt, setFincaFilt]     = useState(null)
  const [pagFilt, setPagFilt]         = useState(null)

  const [showArchivados, setShowArchivados] = useState(false)
  const [archCompras, setArchCompras]       = useState([])
  const [loadingArch, setLoadingArch]       = useState(false)

  const [confirmDel, setConfirmDel]         = useState(null)
  const [archConfirmDel, setArchConfirmDel] = useState(null)
  const [abonoTarget, setAbonoTarget]       = useState(null)

  // ── Fetch historial ───────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setHistLoading(true)
    const { from, to } = getRange(periodo, desde, hasta)
    let q = supabase
      .from('compras')
      .select('*, fincas(nombre), proveedores(nombre), abonos_compras(id, monto)')
      .eq('estado', 'activo')
      .gte('fecha', from).lte('fecha', to)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (fincaFilt != null) q = q.eq('finca_id', fincaFilt)
    const { data } = await q
    setCompras(data || [])
    setHistLoading(false)
  }, [periodo, desde, hasta, fincaFilt])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchArchivados = useCallback(async () => {
    setLoadingArch(true)
    const { data } = await supabase
      .from('compras')
      .select('*, fincas(nombre), proveedores(nombre)')
      .eq('estado', 'archivado')
      .order('fecha', { ascending: false })
    setArchCompras(data || [])
    setLoadingArch(false)
  }, [])

  useEffect(() => { if (showArchivados) fetchArchivados() }, [showArchivados, fetchArchivados])

  // ── Handlers form ─────────────────────────────────────────────────────────
  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setFormError(null)
  }

  const totalPreview = form.cantidad && form.precio_unitario
    ? (parseFloat(form.cantidad) * parseFloat(form.precio_unitario)).toFixed(2)
    : null

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.finca_id || !form.producto || !form.cantidad || !form.unidad || !form.precio_unitario || !form.fecha) {
      setFormError('Por favor completá todos los campos obligatorios.')
      return
    }
    setFormLoading(true)
    setFormError(null)

    const { data: newCompra, error: dbError } = await supabase.from('compras').insert([{
      finca_id:          parseInt(form.finca_id),
      proveedor_id:      form.proveedor_id || null,
      producto:          form.producto,
      cantidad:          parseFloat(form.cantidad),
      unidad:            form.unidad,
      precio_unitario:   parseFloat(form.precio_unitario),
      total:             parseFloat(totalPreview),
      fecha:             form.fecha,
      fecha_vencimiento: form.fecha_vencimiento || null,
      notas:             form.notas || null,
      estado_pago:       'pendiente',
      user_id:           session.user.id,
    }]).select('id').single()

    if (dbError) { setFormLoading(false); setFormError('Error al guardar: ' + dbError.message); return }

    // Si se pagó al momento, registrar abono completo
    if (form.pago_inmediato && newCompra?.id) {
      await supabase.from('abonos_compras').insert([{
        compra_id: newCompra.id,
        monto:     parseFloat(totalPreview),
        fecha:     form.fecha,
        notas:     'Pago al momento',
        user_id:   session.user.id,
      }])
      await supabase.from('compras').update({ estado_pago: 'pagado' }).eq('id', newCompra.id)
    }

    setFormLoading(false)
    setForm(INIT_FORM)
    showToast?.('✅ Compra registrada correctamente')
    setView('historial')
    fetchData()
  }

  // ── Handlers historial ────────────────────────────────────────────────────
  const handleArchive = async id => {
    await supabase.from('compras').update({ estado: 'archivado' }).eq('id', id)
    fetchData()
  }

  const handleDelete = async () => {
    await supabase.from('compras').delete().eq('id', confirmDel.id)
    setConfirmDel(null)
    fetchData()
  }

  const handleRestore = async id => {
    await supabase.from('compras').update({ estado: 'activo' }).eq('id', id)
    fetchArchivados()
  }

  const handleArchDelete = async () => {
    await supabase.from('compras').delete().eq('id', archConfirmDel.id)
    setArchConfirmDel(null)
    fetchArchivados()
  }

  const exportCompras = () => {
    const data = compras.map(r => ({
      Fecha:              r.fecha,
      'Fecha Vencimiento': r.fecha_vencimiento || '',
      Finca:              r.fincas?.nombre || '',
      Proveedor:          r.proveedores?.nombre || '',
      Producto:           r.producto,
      Cantidad:           r.cantidad,
      Unidad:             r.unidad,
      'Precio Unitario':  r.precio_unitario,
      Total:              r.total,
      'Estado de Pago':   r.estado_pago || 'pendiente',
      'Saldo Pendiente':  getSaldo(r),
      Notas:              r.notas || '',
    }))
    exportToCSV(data, `compras_${formatDateForFilename(new Date())}.csv`)
  }

  // ── Derivados ─────────────────────────────────────────────────────────────
  const comprasFiltradas = pagFilt ? compras.filter(r => r.estado_pago === pagFilt) : compras
  const totalGasto       = comprasFiltradas.reduce((s, r) => s + parseFloat(r.total || 0), 0)
  const totalPendiente   = comprasFiltradas
    .filter(r => (r.estado_pago || 'pendiente') !== 'pagado')
    .reduce((s, r) => s + getSaldo(r), 0)
  const { from, to } = getRange(periodo, desde, hasta)

  return (
    <div className="compras-section">

      {/* ── Header ── */}
      <div className="compras-header">
        <div>
          <p className="db-header-eyebrow">Gestión de insumos</p>
          <h2 className="compras-title">Compras</h2>
        </div>
        <div className="db-mode-toggle">
          {canWrite && (
            <button
              className={`db-mode-btn ${view === 'form' ? 'active' : ''}`}
              onClick={() => setView('form')}
            >
              + Nueva
            </button>
          )}
          <button
            className={`db-mode-btn ${view === 'historial' ? 'active' : ''}`}
            onClick={() => setView('historial')}
          >
            Historial
          </button>
        </div>
      </div>

      {/* ══════════════════════ FORM ══════════════════════ */}
      {view === 'form' && canWrite && (
        <div className="card">
          <div className="card-header">
            <span className="card-icon">🛒</span>
            <h2>Registrar Compra</h2>
          </div>

          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label>Finca *</label>
                <select name="finca_id" value={form.finca_id} onChange={handleChange} required>
                  <option value="">Seleccioná una finca</option>
                  {fincas.map(f => (
                    <option key={f.id} value={f.id}>{f.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Fecha *</label>
                <DateInput name="fecha" value={form.fecha} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label>Proveedor</label>
              <select name="proveedor_id" value={form.proveedor_id} onChange={handleChange}>
                <option value="">Sin proveedor / otro</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Producto *</label>
              <input
                type="text"
                name="producto"
                value={form.producto}
                onChange={handleChange}
                placeholder="Ej: Abono, Semillas, Fungicida..."
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Cantidad *</label>
                <input
                  type="number"
                  name="cantidad"
                  value={form.cantidad}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label>Unidad *</label>
                <select name="unidad" value={form.unidad} onChange={handleChange} required>
                  {UNIDADES_COMPRAS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Precio Unitario (₡) *</label>
              <input
                type="number"
                name="precio_unitario"
                value={form.precio_unitario}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>

            {totalPreview && (
              <div className="total-preview">
                <span>Total estimado:</span>
                <strong>₡{parseFloat(totalPreview).toLocaleString('es-CR')}</strong>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Fecha de vencimiento</label>
                <DateInput name="fecha_vencimiento" value={form.fecha_vencimiento} onChange={handleChange} />
              </div>
              <div className="form-group form-group-checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="pago_inmediato"
                    checked={form.pago_inmediato}
                    onChange={handleChange}
                  />
                  <span>Pagado al momento</span>
                </label>
                <p className="checkbox-hint">El pago se registrará automáticamente</p>
              </div>
            </div>

            <div className="form-group">
              <label>Notas</label>
              <textarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                placeholder="Observaciones opcionales..."
                rows={3}
              />
            </div>

            {formError && <p className="form-error">{formError}</p>}

            <button type="submit" className="btn-primary" disabled={formLoading}>
              {formLoading ? 'Guardando...' : 'Registrar Compra'}
            </button>
          </form>
        </div>
      )}

      {/* ══════════════════════ HISTORIAL ══════════════════════ */}
      {view === 'historial' && (
        <>
          {/* Filtros */}
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

            <div className="db-finca-bar" style={{ paddingTop: 8, paddingBottom: 0 }}>
              <span className="db-finca-label">Finca:</span>
              <div className="db-finca-pills">
                <button
                  className={`db-finca-pill ${fincaFilt === null ? 'active' : ''}`}
                  onClick={() => setFincaFilt(null)}
                >
                  Todas
                </button>
                {fincas.map(f => (
                  <button
                    key={f.id}
                    className={`db-finca-pill ${fincaFilt === f.id ? 'active' : ''}`}
                    onClick={() => setFincaFilt(f.id)}
                  >
                    {f.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro por estado de pago */}
            <div className="db-finca-bar" style={{ paddingTop: 6, paddingBottom: 0 }}>
              <span className="db-finca-label">Pago:</span>
              <div className="db-finca-pills">
                {PAGO_ESTADOS.map(p => (
                  <button
                    key={String(p.id)}
                    className={`db-finca-pill ${pagFilt === p.id ? 'active' : ''}`}
                    onClick={() => setPagFilt(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div className="reg-summary-bar">
            <span className="reg-range-label">{rangeLabel(from, to)}</span>
            <div className="reg-chips">
              <span className="reg-chip reg-chip-blue">
                🛒 {comprasFiltradas.length} compra{comprasFiltradas.length !== 1 ? 's' : ''}
              </span>
              {totalGasto > 0 && (
                <span className="reg-chip reg-chip-red">
                  💸 ₡{totalGasto.toLocaleString('es-CR')}
                </span>
              )}
              {totalPendiente > 0 && (
                <span className="reg-chip reg-chip-orange">
                  ⏳ Por pagar: ₡{Math.round(totalPendiente).toLocaleString('es-CR')}
                </span>
              )}
            </div>
          </div>

          {/* Tabla activas */}
          <div className="card registros-card">
            <div className="registros-header">
              <div className="registros-header-left">
                <span className="card-icon">🛒</span>
                <h3>Compras ({comprasFiltradas.length})</h3>
              </div>
              {comprasFiltradas.length > 0 && (
                <button className="btn-export" onClick={exportCompras}>↓ CSV</button>
              )}
            </div>

            {histLoading ? (
              <div className="loading-state">Cargando...</div>
            ) : comprasFiltradas.length === 0 ? (
              <p className="empty-state">No hay compras en este período.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Finca</th>
                      <th>Proveedor</th>
                      <th>Producto</th>
                      <th>Cant.</th>
                      <th>Unidad</th>
                      <th>Precio</th>
                      <th>Total</th>
                      <th>Pago</th>
                      <th>Hora</th>
                      {(canArchive || canDelete || canWrite) && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {comprasFiltradas.map(r => {
                      const saldo      = getSaldo(r)
                      const estadoPago = r.estado_pago || 'pendiente'
                      return (
                        <tr key={r.id}>
                          <td className="td-hora reg-td-fecha">
                            {fmtFecha(r.fecha)}
                            {r.fecha_vencimiento && (
                              <span className={`td-vencimiento ${r.fecha_vencimiento < today && estadoPago !== 'pagado' ? 'vencida' : ''}`}>
                                vence {fmtFecha(r.fecha_vencimiento)}
                              </span>
                            )}
                          </td>
                          <td className="td-producto">{r.fincas?.nombre || '—'}</td>
                          <td className="td-producto">{r.proveedores?.nombre || '—'}</td>
                          <td className="td-producto">{r.producto}</td>
                          <td className="td-number">{r.cantidad}</td>
                          <td>{r.unidad}</td>
                          <td className="td-number">₡{parseFloat(r.precio_unitario).toLocaleString('es-CR')}</td>
                          <td className="td-total">₡{parseFloat(r.total).toLocaleString('es-CR')}</td>
                          <td className="td-pago">
                            <PagoBadge estado={estadoPago} />
                            {estadoPago !== 'pagado' && saldo > 0 && (
                              <span className="td-saldo">₡{Math.round(saldo).toLocaleString('es-CR')}</span>
                            )}
                          </td>
                          <td className="td-hora">{fmtHora(r.created_at)}</td>
                          {(canArchive || canDelete || canWrite) && (
                            <td className="td-actions">
                              {canWrite && (
                                <button className="btn-action-pay" title="Gestionar pagos"
                                  onClick={() => setAbonoTarget(r)}>💳</button>
                              )}
                              {canArchive && (
                                <button className="btn-action-archive" title="Archivar"
                                  onClick={() => handleArchive(r.id)}>🗃️</button>
                              )}
                              {canDelete && (
                                <button className="btn-action-delete" title="Eliminar"
                                  onClick={() => setConfirmDel({ id: r.id, label: r.producto })}>🗑️</button>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={7} className="tf-label">Total del período:</td>
                      <td className="td-total tf-total">₡{totalGasto.toLocaleString('es-CR')}</td>
                      <td colSpan={2}></td>
                      {(canArchive || canDelete || canWrite) && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Archivados */}
          <div className="card registros-card archivados-section">
            <div className="registros-header">
              <div className="registros-header-left">
                <span className="card-icon">📦</span>
                <h3>
                  Archivados
                  {showArchivados && !loadingArch && ` (${archCompras.length})`}
                </h3>
              </div>
              <button className="btn-export" onClick={() => setShowArchivados(v => !v)}>
                {showArchivados ? 'Ocultar' : 'Ver archivados'}
              </button>
            </div>

            {showArchivados && (
              loadingArch ? (
                <div className="loading-state">Cargando archivados...</div>
              ) : archCompras.length === 0 ? (
                <p className="empty-state">No hay compras archivadas.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha</th><th>Finca</th><th>Proveedor</th>
                        <th>Producto</th><th>Total</th><th>Pago</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {archCompras.map(r => (
                        <tr key={r.id}>
                          <td className="td-hora">{fmtFecha(r.fecha)}</td>
                          <td>{r.fincas?.nombre || '—'}</td>
                          <td>{r.proveedores?.nombre || '—'}</td>
                          <td className="td-producto">{r.producto}</td>
                          <td className="td-total">₡{parseFloat(r.total).toLocaleString('es-CR')}</td>
                          <td><PagoBadge estado={r.estado_pago || 'pendiente'} /></td>
                          {(canArchive || canDelete) && (
                            <td className="td-actions">
                              {canArchive && (
                                <button className="btn-action-restore" title="Restaurar"
                                  onClick={() => handleRestore(r.id)}>↩</button>
                              )}
                              {canDelete && (
                                <button className="btn-action-delete" title="Eliminar permanentemente"
                                  onClick={() => setArchConfirmDel({ id: r.id, label: r.producto })}>🗑️</button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </>
      )}

      {/* ── Modales ── */}
      {abonoTarget && (
        <AbonoPagoModal
          compra={abonoTarget}
          session={session}
          canWrite={canWrite}
          onClose={() => setAbonoTarget(null)}
          onUpdated={() => { fetchData(); setAbonoTarget(null) }}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          message={`¿Seguro que desea eliminar la compra de "${confirmDel.label}"?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {archConfirmDel && (
        <ConfirmModal
          message={`¿Eliminar permanentemente la compra de "${archConfirmDel.label}"? Esta acción no se puede deshacer.`}
          onConfirm={handleArchDelete}
          onCancel={() => setArchConfirmDel(null)}
        />
      )}
    </div>
  )
}
