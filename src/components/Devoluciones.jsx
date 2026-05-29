import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { UNIDADES } from '../lib/constants'
import ConfirmModal from './ConfirmModal'
import { exportToCSV, formatDateForFilename } from '../lib/csv'

const today = new Date().toISOString().split('T')[0]

const INIT_FORM = {
  finca_id:         '',
  cliente:          '',
  producto:         '',
  cantidad:         '',
  unidad:           'kg',
  motivo:           '',
  puede_revenderse: '',
  precio_unitario:  '',
  fecha:            today,
  notas:            '',
}

const MOTIVOS = [
  { value: 'danio',   label: '🔴 Producto dañado'  },
  { value: 'exceso',  label: '📦 Exceso de pedido'  },
  { value: 'calidad', label: '⭐ Calidad'            },
  { value: 'otro',    label: '📌 Otro'               },
]

const PERIODOS = [
  { id: 'hoy',    label: 'Hoy'    },
  { id: 'ayer',   label: 'Ayer'   },
  { id: '7dias',  label: '7 días' },
  { id: '30dias', label: '30 días'},
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

function motivoLabel(v) {
  return MOTIVOS.find(m => m.value === v)?.label ?? v
}

export default function Devoluciones({ fincas = [], session, canWrite, canArchive, canDelete, showToast }) {
  const [view, setView] = useState(canWrite ? 'form' : 'historial')

  // ── Catálogos ──────────────────────────────────────────────────────────────
  const [clientes,  setClientes]  = useState([])
  const [productos, setProductos] = useState([])

  useEffect(() => {
    supabase.from('clientes').select('nombre').eq('activo', true).order('orden', { ascending: true })
      .then(({ data }) => setClientes((data || []).map(c => c.nombre)))
    supabase.from('productos').select('nombre').eq('activo', true).order('orden', { ascending: true })
      .then(({ data }) => setProductos((data || []).map(p => p.nombre)))
  }, [])

  // ── Estado form ───────────────────────────────────────────────────────────
  const [form, setForm]               = useState(INIT_FORM)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError]     = useState(null)

  // ── Estado historial ──────────────────────────────────────────────────────
  const [devoluciones, setDevoluciones] = useState([])
  const [histLoading, setHistLoading]   = useState(false)
  const [periodo, setPeriodo]           = useState('30dias')
  const [desde, setDesde]               = useState('')
  const [hasta, setHasta]               = useState('')
  const [fincaFilt, setFincaFilt]       = useState(null)

  const [showArchivados, setShowArchivados] = useState(false)
  const [archDev, setArchDev]               = useState([])
  const [loadingArch, setLoadingArch]       = useState(false)

  const [confirmDel, setConfirmDel]         = useState(null)
  const [archConfirmDel, setArchConfirmDel] = useState(null)

  // ── Fetch historial ───────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setHistLoading(true)
    const { from, to } = getRange(periodo, desde, hasta)
    let q = supabase
      .from('devoluciones')
      .select('*, fincas(nombre)')
      .eq('estado', 'activo')
      .gte('fecha', from).lte('fecha', to)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (fincaFilt != null) q = q.eq('finca_id', fincaFilt)
    const { data } = await q
    setDevoluciones(data || [])
    setHistLoading(false)
  }, [periodo, desde, hasta, fincaFilt])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchArchivados = useCallback(async () => {
    setLoadingArch(true)
    const { data } = await supabase
      .from('devoluciones')
      .select('*, fincas(nombre)')
      .eq('estado', 'archivado')
      .order('fecha', { ascending: false })
    setArchDev(data || [])
    setLoadingArch(false)
  }, [])

  useEffect(() => { if (showArchivados) fetchArchivados() }, [showArchivados, fetchArchivados])

  // ── Handlers form ─────────────────────────────────────────────────────────
  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setFormError(null)
  }

  const totalPreview = form.cantidad && form.precio_unitario
    ? (parseFloat(form.cantidad) * parseFloat(form.precio_unitario)).toFixed(2)
    : null

  const handleSubmit = async e => {
    e.preventDefault()
    if (
      !form.finca_id || !form.cliente || !form.producto ||
      !form.cantidad || !form.unidad || !form.motivo ||
      form.puede_revenderse === '' || !form.precio_unitario || !form.fecha
    ) {
      setFormError('Por favor completá todos los campos obligatorios.')
      return
    }
    setFormLoading(true)
    setFormError(null)

    const { error: dbError } = await supabase.from('devoluciones').insert([{
      finca_id:         parseInt(form.finca_id),
      cliente:          form.cliente,
      producto:         form.producto,
      cantidad:         parseFloat(form.cantidad),
      unidad:           form.unidad,
      motivo:           form.motivo,
      puede_revenderse: form.puede_revenderse === 'true',
      precio_unitario:  parseFloat(form.precio_unitario),
      total:            parseFloat(totalPreview),
      fecha:            form.fecha,
      notas:            form.notas || null,
      user_id:          session.user.id,
    }])

    setFormLoading(false)
    if (dbError) { setFormError('Error al guardar: ' + dbError.message); return }

    setForm(INIT_FORM)
    showToast?.('✅ Devolución registrada correctamente')
    setView('historial')
    fetchData()
  }

  // ── Handlers historial ────────────────────────────────────────────────────
  const handleArchive = async id => {
    await supabase.from('devoluciones').update({ estado: 'archivado' }).eq('id', id)
    fetchData()
  }

  const handleDelete = async () => {
    await supabase.from('devoluciones').delete().eq('id', confirmDel.id)
    setConfirmDel(null)
    fetchData()
  }

  const handleRestore = async id => {
    await supabase.from('devoluciones').update({ estado: 'activo' }).eq('id', id)
    fetchArchivados()
  }

  const handleArchDelete = async () => {
    await supabase.from('devoluciones').delete().eq('id', archConfirmDel.id)
    setArchConfirmDel(null)
    fetchArchivados()
  }

  const exportDevoluciones = () => {
    const data = devoluciones.map(r => ({
      Fecha:               r.fecha,
      Finca:               r.fincas?.nombre || '',
      Cliente:             r.cliente,
      Producto:            r.producto,
      Cantidad:            r.cantidad,
      Unidad:              r.unidad,
      Motivo:              r.motivo,
      'Puede revenderse':  r.puede_revenderse ? 'Sí' : 'No',
      'Precio Unitario':   r.precio_unitario,
      Total:               r.total,
      Notas:               r.notas || '',
    }))
    exportToCSV(data, `devoluciones_${formatDateForFilename(new Date())}.csv`)
  }

  const { from, to } = getRange(periodo, desde, hasta)
  const totalPerdida   = devoluciones.filter(r => !r.puede_revenderse).reduce((s, r) => s + parseFloat(r.total || 0), 0)
  const totalReingreso = devoluciones.filter(r =>  r.puede_revenderse).reduce((s, r) => s + parseFloat(r.total || 0), 0)
  const countPerdida   = devoluciones.filter(r => !r.puede_revenderse).length
  const countReingreso = devoluciones.filter(r =>  r.puede_revenderse).length

  return (
    <div className="compras-section">

      {/* ── Header ── */}
      <div className="compras-header">
        <div>
          <p className="db-header-eyebrow">Control de calidad</p>
          <h2 className="compras-title">Devoluciones</h2>
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
            <span className="card-icon">↩️</span>
            <h2>Registrar Devolución</h2>
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
                <input type="date" name="fecha" value={form.fecha} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label>Cliente que devuelve *</label>
              <select name="cliente" value={form.cliente} onChange={handleChange} required>
                <option value="">Seleccioná un cliente</option>
                {clientes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Producto devuelto *</label>
              <select name="producto" value={form.producto} onChange={handleChange} required>
                <option value="">Seleccioná un producto</option>
                {productos.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
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
                  {UNIDADES.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Motivo de devolución *</label>
              <select name="motivo" value={form.motivo} onChange={handleChange} required>
                <option value="">Seleccioná un motivo</option>
                {MOTIVOS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>¿Se puede vender de nuevo? *</label>
              <select name="puede_revenderse" value={form.puede_revenderse} onChange={handleChange} required>
                <option value="">Seleccioná una opción</option>
                <option value="true">✅ Sí — vuelve al inventario</option>
                <option value="false">❌ No — se registra como pérdida</option>
              </select>
            </div>

            <div className="form-group">
              <label>Precio unitario original (₡) *</label>
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
              <div className={`total-preview ${form.puede_revenderse === 'false' ? 'total-preview-danger' : ''}`}>
                <span>
                  {form.puede_revenderse === 'true'
                    ? 'Valor que vuelve al inventario:'
                    : form.puede_revenderse === 'false'
                    ? 'Pérdida estimada:'
                    : 'Valor total:'}
                </span>
                <strong>₡{parseFloat(totalPreview).toLocaleString('es-CR')}</strong>
              </div>
            )}

            <div className="form-group">
              <label>Notas</label>
              <textarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                placeholder="Descripción adicional de la devolución..."
                rows={3}
              />
            </div>

            {formError && <p className="form-error">{formError}</p>}

            <button type="submit" className="btn-primary" disabled={formLoading}>
              {formLoading ? 'Guardando...' : 'Registrar Devolución'}
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
                  <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Hasta</label>
                  <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
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
          </div>

          {/* Resumen */}
          <div className="reg-summary-bar">
            <span className="reg-range-label">{rangeLabel(from, to)}</span>
            <div className="reg-chips">
              <span className="reg-chip reg-chip-blue">
                ↩️ {devoluciones.length} devolución{devoluciones.length !== 1 ? 'es' : ''}
              </span>
              {countReingreso > 0 && (
                <span className="reg-chip reg-chip-green">
                  ✅ {countReingreso} al inventario · ₡{totalReingreso.toLocaleString('es-CR')}
                </span>
              )}
              {countPerdida > 0 && (
                <span className="reg-chip reg-chip-red">
                  ❌ {countPerdida} pérdida · ₡{totalPerdida.toLocaleString('es-CR')}
                </span>
              )}
            </div>
          </div>

          {/* Tabla activas */}
          <div className="card registros-card">
            <div className="registros-header">
              <div className="registros-header-left">
                <span className="card-icon">↩️</span>
                <h3>Devoluciones ({devoluciones.length})</h3>
              </div>
              {devoluciones.length > 0 && (
                <button className="btn-export" onClick={exportDevoluciones}>↓ CSV</button>
              )}
            </div>

            {histLoading ? (
              <div className="loading-state">Cargando...</div>
            ) : devoluciones.length === 0 ? (
              <p className="empty-state">No hay devoluciones en este período.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Finca</th>
                      <th>Cliente</th>
                      <th>Producto</th>
                      <th>Cant.</th>
                      <th>Motivo</th>
                      <th>¿Revender?</th>
                      <th>Total</th>
                      <th>Hora</th>
                      {(canArchive || canDelete) && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {devoluciones.map(r => (
                      <tr key={r.id}>
                        <td className="td-hora reg-td-fecha">{fmtFecha(r.fecha)}</td>
                        <td className="td-producto">{r.fincas?.nombre || '—'}</td>
                        <td className="td-producto">{r.cliente}</td>
                        <td className="td-producto">{r.producto}</td>
                        <td className="td-number">{r.cantidad} {r.unidad}</td>
                        <td><span className="merma-motivo-badge">{motivoLabel(r.motivo)}</span></td>
                        <td>
                          {r.puede_revenderse
                            ? <span className="dev-badge dev-badge-si">✅ Sí</span>
                            : <span className="dev-badge dev-badge-no">❌ Pérdida</span>
                          }
                        </td>
                        <td className={`td-total ${!r.puede_revenderse ? 'td-total-danger' : ''}`}>
                          ₡{parseFloat(r.total).toLocaleString('es-CR')}
                        </td>
                        <td className="td-hora">{fmtHora(r.created_at)}</td>
                        {(canArchive || canDelete) && (
                          <td className="td-actions">
                            {canArchive && (
                              <button className="btn-action-archive" title="Archivar"
                                onClick={() => handleArchive(r.id)}>🗃️</button>
                            )}
                            {canDelete && (
                              <button className="btn-action-delete" title="Eliminar"
                                onClick={() => setConfirmDel({ id: r.id, label: `${r.producto} de ${r.cliente}` })}>🗑️</button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} className="tf-label">
                        Pérdida neta del período:
                      </td>
                      <td colSpan={2} className="td-total tf-total" style={{ color: totalPerdida > 0 ? '#f87171' : undefined }}>
                        ₡{totalPerdida.toLocaleString('es-CR')}
                      </td>
                      <td></td>
                      {(canArchive || canDelete) && <td></td>}
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
                  {showArchivados && !loadingArch && ` (${archDev.length})`}
                </h3>
              </div>
              <button className="btn-export" onClick={() => setShowArchivados(v => !v)}>
                {showArchivados ? 'Ocultar' : 'Ver archivados'}
              </button>
            </div>

            {showArchivados && (
              loadingArch ? (
                <div className="loading-state">Cargando archivados...</div>
              ) : archDev.length === 0 ? (
                <p className="empty-state">No hay devoluciones archivadas.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha</th><th>Finca</th><th>Cliente</th>
                        <th>Producto</th><th>¿Revender?</th><th>Total</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {archDev.map(r => (
                        <tr key={r.id}>
                          <td className="td-hora">{fmtFecha(r.fecha)}</td>
                          <td>{r.fincas?.nombre || '—'}</td>
                          <td>{r.cliente}</td>
                          <td className="td-producto">{r.producto}</td>
                          <td>
                            {r.puede_revenderse
                              ? <span className="dev-badge dev-badge-si">✅ Sí</span>
                              : <span className="dev-badge dev-badge-no">❌ Pérdida</span>
                            }
                          </td>
                          <td className="td-total">₡{parseFloat(r.total).toLocaleString('es-CR')}</td>
                          {(canArchive || canDelete) && (
                            <td className="td-actions">
                              {canArchive && (
                                <button className="btn-action-restore" title="Restaurar"
                                  onClick={() => handleRestore(r.id)}>↩</button>
                              )}
                              {canDelete && (
                                <button className="btn-action-delete" title="Eliminar permanentemente"
                                  onClick={() => setArchConfirmDel({ id: r.id, label: `${r.producto} de ${r.cliente}` })}>🗑️</button>
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

      {confirmDel && (
        <ConfirmModal
          message={`¿Seguro que desea eliminar la devolución de "${confirmDel.label}"?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {archConfirmDel && (
        <ConfirmModal
          message={`¿Eliminar permanentemente la devolución de "${archConfirmDel.label}"? Esta acción no se puede deshacer.`}
          onConfirm={handleArchDelete}
          onCancel={() => setArchConfirmDel(null)}
        />
      )}
    </div>
  )
}
