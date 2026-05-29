import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { UNIDADES } from '../lib/constants'

const initialState = {
  finca_id: '',
  producto: '',
  cantidad: '',
  unidad: 'kg',
  notas: '',
}

export default function FormCosecha({ onSuccess, productos = [], fincas = [], session }) {
  const [form, setForm] = useState(initialState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.finca_id || !form.producto || !form.cantidad || !form.unidad) {
      setError('Por favor completá todos los campos obligatorios.')
      return
    }

    setLoading(true)
    setError(null)

    const { error: dbError } = await supabase.from('cosechas').insert([{
      finca_id: parseInt(form.finca_id),
      producto: form.producto,
      cantidad: parseFloat(form.cantidad),
      unidad: form.unidad,
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
        <span className="card-icon">🌿</span>
        <h2>Registrar Cosecha</h2>
      </div>

      <form onSubmit={handleSubmit} className="form">
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
          {loading ? 'Guardando...' : 'Registrar Cosecha'}
        </button>
      </form>
    </div>
  )
}
