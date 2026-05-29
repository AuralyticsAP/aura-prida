import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ConfirmModal from './ConfirmModal'
import { exportToCSV, formatDateForFilename } from '../lib/csv'

const today = new Date().toISOString().split('T')[0]

const INIT_FORM = {
  finca_id:          '',
  fecha:             today,
  cantidad_personas: '',
  tipo_labor:        '',
  notas:             '',
}

const TIPOS_LABOR = [
  { value: 'cosecha',       label: '🌿 Cosecha'       },
  { value: 'siembra',       label: '🌱 Siembra'       },
  { value: 'mantenimiento', label: '🔧 Mantenimiento' },
  { value: 'empaque',       label: '📦 Empaque'       },
  { value: 'otro',          label: '📌 Otro'          },
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

function laborLabel(v) {
  return TIPOS_LABOR.find(t => t.value === v)?.label ?? v
}

export default function Personal({ fincas = [], session, canWrite, canArchive, canDelete, showToast }) {
  const [view, setView] = useState(canWrite ? 'form' : 'historial')

  // ── Estado form ───────────────────────────────────────────────────────────
  const [form, setForm]               = useState(INIT_FORM)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError]     = useState(null)

  // ── Estado historial ──────────────────────────────────────────────────────
  const [registros, setRegistros]     = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [periodo, setPeriodo]         = useState('30dias')
  const [desde, setDesde]             = useState('')
  const [hasta, setHasta]             = useState('')
  const [fincaFilt, setFincaFilt]     = useState(null)

  const [showArchivados, setShowArchivados] = useState(false)
  const [archReg, setArchReg]               = useState([])
  const [loadingArch, setLoadingArch]       = useState(false)

  const [confirmDel, setConfirmDel]         = useState(null)
  const [archConfirmDel, setArchConfirmDel] = useState(null)

  // ── Fetch historial ───────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setHistLoading(true)
    const { from, to } = getRange(periodo, desde, hasta)
    let q = supabase
      .from('personal_diario')
      .select('*, fincas(nombre)')
      .eq('estado', 'activo')
      .gte('fecha', from).lte('fecha', to)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (fincaFilt != null) q = q.eq('finca_id', fincaFilt)
    const { data } = await q
    setRegistros(data || [])
    setHistLoading(false)
  }, [periodo, desde, hasta, fincaFilt])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchArchivados = useCallback(async () => {
    setLoadingArch(true)
    const { data } = await supabase
      .from('personal_diario')
      .select('*, fincas(nombre)')
      .eq('estado', 'archivado')
      .order('fecha', { ascending: false })
    setArchReg(data || [])
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
    if (!form.finca_id || !form.fecha || !form.cantidad_personas || !form.tipo_labor) {
      setFormError('Por favor completá todos los campos obligatorios.')
      return
    }
    setFormLoading(true)
    setFormError(null)

    const { error: dbError } = await supabase.from('personal_diario').insert([{
      finca_id:          parseInt(form.finca_id),
      fecha:             form.fecha,
      cantidad_personas: parseInt(form.cantidad_personas),
      tipo_labor:        form.tipo_labor,
      notas:             form.notas || null,
      user_id:           session.user.id,
    }])

    setFormLoading(false)
    if (dbError) { setFormError('Error al guardar: ' + dbError.message); return }

    setForm(INIT_FORM)
    showToast?.('✅ Registro de personal guardado')
    setView('historial')
    fetchData()
  }

  // ── Handlers historial ────────────────────────────────────────────────────
  const handleArchive = async id => {
    await supabase.from('personal_diario').update({ estado: 'archivado' }).eq('id', id)
    fetchData()
  }

  const handleDelete = async () => {
    await supabase.from('personal_diario').delete().eq('id', confirmDel.id)
    setConfirmDel(null)
    fetchData()
  }

  const handleRestore = async id => {
    await supabase.from('personal_diario').update({ estado: 'activo' }).eq('id', id)
    fetchArchivados()
  }

  const handleArchDelete = async () => {
    await supabase.from('personal_diario').delete().eq('id', archConfirmDel.id)
    setArchConfirmDel(null)
    fetchArchivados()
  }

  const exportPersonal = () => {
    const data = registros.map(r => ({
      Fecha:              r.fecha,
      Finca:              r.fincas?.nombre || '',
      'Tipo de labor':    laborLabel(r.tipo_labor),
      'Cantidad personas': r.cantidad_personas,
      Notas:              r.notas || '',
    }))
    exportToCSV(data, `personal_${formatDateForFilename(new Date())}.csv`)
  }

  const { from, to } = getRange(periodo, desde, hasta)
  const totalPersonas    = registros.reduce((s, r) => s + (r.cantidad_personas || 0), 0)
  const totalJornadas    = registros.length

  return (
    <div className="compras-section">

      {/* ── Header ── */}
      <div className="compras-header">
        <div>
          <p className="db-header-eyebrow">Gestión de campo</p>
          <h2 className="compras-title">Personal por Finca</h2>
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
            <span className="card-icon">👷</span>
            <h2>Registrar Personal del Día</h2>
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
              <label>Tipo de labor *</label>
              <select name="tipo_labor" value={form.tipo_labor} onChange={handleChange} required>
                <option value="">Seleccioná el tipo de labor</option>
                {TIPOS_LABOR.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Cantidad de personas *</label>
              <input
                type="number"
                name="cantidad_personas"
                value={form.cantidad_personas}
                onChange={handleChange}
                placeholder="0"
                min="1"
                step="1"
                required
              />
            </div>

            {form.cantidad_personas && parseInt(form.cantidad_personas) > 0 && (
              <div className="total-preview">
                <span>Personas registradas:</span>
                <strong>{parseInt(form.cantidad_personas)} persona{parseInt(form.cantidad_personas) !== 1 ? 's' : ''}</strong>
              </div>
            )}

            <div className="form-group">
              <label>Notas</label>
              <textarea
                name="notas"
                value={form.notas}
                onChange={handleChange}
                placeholder="Observaciones del día, tareas específicas..."
                rows={3}
              />
            </div>

            {formError && <p className="form-error">{formError}</p>}

            <button type="submit" className="btn-primary" disabled={formLoading}>
              {formLoading ? 'Guardando...' : 'Registrar Personal'}
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
                👷 {totalJornadas} jornada{totalJornadas !== 1 ? 's' : ''}
              </span>
              {totalPersonas > 0 && (
                <span className="reg-chip reg-chip-amber">
                  👥 {totalPersonas} persona-día
                </span>
              )}
            </div>
          </div>

          {/* Tabla activos */}
          <div className="card registros-card">
            <div className="registros-header">
              <div className="registros-header-left">
                <span className="card-icon">👷</span>
                <h3>Registros ({registros.length})</h3>
              </div>
              {registros.length > 0 && (
                <button className="btn-export" onClick={exportPersonal}>↓ CSV</button>
              )}
            </div>

            {histLoading ? (
              <div className="loading-state">Cargando...</div>
            ) : registros.length === 0 ? (
              <p className="empty-state">No hay registros de personal en este período.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Finca</th>
                      <th>Tipo de labor</th>
                      <th>Personas</th>
                      <th>Notas</th>
                      <th>Hora</th>
                      {(canArchive || canDelete) && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map(r => (
                      <tr key={r.id}>
                        <td className="td-hora reg-td-fecha">{fmtFecha(r.fecha)}</td>
                        <td className="td-producto">{r.fincas?.nombre || '—'}</td>
                        <td><span className="merma-motivo-badge">{laborLabel(r.tipo_labor)}</span></td>
                        <td className="td-number">
                          <span className="personal-cantidad-badge">{r.cantidad_personas}</span>
                        </td>
                        <td className="td-notas">{r.notas || '—'}</td>
                        <td className="td-hora">{fmtHora(r.created_at)}</td>
                        {(canArchive || canDelete) && (
                          <td className="td-actions">
                            {canArchive && (
                              <button className="btn-action-archive" title="Archivar"
                                onClick={() => handleArchive(r.id)}>🗃️</button>
                            )}
                            {canDelete && (
                              <button className="btn-action-delete" title="Eliminar"
                                onClick={() => setConfirmDel({
                                  id: r.id,
                                  label: `${laborLabel(r.tipo_labor)} — ${fmtFecha(r.fecha)}`,
                                })}>🗑️</button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="tf-label">Total persona-día en el período:</td>
                      <td className="td-total tf-total">{totalPersonas}</td>
                      <td colSpan={2}></td>
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
                  {showArchivados && !loadingArch && ` (${archReg.length})`}
                </h3>
              </div>
              <button className="btn-export" onClick={() => setShowArchivados(v => !v)}>
                {showArchivados ? 'Ocultar' : 'Ver archivados'}
              </button>
            </div>

            {showArchivados && (
              loadingArch ? (
                <div className="loading-state">Cargando archivados...</div>
              ) : archReg.length === 0 ? (
                <p className="empty-state">No hay registros archivados.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha</th><th>Finca</th><th>Labor</th><th>Personas</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {archReg.map(r => (
                        <tr key={r.id}>
                          <td className="td-hora">{fmtFecha(r.fecha)}</td>
                          <td>{r.fincas?.nombre || '—'}</td>
                          <td><span className="merma-motivo-badge">{laborLabel(r.tipo_labor)}</span></td>
                          <td className="td-number">{r.cantidad_personas}</td>
                          {(canArchive || canDelete) && (
                            <td className="td-actions">
                              {canArchive && (
                                <button className="btn-action-restore" title="Restaurar"
                                  onClick={() => handleRestore(r.id)}>↩</button>
                              )}
                              {canDelete && (
                                <button className="btn-action-delete" title="Eliminar permanentemente"
                                  onClick={() => setArchConfirmDel({
                                    id: r.id,
                                    label: `${laborLabel(r.tipo_labor)} — ${fmtFecha(r.fecha)}`,
                                  })}>🗑️</button>
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
          message={`¿Seguro que desea eliminar el registro "${confirmDel.label}"?`}
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
