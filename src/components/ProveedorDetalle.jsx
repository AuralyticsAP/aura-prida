import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { UNIDADES_PROVEEDOR } from '../lib/constants'

const emptyProd = { nombre: '', precio: '', unidad: 'kg' }

export default function ProveedorDetalle({ proveedor, session, showToast, onBack, onEdit, onDeleted }) {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProd, setNewProd] = useState(emptyProd)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const fetchProductos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('proveedor_productos')
      .select('*')
      .eq('proveedor_id', proveedor.id)
      .order('nombre')
    setProductos(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchProductos() }, [proveedor.id])

  const handleAddProducto = async e => {
    e.preventDefault()
    if (!newProd.nombre || !newProd.precio) return
    setSaving(true)
    const { error } = await supabase.from('proveedor_productos').insert([{
      proveedor_id: proveedor.id,
      nombre:  newProd.nombre.trim(),
      precio:  parseFloat(newProd.precio),
      unidad:  newProd.unidad,
      user_id: session.user.id,
    }])
    setSaving(false)
    if (error) { showToast('Error al agregar producto', 'error'); return }
    setNewProd(emptyProd)
    setShowAddForm(false)
    fetchProductos()
    showToast('Producto agregado')
  }

  const handleDeleteProducto = async id => {
    const { error } = await supabase.from('proveedor_productos').delete().eq('id', id)
    if (error) { showToast('Error al eliminar', 'error'); return }
    fetchProductos()
    showToast('Producto eliminado')
  }

  const handleDeleteProveedor = async () => {
    const { error } = await supabase.from('proveedores').delete().eq('id', proveedor.id)
    if (error) { showToast('Error al eliminar proveedor', 'error'); return }
    onDeleted()
  }

  return (
    <div className="proveedor-detalle">
      <div className="detalle-topbar">
        <button className="btn-back" onClick={onBack}>← Volver</button>
        <div className="detalle-actions">
          <button className="btn-export" onClick={onEdit}>Editar</button>
          <button className="btn-danger-sm" onClick={() => setConfirmDelete(true)}>Eliminar</button>
        </div>
      </div>

      <div className="card detalle-card">
        <div className="card-header">
          <span className="card-icon">🏭</span>
          <div>
            <h2>{proveedor.nombre}</h2>
            {proveedor.contacto && <p className="detalle-sub">{proveedor.contacto}</p>}
          </div>
        </div>
        <div className="detalle-meta">
          {proveedor.telefono && <span className="detalle-chip">📞 {proveedor.telefono}</span>}
          {proveedor.email    && <span className="detalle-chip">✉️ {proveedor.email}</span>}
        </div>
        {proveedor.notas && <p className="detalle-notas">{proveedor.notas}</p>}
      </div>

      <div className="card productos-detalle-card">
        <div className="registros-header">
          <div className="registros-header-left">
            <span className="card-icon">📦</span>
            <h3>Productos ({productos.length})</h3>
          </div>
          <button className="btn-export" onClick={() => setShowAddForm(v => !v)}>
            {showAddForm ? 'Cancelar' : '+ Agregar'}
          </button>
        </div>

        {showAddForm && (
          <form className="add-producto-form" onSubmit={handleAddProducto}>
            <div className="producto-row">
              <div className="form-group producto-nombre">
                <input
                  value={newProd.nombre}
                  onChange={e => setNewProd(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre del producto"
                  required
                />
              </div>
              <div className="form-group producto-precio">
                <input
                  type="number"
                  value={newProd.precio}
                  onChange={e => setNewProd(p => ({ ...p, precio: e.target.value }))}
                  placeholder="Precio ₡"
                  min="0" step="0.01"
                  required
                />
              </div>
              <div className="form-group producto-unidad">
                <select value={newProd.unidad} onChange={e => setNewProd(p => ({ ...p, unidad: e.target.value }))}>
                  {UNIDADES_PROVEEDOR.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar producto'}
            </button>
          </form>
        )}

        {loading ? (
          <div className="loading-state">Cargando productos...</div>
        ) : productos.length === 0 ? (
          <div className="empty-state">No hay productos registrados.</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Unidad</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id}>
                    <td className="td-producto">{p.nombre}</td>
                    <td className="td-number td-total">₡{parseFloat(p.precio).toLocaleString('es-CR')}</td>
                    <td>{p.unidad}</td>
                    <td>
                      <button className="btn-delete-row" onClick={() => handleDeleteProducto(p.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <p>¿Eliminar a <strong>{proveedor.nombre}</strong> y todos sus productos?</p>
            <div className="confirm-actions">
              <button className="btn-export" onClick={() => setConfirmDelete(false)}>Cancelar</button>
              <button className="btn-danger" onClick={handleDeleteProveedor}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
