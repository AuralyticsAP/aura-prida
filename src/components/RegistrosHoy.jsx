import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { exportToCSV, formatDateForFilename } from '../lib/csv'
import ConfirmModal from './ConfirmModal'

export default function RegistrosHoy({ cosechas, ventas, loading, onArchive, onDelete, onRefresh }) {
  const today = new Date().toLocaleDateString('es-CR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const [showArchivados, setShowArchivados] = useState(false)
  const [archCosechas, setArchCosechas] = useState([])
  const [archVentas, setArchVentas] = useState([])
  const [loadingArch, setLoadingArch] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [archConfirmDel, setArchConfirmDel] = useState(null)

  const fetchArchivados = useCallback(async () => {
    setLoadingArch(true)
    const [{ data: c }, { data: v }] = await Promise.all([
      supabase.from('cosechas').select('*').eq('estado', 'archivado').order('created_at', { ascending: false }),
      supabase.from('ventas').select('*').eq('estado', 'archivado').order('created_at', { ascending: false }),
    ])
    setArchCosechas(c || [])
    setArchVentas(v || [])
    setLoadingArch(false)
  }, [])

  useEffect(() => {
    if (showArchivados) fetchArchivados()
  }, [showArchivados, fetchArchivados])

  const handleRestore = async (tabla, id) => {
    await supabase.from(tabla).update({ estado: 'activo' }).eq('id', id)
    fetchArchivados()
    onRefresh()
  }

  const handleArchDelete = async () => {
    const { tabla, id } = archConfirmDel
    await supabase.from(tabla).delete().eq('id', id)
    setArchConfirmDel(null)
    fetchArchivados()
  }

  const handleExportCosechas = () => {
    const data = cosechas.map(r => ({
      Fecha: r.fecha,
      Producto: r.producto,
      Cantidad: r.cantidad,
      Unidad: r.unidad,
      Notas: r.notas || '',
      'Registrado a las': new Date(r.created_at).toLocaleTimeString('es-CR'),
    }))
    exportToCSV(data, `cosechas_${formatDateForFilename(new Date())}.csv`)
  }

  const handleExportVentas = () => {
    const data = ventas.map(r => ({
      Fecha: r.fecha,
      Producto: r.producto,
      Cantidad: r.cantidad,
      Unidad: r.unidad,
      Cliente: r.nombre_cliente,
      'Precio Unitario': r.precio_unitario,
      Total: r.total,
      Notas: r.notas || '',
      'Registrado a las': new Date(r.created_at).toLocaleTimeString('es-CR'),
    }))
    exportToCSV(data, `ventas_${formatDateForFilename(new Date())}.csv`)
  }

  const totalArchivados = archCosechas.length + archVentas.length

  if (loading) {
    return (
      <div className="card registros-card">
        <div className="loading-state">Cargando registros...</div>
      </div>
    )
  }

  return (
    <div className="registros-section">
      <div className="section-title">
        <h2>Registros de Hoy</h2>
        <p className="section-date">{today}</p>
      </div>

      {/* Cosechas activas */}
      <div className="card registros-card">
        <div className="registros-header">
          <div className="registros-header-left">
            <span className="card-icon">🌿</span>
            <h3>Cosechas ({cosechas.length})</h3>
          </div>
          {cosechas.length > 0 && (
            <button className="btn-export" onClick={handleExportCosechas}>↓ Exportar CSV</button>
          )}
        </div>

        {cosechas.length === 0 ? (
          <p className="empty-state">No hay cosechas registradas hoy.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                  <th>Notas</th>
                  <th>Hora</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cosechas.map(r => (
                  <tr key={r.id}>
                    <td className="td-producto">{r.producto}</td>
                    <td className="td-number">{r.cantidad}</td>
                    <td>{r.unidad}</td>
                    <td className="td-notas">{r.notas || '—'}</td>
                    <td className="td-hora">
                      {new Date(r.created_at).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="td-actions">
                      <button
                        className="btn-action-archive"
                        title="Archivar"
                        onClick={() => onArchive('cosechas', r.id)}
                      >🗃️</button>
                      <button
                        className="btn-action-delete"
                        title="Eliminar"
                        onClick={() => setConfirmDel({ tabla: 'cosechas', id: r.id, label: r.producto })}
                      >🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ventas activas */}
      <div className="card registros-card">
        <div className="registros-header">
          <div className="registros-header-left">
            <span className="card-icon">💰</span>
            <h3>Ventas ({ventas.length})</h3>
          </div>
          {ventas.length > 0 && (
            <button className="btn-export" onClick={handleExportVentas}>↓ Exportar CSV</button>
          )}
        </div>

        {ventas.length === 0 ? (
          <p className="empty-state">No hay ventas registradas hoy.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                  <th>Cliente</th>
                  <th>Precio</th>
                  <th>Total</th>
                  <th>Hora</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ventas.map(r => (
                  <tr key={r.id}>
                    <td className="td-producto">{r.producto}</td>
                    <td className="td-number">{r.cantidad}</td>
                    <td>{r.unidad}</td>
                    <td className="td-producto">{r.nombre_cliente}</td>
                    <td className="td-number">₡{parseFloat(r.precio_unitario).toLocaleString('es-CR')}</td>
                    <td className="td-total">₡{parseFloat(r.total).toLocaleString('es-CR')}</td>
                    <td className="td-hora">
                      {new Date(r.created_at).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="td-actions">
                      <button
                        className="btn-action-archive"
                        title="Archivar"
                        onClick={() => onArchive('ventas', r.id)}
                      >🗃️</button>
                      <button
                        className="btn-action-delete"
                        title="Eliminar"
                        onClick={() => setConfirmDel({ tabla: 'ventas', id: r.id, label: r.producto })}
                      >🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="tf-label">Total del día:</td>
                  <td className="td-total tf-total">
                    ₡{ventas.reduce((sum, r) => sum + parseFloat(r.total), 0).toLocaleString('es-CR')}
                  </td>
                  <td></td>
                  <td></td>
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
              {showArchivados && !loadingArch && ` (${totalArchivados})`}
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
                        <tr>
                          <th>Fecha</th>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Unidad</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {archCosechas.map(r => (
                          <tr key={r.id}>
                            <td className="td-hora">{r.fecha}</td>
                            <td className="td-producto">{r.producto}</td>
                            <td className="td-number">{r.cantidad}</td>
                            <td>{r.unidad}</td>
                            <td className="td-actions">
                              <button
                                className="btn-action-restore"
                                title="Restaurar"
                                onClick={() => handleRestore('cosechas', r.id)}
                              >↩</button>
                              <button
                                className="btn-action-delete"
                                title="Eliminar permanentemente"
                                onClick={() => setArchConfirmDel({ tabla: 'cosechas', id: r.id, label: r.producto })}
                              >🗑️</button>
                            </td>
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
                        <tr>
                          <th>Fecha</th>
                          <th>Producto</th>
                          <th>Cliente</th>
                          <th>Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {archVentas.map(r => (
                          <tr key={r.id}>
                            <td className="td-hora">{r.fecha}</td>
                            <td className="td-producto">{r.producto}</td>
                            <td>{r.nombre_cliente}</td>
                            <td className="td-total">₡{parseFloat(r.total).toLocaleString('es-CR')}</td>
                            <td className="td-actions">
                              <button
                                className="btn-action-restore"
                                title="Restaurar"
                                onClick={() => handleRestore('ventas', r.id)}
                              >↩</button>
                              <button
                                className="btn-action-delete"
                                title="Eliminar permanentemente"
                                onClick={() => setArchConfirmDel({ tabla: 'ventas', id: r.id, label: r.producto })}
                              >🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {totalArchivados === 0 && (
                <p className="empty-state">No hay registros archivados.</p>
              )}
            </div>
          )
        )}
      </div>

      {/* Modal eliminar registro activo */}
      {confirmDel && (
        <ConfirmModal
          message={`¿Seguro que desea eliminar el registro de "${confirmDel.label}"?`}
          onConfirm={() => { onDelete(confirmDel.tabla, confirmDel.id); setConfirmDel(null) }}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {/* Modal eliminar registro archivado */}
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
