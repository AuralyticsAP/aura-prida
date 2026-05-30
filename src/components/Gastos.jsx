import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ConfirmModal from './ConfirmModal'
import { exportToCSV, formatDateForFilename } from '../lib/csv'
import DateInput from './DateInput'

const today = new Date().toISOString().split('T')[0]

const INIT_FORM = {
  finca_id:    '',
  categoria:   '',
  descripcion: '',
  monto:       '',
  proveedor:   '',
  fecha:       today,
  comprobante: '',
  notas:       '',
}

export const CATEGORIAS = [
  { value: 'combustible',   label: '⛽ Combustible'   },
  { value: 'fertilizantes', label: '🌱 Fertilizantes' },
  { value: 'herramientas',  label: '🔧 Herramientas'  },
  { value: 'salarios',      label: '👷 Salarios'       },
  { value: 'transporte',    label: '🚚 Transporte'     },
  { value: 'servicios',     label: '💡 Servicios'      },
  { value: 'otro',          label: '📌 Otro'           },
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

export function categoriaLabel(v) {
  return CATEGORIAS.find(c => c.value === v)?.label ?? v
}

export default function Gastos({ fincas = [], session, canWrite, canArchive, canDelete, showToast }) {
  const [view, setView] = useState(canWrite ? 'form' : 'historial')

  // ── Estado form ───────────────────────────────────────────────────────────
  const [form, setForm]               = useState(INIT_FORM)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError]     = useState(null)

  // ── Estado historial ──────────────────────────────────────────────────────
  const [gastos, setGastos]         = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [periodo, setPeriodo]         = useState('30dias')
  const [desde, setDesde]             = useState('')
  const [hasta, setHasta]             = useState('')
  const [fincaFilt, setFincaFilt]     = useState(null)
  const [catFilt, setCatFilt]         = useState(null)

  const [showArchivados, setShowArchivados] = useState(false)
  const [archGastos, setArchGastos]         = useState([])
  const [loadingArch, setLoadingArch]       = useState(false)

  const [confirmDel, setConfirmDel]         = useState(null)
  const [archConfirmDel, setArchConfirmDel] = useState(null)

  // ── Fetch historial ───────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setHistLoading(true)
    const { from, to } = getRange(periodo, desde, hasta)
    let q = supabase
      .from('gastos')
      .select('*, fincas(nombre)')
      .eq('estado', 'activo')
      .gte('fecha', from).lte('fecha', to)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (fincaFilt != null) q = q.eq('finca_id', fincaFilt)
    if (catFilt   != null) q = q.eq('categoria', catFilt)
    const { data } = await q
    setGastos(data || [])
    setHistLoading(false)
  }, [periodo, desde, hasta, fincaFilt, catFilt])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchArchivados = useCallback(async () => {
    setLoadingArch(true)
    const { data } = await supabase
      .from('gastos')
      .select('*, fincas(nombre)')
      .eq('estado', 'archivado')
      .order('fecha', { ascending: false })
    setArchGastos(data || [])
    setLoadingArch(false)
  }, [])

  useEffect(() => { if (showArchivados) fetchArchivados() }, [showArchivados, fetchArchivados])

  // ── Handlers form ─────────────────────────────────────────────────────────
  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setFormError(null)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.finca_id || !form.categoria || !form.descripcion || !form.monto || !form.fecha) {
      setFormError('Por favor completá todos los campos obligatorios.')
      return
    }
    setFormLoading(true)
    setFormError(null)

    const { error: dbError } = await supabase.from('gastos').insert([{
      finca_id:    parseInt(form.finca_id),
      categoria:   form.categoria,
      descripcion: form.descripcion,
      monto:       parseFloat(form.monto),
      proveedor:   form.proveedor   || null,
      fecha:       form.fecha,
      comprobante: form.comprobante || null,
      notas:       form.notas       || null,
      user_id:     session.user.id,
    }])

    setFormLoading(false)
    if (dbError) { setFormError('Error al guardar: ' + dbError.message); return }

    setForm(INIT_FORM)
    showToast?.('✅ Gasto registrado correctamente')
    setView('historial')
    fetchData()
  }

  // ── Handlers historial ────────────────────────────────────────────────────
  const handleArchive = async id => {
    await supabase.from('gastos').update({ estado: 'archivado' }).eq('id', id)
    fetchData()
  }

  const handleDelete = async () => {
    await supabase.from('gastos').delete().eq('id', confirmDel.id)
    setConfirmDel(null)
    fetchData()
  }

  const handleRestore = async id => {
    await supabase.from('gastos').update({ estado: 'activo' }).eq('id', id)
    fetchArchivados()
  }

  const handleArchDelete = async () => {
    await supabase.from('gastos').delete().eq('id', archConfirmDel.id)
    setArchConfirmDel(null)
    fetchArchivados()
  }

  const exportGastos = () => {
    const data = gastos.map(r => ({
      Fecha:        r.fecha,
      Finca:        r.fincas?.nombre || '',
      Categoría:    categoriaLabel(r.categoria),
      Descripción:  r.descripcion,
      Proveedor:    r.proveedor   || '',
      Comprobante:  r.comprobante || '',
      Monto:        r.monto,
      Notas:        r.notas || '',
    }))
    exportToCSV(data, `gastos_${formatDateForFilename(new Date())}.csv`)
  }

  const { from, to } = getRange(periodo, desde, hasta)
  const totalGastos = gastos.reduce((s, r) => s + parseFloat(r.monto || 0), 0)

  // Resumen por categoría en el período filtrado
  const porCategoria = CATEGORIAS.map(c => ({
    ...c,
    total: gastos.filter(r => r.categoria === c.value).reduce((s, r) => s + parseFloat(r.monto || 0), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div className="compras-section">

      {/* ── Header ── */}
      <div className="compras-header">
        <div>
          <p className="db-header-eyebrow">Control financiero</p>
          <h2 className="compras-title">Gastos</h2>
        </div>
        <div className="db-mode-toggle">
          {canWrite && (
            <button
              className={`db-mode-btn ${view === 'form' ? 'active' : ''}`}
              onClick={() => setView('form')}
            >
              + Nuevo
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
            <span className="card-icon">💸</span>
            <h2>Registrar Gasto</h2>
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
              <label>Categoría *</label>
              <select name="categoria" value={form.categoria} onChange={handleChange} required>
                <option value="">Seleccioná una categoría</option>
                {CATEGORIAS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Descripción del gasto *</label>
              <input
                type="text"
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Ej: Compra de abono foliar, Pago de planilla semana 1..."
                required
              />
            </div>

            <div className="form-group">
              <label>Monto (₡) *</label>
              <input
                type="number"
                name="monto"
                value={form.monto}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>

            {form.monto && parseFloat(form.monto) > 0 && (
              <div className="total-preview total-preview-danger">
                <span>Monto a registrar:</span>
                <strong>₡{parseFloat(form.monto).toLocaleString('es-CR')}</strong>
              </div>
            )}

            <div className="form-group">
              <label>Proveedor / Pagado a</label>
              <input
                type="text"
                name="proveedor"
                value={form.proveedor}
                onChange={handleChange}
                placeholder="Nombre del proveedor o persona pagada"
              />
            </div>

            <div className="form-group">
              <label>N° de comprobante / factura</label>
              <input
                type="text"
                name="comprobante"
                value={form.comprobante}
                onChange={handleChange}
                placeholder="Ej: 001-123456"
              />
            </div>

            <div className="form-group">
              <label>Notas</label>
              <textarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
            </div>

            {formError && <p className="form-error">{formError}</p>}

            <button type="submit" className="btn-primary" disabled={formLoading}>
              {formLoading ? 'Guardando...' : 'Registrar Gasto'}
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

            <div className="db-finca-bar" style={{ paddingTop: 4, paddingBottom: 0 }}>
              <span className="db-finca-label">Categoría:</span>
              <div className="db-finca-pills">
                <button
                  className={`db-finca-pill ${catFilt === null ? 'active' : ''}`}
                  onClick={() => setCatFilt(null)}
                >
                  Todas
                </button>
                {CATEGORIAS.map(c => (
                  <button
                    key={c.value}
                    className={`db-finca-pill ${catFilt === c.value ? 'active' : ''}`}
                    onClick={() => setCatFilt(c.value)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resumen del período */}
          <div className="reg-summary-bar">
            <span className="reg-range-label">{rangeLabel(from, to)}</span>
            <div className="reg-chips">
              <span className="reg-chip reg-chip-blue">
                💸 {gastos.length} gasto{gastos.length !== 1 ? 's' : ''}
              </span>
              {totalGastos > 0 && (
                <span className="reg-chip reg-chip-red">
                  ₡{totalGastos.toLocaleString('es-CR')} total
                </span>
              )}
            </div>
          </div>

          {/* Desglose por categoría */}
          {porCategoria.length > 0 && (
            <div className="card gastos-breakdown-card">
              <div className="gastos-breakdown-title">Desglose por categoría</div>
              <div className="gastos-breakdown-list">
                {porCategoria.map(c => {
                  const pct = totalGastos > 0 ? Math.round((c.total / totalGastos) * 100) : 0
                  return (
                    <div key={c.value} className="gastos-breakdown-row">
                      <span className="gastos-breakdown-label">{c.label}</span>
                      <div className="gastos-breakdown-bar-wrap">
                        <div className="gastos-breakdown-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="gastos-breakdown-pct">{pct}%</span>
                      <span className="gastos-breakdown-monto">₡{Math.round(c.total).toLocaleString('es-CR')}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tabla activos */}
          <div className="card registros-card">
            <div className="registros-header">
              <div className="registros-header-left">
                <span className="card-icon">💸</span>
                <h3>Gastos ({gastos.length})</h3>
              </div>
              {gastos.length > 0 && (
                <button className="btn-export" onClick={exportGastos}>↓ CSV</button>
              )}
            </div>

            {histLoading ? (
              <div className="loading-state">Cargando...</div>
            ) : gastos.length === 0 ? (
              <p className="empty-state">No hay gastos registrados en este período.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Finca</th>
                      <th>Categoría</th>
                      <th>Descripción</th>
                      <th>Proveedor</th>
                      <th>Comprobante</th>
                      <th>Monto</th>
                      <th>Hora</th>
                      {(canArchive || canDelete) && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {gastos.map(r => (
                      <tr key={r.id}>
                        <td className="td-hora reg-td-fecha">{fmtFecha(r.fecha)}</td>
                        <td className="td-producto">{r.fincas?.nombre || '—'}</td>
                        <td><span className="gasto-cat-badge">{categoriaLabel(r.categoria)}</span></td>
                        <td className="td-producto" style={{ maxWidth: 200 }}>{r.descripcion}</td>
                        <td className="td-notas">{r.proveedor || '—'}</td>
                        <td className="td-notas">{r.comprobante || '—'}</td>
                        <td className="td-total td-total-danger">₡{parseFloat(r.monto).toLocaleString('es-CR')}</td>
                        <td className="td-hora">{fmtHora(r.created_at)}</td>
                        {(canArchive || canDelete) && (
                          <td className="td-actions">
                            {canArchive && (
                              <button className="btn-action-archive" title="Archivar"
                                onClick={() => handleArchive(r.id)}>🗃️</button>
                            )}
                            {canDelete && (
                              <button className="btn-action-delete" title="Eliminar"
                                onClick={() => setConfirmDel({ id: r.id, label: r.descripcion })}>🗑️</button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} className="tf-label">Total del período:</td>
                      <td className="td-total tf-total" style={{ color: '#f87171' }}>
                        ₡{totalGastos.toLocaleString('es-CR')}
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
                  {showArchivados && !loadingArch && ` (${archGastos.length})`}
                </h3>
              </div>
              <button className="btn-export" onClick={() => setShowArchivados(v => !v)}>
                {showArchivados ? 'Ocultar' : 'Ver archivados'}
              </button>
            </div>

            {showArchivados && (
              loadingArch ? (
                <div className="loading-state">Cargando archivados...</div>
              ) : archGastos.length === 0 ? (
                <p className="empty-state">No hay gastos archivados.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha</th><th>Finca</th><th>Categoría</th>
                        <th>Descripción</th><th>Monto</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {archGastos.map(r => (
                        <tr key={r.id}>
                          <td className="td-hora">{fmtFecha(r.fecha)}</td>
                          <td>{r.fincas?.nombre || '—'}</td>
                          <td><span className="gasto-cat-badge">{categoriaLabel(r.categoria)}</span></td>
                          <td className="td-producto">{r.descripcion}</td>
                          <td className="td-total td-total-danger">₡{parseFloat(r.monto).toLocaleString('es-CR')}</td>
                          {(canArchive || canDelete) && (
                            <td className="td-actions">
                              {canArchive && (
                                <button className="btn-action-restore" title="Restaurar"
                                  onClick={() => handleRestore(r.id)}>↩</button>
                              )}
                              {canDelete && (
                                <button className="btn-action-delete" title="Eliminar permanentemente"
                                  onClick={() => setArchConfirmDel({ id: r.id, label: r.descripcion })}>🗑️</button>
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
          message={`¿Seguro que desea eliminar el gasto "${confirmDel.label}"?`}
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
