import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import DateInput from './DateInput'

const today = new Date().toISOString().split('T')[0]

function fmtFecha(f) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-CR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function AbonoPagoModal({ compra, session, canWrite, onClose, onUpdated }) {
  const [abonos, setAbonos]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState({ monto: '', fecha: today, notas: '' })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  const fetchAbonos = async () => {
    const { data } = await supabase
      .from('abonos_compras')
      .select('*')
      .eq('compra_id', compra.id)
      .order('fecha', { ascending: false })
    setAbonos(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAbonos() }, [compra.id])

  const totalAbonado = abonos.reduce((s, a) => s + parseFloat(a.monto || 0), 0)
  const saldo        = Math.max(0, parseFloat(compra.total || 0) - totalAbonado)
  const estaPagado   = saldo < 0.01

  const recalcEstado = async (abonosActuales) => {
    const suma = abonosActuales.reduce((s, a) => s + parseFloat(a.monto || 0), 0)
    const nuevoEstado = suma <= 0
      ? 'pendiente'
      : suma >= parseFloat(compra.total || 0) - 0.01
        ? 'pagado'
        : 'parcial'
    await supabase.from('compras').update({ estado_pago: nuevoEstado }).eq('id', compra.id)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const monto = parseFloat(form.monto)
    if (!monto || monto <= 0) { setError('El monto debe ser mayor a 0'); return }
    if (monto > saldo + 0.01) {
      setError(`El monto no puede superar el saldo pendiente (₡${Math.round(saldo).toLocaleString('es-CR')})`)
      return
    }
    setSaving(true)
    setError(null)
    const { error: insertErr } = await supabase.from('abonos_compras').insert([{
      compra_id: compra.id,
      monto,
      fecha:     form.fecha,
      notas:     form.notas || null,
      user_id:   session.user.id,
    }])
    if (insertErr) { setError('Error: ' + insertErr.message); setSaving(false); return }

    const { data: fresh } = await supabase
      .from('abonos_compras').select('*').eq('compra_id', compra.id)
    const freshList = fresh || []
    await recalcEstado(freshList)
    setAbonos(freshList)
    setForm({ monto: '', fecha: today, notas: '' })
    setSaving(false)
    onUpdated()
  }

  const handleDelete = async (abonoId) => {
    await supabase.from('abonos_compras').delete().eq('id', abonoId)
    const remaining = abonos.filter(a => a.id !== abonoId)
    await recalcEstado(remaining)
    setAbonos(remaining)
    onUpdated()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box abono-modal" onClick={e => e.stopPropagation()}>

        <div className="abono-modal-header">
          <h3>💳 Gestionar Pagos</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="abono-compra-info">
          <p className="abono-compra-name">{compra.producto}</p>
          <p className="abono-compra-prov">
            {compra.proveedores?.nombre || 'Sin proveedor'} · {fmtFecha(compra.fecha)}
          </p>
          <div className="abono-totals-row">
            <div className="abono-total-item">
              <span>Total</span>
              <strong>₡{parseFloat(compra.total).toLocaleString('es-CR')}</strong>
            </div>
            <div className="abono-total-item abono-item-green">
              <span>Abonado</span>
              <strong>₡{Math.round(totalAbonado).toLocaleString('es-CR')}</strong>
            </div>
            <div className={`abono-total-item ${estaPagado ? 'abono-item-green' : 'abono-item-red'}`}>
              <span>Saldo</span>
              <strong>₡{Math.round(saldo).toLocaleString('es-CR')}</strong>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="loading-state" style={{ padding: '16px 0' }}>Cargando...</p>
        ) : (
          <>
            {abonos.length > 0 && (
              <div className="abono-list">
                <p className="abono-list-title">Historial de abonos</p>
                {abonos.map(a => (
                  <div key={a.id} className="abono-row">
                    <span className="abono-fecha">{fmtFecha(a.fecha)}</span>
                    <span className="abono-monto">₡{parseFloat(a.monto).toLocaleString('es-CR')}</span>
                    {a.notas && <span className="abono-notas">{a.notas}</span>}
                    {canWrite && (
                      <button className="abono-del-btn" onClick={() => handleDelete(a.id)} title="Eliminar abono">✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!estaPagado && canWrite ? (
              <form onSubmit={handleSubmit} className="abono-form">
                <p className="abono-form-title">Registrar abono</p>
                <div className="form-row">
                  <div className="form-group">
                    <label>Monto (₡) *</label>
                    <input
                      type="number"
                      value={form.monto}
                      onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha *</label>
                    <DateInput
                      value={form.fecha}
                      onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notas</label>
                  <input
                    type="text"
                    value={form.notas}
                    onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                    placeholder="Referencia, transferencia, cheque..."
                  />
                </div>
                {error && <p className="form-error">{error}</p>}
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Registrar Abono'}
                </button>
              </form>
            ) : estaPagado ? (
              <div className="abono-pagado-msg">✅ Esta compra está completamente pagada</div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
