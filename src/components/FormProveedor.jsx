import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { UNIDADES_PROVEEDOR } from '../lib/constants'

const emptyProducto = () => ({ nombre: '', precio: '', unidad: 'kg' })

const initialForm = { nombre: '', contacto: '', telefono: '', email: '', notas: '' }

export default function FormProveedor({ proveedor, session, onSave, onCancel }) {
  const [form, setForm] = useState(initialForm)
  const [productos, setProductos] = useState([emptyProducto()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const isEdit = !!proveedor

  useEffect(() => {
    if (!proveedor) return
    setForm({
      nombre:   proveedor.nombre   || '',
      contacto: proveedor.contacto || '',
      telefono: proveedor.telefono || '',
      email:    proveedor.email    || '',
      notas:    proveedor.notas    || '',
    })
    supabase
      .from('proveedor_productos')
      .select('*')
      .eq('proveedor_id', proveedor.id)
      .order('nombre')
      .then(({ data }) => {
        setProductos(data?.length
          ? data.map(p => ({ id: p.id, nombre: p.nombre, precio: String(p.precio), unidad: p.unidad }))
          : [emptyProducto()]
        )
      })
  }, [proveedor])

  const handleFormChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  const handleProductoChange = (i, field, value) =>
    setProductos(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre del proveedor es obligatorio.'); return }

    setLoading(true)
    setError(null)

    const proveedorData = {
      nombre:   form.nombre.trim(),
      contacto: form.contacto  || null,
      telefono: form.telefono  || null,
      email:    form.email     || null,
      notas:    form.notas     || null,
    }

    let proveedorId = proveedor?.id

    if (isEdit) {
      const { error: err } = await supabase.from('proveedores').update(proveedorData).eq('id', proveedorId)
      if (err) { setError('Error al actualizar proveedor.'); setLoading(false); return }
    } else {
      const { data, error: err } = await supabase
        .from('proveedores')
        .insert([{ ...proveedorData, user_id: session.user.id }])
        .select()
        .single()
      if (err) { setError('Error al guardar proveedor.'); setLoading(false); return }
      proveedorId = data.id
    }

    const validProductos = productos.filter(p => p.nombre.trim() && p.precio)

    if (isEdit) {
      await supabase.from('proveedor_productos').delete().eq('proveedor_id', proveedorId)
    }

    if (validProductos.length > 0) {
      const { error: prodErr } = await supabase.from('proveedor_productos').insert(
        validProductos.map(p => ({
          proveedor_id: proveedorId,
          nombre:  p.nombre.trim(),
          precio:  parseFloat(p.precio),
          unidad:  p.unidad,
          user_id: session.user.id,
        }))
      )
      if (prodErr) { setError('Proveedor guardado pero hubo un error con los productos.'); setLoading(false); return }
    }

    setLoading(false)
    onSave({ id: proveedorId, ...proveedorData })
  }

  return (
    <div className="card form-proveedor">
      <div className="card-header">
        <span className="card-icon">🏭</span>
        <h2>{isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nombre del proveedor *</label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={handleFormChange}
            placeholder="Ej: Finca La Esperanza"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Contacto</label>
            <input name="contacto" value={form.contacto} onChange={handleFormChange} placeholder="Nombre de contacto" />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input name="telefono" value={form.telefono} onChange={handleFormChange} placeholder="8888-8888" />
          </div>
        </div>

        <div className="form-group">
          <label>Correo</label>
          <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="correo@ejemplo.com" />
        </div>

        <div className="form-group">
          <label>Notas</label>
          <textarea name="notas" value={form.notas} onChange={handleFormChange} placeholder="Observaciones..." rows={2} />
        </div>

        <div className="productos-form-section">
          <div className="productos-form-header">
            <span className="form-section-label">Productos</span>
            <button type="button" className="btn-export" onClick={() => setProductos(prev => [...prev, emptyProducto()])}>
              + Agregar fila
            </button>
          </div>

          {productos.map((p, i) => (
            <div key={i} className="producto-row">
              <div className="form-group producto-nombre">
                <input
                  value={p.nombre}
                  onChange={e => handleProductoChange(i, 'nombre', e.target.value)}
                  placeholder="Nombre del producto"
                />
              </div>
              <div className="form-group producto-precio">
                <input
                  type="number"
                  value={p.precio}
                  onChange={e => handleProductoChange(i, 'precio', e.target.value)}
                  placeholder="Precio ₡"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="form-group producto-unidad">
                <select value={p.unidad} onChange={e => handleProductoChange(i, 'unidad', e.target.value)}>
                  {UNIDADES_PROVEEDOR.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {productos.length > 1 && (
                <button
                  type="button"
                  className="btn-delete-row"
                  onClick={() => setProductos(prev => prev.filter((_, idx) => idx !== i))}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="btn-export btn-cancel" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear proveedor'}
          </button>
        </div>
      </form>
    </div>
  )
}
