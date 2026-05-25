import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { UNIDADES } from '../lib/constants'

const initialState = {
  producto: '',
  cantidad: '',
  unidad: 'kg',
  cliente: '',
  clienteCustom: '',
  precio_unitario: '',
  notas: '',
}

export default function FormVenta({ onSuccess, productos = [], clientes = [], session }) {
  const [form, setForm] = useState(initialState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  const esOtros = form.cliente === 'Otros'

  const total = form.cantidad && form.precio_unitario
    ? (parseFloat(form.cantidad) * parseFloat(form.precio_unitario)).toFixed(2)
    : null

  const handleSubmit = async e => {
    e.preventDefault()

    if (!form.producto || !form.cantidad || !form.unidad || !form.cliente || !form.precio_unitario) {
      setError('Por favor completá todos los campos obligatorios.')
      return
    }
    if (esOtros && !form.clienteCustom.trim()) {
      setError('Por favor escribí el nombre del cliente.')
      return
    }

    const nombreCliente = esOtros ? form.clienteCustom.trim() : form.cliente

    setLoading(true)
    setError(null)

    const { error: dbError } = await supabase.from('ventas').insert([{
      producto: form.producto,
      cantidad: parseFloat(form.cantidad),
      unidad: form.unidad,
      tipo_cliente: form.cliente,
      nombre_cliente: nombreCliente,
      precio_unitario: parseFloat(form.precio_unitario),
      notas: form.notas || null,
      fecha: new Date().toISOString().split('T')[0],
      user_id: session.user.id,
    }])

    setLoading(false)

    if (dbError) {
      setError('Error al guardar: ' + dbError.message)
      return
    }

    setForm(initialState)
    onSuccess()
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-icon">💰</span>
        <h2>Registrar Venta</h2>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>Producto *</label>
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
          <label>Cliente *</label>
          <select name="cliente" value={form.cliente} onChange={handleChange} required>
            <option value="">Seleccioná un cliente</option>
            {clientes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="Otros">Otros</option>
          </select>
        </div>

        {esOtros && (
          <div className="form-group">
            <label>Nombre del cliente *</label>
            <input
              type="text"
              name="clienteCustom"
              value={form.clienteCustom}
              onChange={handleChange}
              placeholder="Escribí el nombre del cliente"
              required
            />
          </div>
        )}

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

        {total && (
          <div className="total-preview">
            <span>Total estimado:</span>
            <strong>₡{parseFloat(total).toLocaleString('es-CR')}</strong>
          </div>
        )}

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

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : 'Registrar Venta'}
        </button>
      </form>
    </div>
  )
}
