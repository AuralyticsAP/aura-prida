import { exportToCSV, formatDateForFilename } from '../lib/csv'

export default function RegistrosHoy({ cosechas, ventas, loading }) {
  const today = new Date().toLocaleDateString('es-CR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

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

      {/* Cosechas */}
      <div className="card registros-card">
        <div className="registros-header">
          <div className="registros-header-left">
            <span className="card-icon">🌿</span>
            <h3>Cosechas ({cosechas.length})</h3>
          </div>
          {cosechas.length > 0 && (
            <button className="btn-export" onClick={handleExportCosechas}>
              ↓ Exportar CSV
            </button>
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
                      {new Date(r.created_at).toLocaleTimeString('es-CR', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ventas */}
      <div className="card registros-card">
        <div className="registros-header">
          <div className="registros-header-left">
            <span className="card-icon">💰</span>
            <h3>Ventas ({ventas.length})</h3>
          </div>
          {ventas.length > 0 && (
            <button className="btn-export" onClick={handleExportVentas}>
              ↓ Exportar CSV
            </button>
          )}
        </div>

        {ventas.length === 0 ? (
          <p className="empty-state">No hay ventas registradas hoy.</p>
        ) : (
          <>
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
                        {new Date(r.created_at).toLocaleTimeString('es-CR', {
                          hour: '2-digit', minute: '2-digit'
                        })}
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
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
