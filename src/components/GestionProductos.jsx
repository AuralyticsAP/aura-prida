import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const emptyAdd = { nombre: '', costo_produccion: '', orden: '' }

export default function GestionProductos({ showToast }) {
  const [productos, setProductos]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [addForm, setAddForm]       = useState(emptyAdd)
  const [saving, setSaving]         = useState(false)
  const [editingId, setEditingId]   = useState(null)
  const [editForm, setEditForm]     = useState({})
  const [showInactivos, setShowInactivos] = useState(false)

  const fetchProductos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('productos')
      .select('*')
      .order('orden', { ascending: true })
    setProductos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchProductos() }, [fetchProductos])

  const activos   = productos.filter(p => p.activo)
  const inactivos = productos.filter(p => !p.activo)

  /* ── Agregar ── */
  const handleAdd = async e => {
    e.preventDefault()
    const nombre = addForm.nombre.trim()
    if (!nombre) return
    setSaving(true)
    const maxOrden = productos.length
      ? Math.max(...productos.map(p => p.orden || 0))
      : 0
    const { error } = await supabase.from('productos').insert([{
      nombre,
      costo_produccion: addForm.costo_produccion ? parseFloat(addForm.costo_produccion) : null,
      orden:            addForm.orden ? parseInt(addForm.orden) : maxOrden + 1,
      activo:           true,
    }])
    setSaving(false)
    if (error) { showToast('Error: ' + error.message, 'error'); return }
    setAddForm(emptyAdd)
    setShowAdd(false)
    fetchProductos()
    showToast('✅ Producto agregado')
  }

  /* ── Editar inline ── */
  const startEdit = p => {
    setEditingId(p.id)
    setEditForm({
      nombre:           p.nombre,
      costo_produccion: p.costo_produccion ?? '',
      orden:            p.orden ?? '',
    })
  }

  const cancelEdit = () => { setEditingId(null); setEditForm({}) }

  const handleSaveEdit = async id => {
    setSaving(true)
    const { error } = await supabase.from('productos').update({
      nombre:           editForm.nombre.trim(),
      costo_produccion: editForm.costo_produccion !== '' ? parseFloat(editForm.costo_produccion) : null,
      orden:            editForm.orden !== '' ? parseInt(editForm.orden) : null,
    }).eq('id', id)
    setSaving(false)
    if (error) { showToast('Error al guardar', 'error'); return }
    cancelEdit()
    fetchProductos()
    showToast('✅ Producto actualizado')
  }

  /* ── Toggle activo ── */
  const handleToggle = async (id, activo) => {
    const { error } = await supabase.from('productos').update({ activo: !activo }).eq('id', id)
    if (error) { showToast('Error al actualizar', 'error'); return }
    fetchProductos()
    showToast(activo ? 'Producto desactivado' : '✅ Producto activado')
  }

  /* ── Solo guardar costo (acceso rápido desde la fila) ── */
  const handleQuickCosto = async (id, costo) => {
    const val = costo !== '' ? parseFloat(costo) : null
    const { error } = await supabase.from('productos').update({ costo_produccion: val }).eq('id', id)
    if (error) { showToast('Error al guardar costo', 'error'); return }
    fetchProductos()
    showToast('✅ Costo actualizado')
  }

  return (
    <div className="gp-section">

      {/* ── Header ── */}
      <div className="proveedores-header">
        <div>
          <h2 className="proveedores-title">🥬 Catálogo de Productos</h2>
          <p className="section-date">
            {loading ? '...' : `${activos.length} producto${activos.length !== 1 ? 's' : ''} activo${activos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          className="btn-primary btn-add-proveedor"
          onClick={() => { setShowAdd(v => !v); cancelEdit() }}
        >
          {showAdd ? '✕ Cancelar' : '+ Agregar'}
        </button>
      </div>

      {/* ── Formulario agregar ── */}
      {showAdd && (
        <div className="card gp-add-card">
          <h3 className="gp-add-title">Nuevo producto</h3>
          <form className="gp-add-form" onSubmit={handleAdd}>
            <div className="form-group">
              <label>Nombre del producto *</label>
              <input
                value={addForm.nombre}
                onChange={e => setAddForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Tomate cherry"
                required
              />
            </div>
            <div className="gp-add-row">
              <div className="form-group">
                <label>Costo de producción (₡/kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.costo_produccion}
                  onChange={e => setAddForm(p => ({ ...p, costo_produccion: e.target.value }))}
                  placeholder="Ej: 350"
                />
              </div>
              <div className="form-group">
                <label>Orden en listas</label>
                <input
                  type="number"
                  min="0"
                  value={addForm.orden}
                  onChange={e => setAddForm(p => ({ ...p, orden: e.target.value }))}
                  placeholder="Auto"
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => { setShowAdd(false); setAddForm(emptyAdd) }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tabla productos activos ── */}
      {loading ? (
        <div className="loading-state">Cargando productos...</div>
      ) : (
        <div className="card gp-table-card">
          <div className="table-wrapper">
            <table className="data-table gp-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="gp-th-cost">Costo producción (₡/kg)</th>
                  <th className="gp-th-order">Orden</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {activos.map(p => (
                  <tr key={p.id}>
                    {editingId === p.id ? (
                      /* ── Fila en edición ── */
                      <>
                        <td>
                          <input
                            className="gp-inline-input"
                            value={editForm.nombre}
                            onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                          />
                        </td>
                        <td>
                          <input
                            className="gp-inline-input gp-input-cost"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.costo_produccion}
                            onChange={e => setEditForm(f => ({ ...f, costo_produccion: e.target.value }))}
                            placeholder="Sin costo"
                          />
                        </td>
                        <td>
                          <input
                            className="gp-inline-input gp-input-order"
                            type="number"
                            min="0"
                            value={editForm.orden}
                            onChange={e => setEditForm(f => ({ ...f, orden: e.target.value }))}
                          />
                        </td>
                        <td className="td-actions">
                          <button
                            className="btn-action-restore"
                            title="Guardar"
                            onClick={() => handleSaveEdit(p.id)}
                            disabled={saving}
                          >✓</button>
                          <button
                            className="btn-action-delete"
                            title="Cancelar"
                            onClick={cancelEdit}
                          >✕</button>
                        </td>
                      </>
                    ) : (
                      /* ── Fila normal ── */
                      <>
                        <td className="td-producto">{p.nombre}</td>
                        <td>
                          {p.costo_produccion != null ? (
                            <span className="gp-costo-chip">
                              ₡{parseFloat(p.costo_produccion).toLocaleString('es-CR')}/kg
                            </span>
                          ) : (
                            <span className="gp-costo-empty">Sin costo</span>
                          )}
                        </td>
                        <td className="td-number">{p.orden}</td>
                        <td className="td-actions">
                          <button
                            className="btn-action-archive"
                            title="Editar"
                            onClick={() => startEdit(p)}
                          >✏️</button>
                          <button
                            className="btn-action-delete"
                            title="Desactivar"
                            onClick={() => handleToggle(p.id, true)}
                          >⏸</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}

                {activos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty-state">No hay productos activos.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Inactivos ── */}
      {inactivos.length > 0 && (
        <div className="card registros-card archivados-section">
          <div className="registros-header">
            <div className="registros-header-left">
              <span className="card-icon">📦</span>
              <h3>Inactivos {showInactivos && `(${inactivos.length})`}</h3>
            </div>
            <button className="btn-export" onClick={() => setShowInactivos(v => !v)}>
              {showInactivos ? 'Ocultar' : 'Ver inactivos'}
            </button>
          </div>

          {showInactivos && (
            <div className="proveedores-archivados">
              {inactivos.map(p => (
                <div key={p.id} className="proveedor-arch-card">
                  <span className="proveedor-arch-name">🥬 {p.nombre}</span>
                  {p.costo_produccion != null && (
                    <span className="gp-costo-chip" style={{ fontSize: 11 }}>
                      ₡{parseFloat(p.costo_produccion).toLocaleString('es-CR')}/kg
                    </span>
                  )}
                  <div className="proveedor-arch-actions">
                    <button
                      className="btn-action-restore"
                      title="Activar"
                      onClick={() => handleToggle(p.id, false)}
                    >▶</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
