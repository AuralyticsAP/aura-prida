import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ProveedorDetalle from './ProveedorDetalle'
import FormProveedor from './FormProveedor'

export default function Proveedores({ session, showToast }) {
  const [view, setView] = useState('list')
  const [proveedores, setProveedores] = useState([])
  const [selected, setSelected] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProveedores = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('proveedores')
      .select('*, proveedor_productos(count)')
      .order('nombre')
    setProveedores(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchProveedores() }, [fetchProveedores])

  const goList = () => {
    setView('list')
    setSelected(null)
    setEditTarget(null)
    fetchProveedores()
  }

  if (view === 'detalle') return (
    <ProveedorDetalle
      proveedor={selected}
      session={session}
      showToast={showToast}
      onBack={goList}
      onEdit={() => { setEditTarget(selected); setView('form') }}
      onDeleted={() => { goList(); showToast('Proveedor eliminado') }}
    />
  )

  if (view === 'form') return (
    <FormProveedor
      proveedor={editTarget}
      session={session}
      onSave={savedProveedor => {
        if (editTarget) {
          setSelected(savedProveedor)
          setView('detalle')
          showToast('Proveedor actualizado')
        } else {
          goList()
          showToast('Proveedor creado')
        }
        setEditTarget(null)
        fetchProveedores()
      }}
      onCancel={() => {
        if (editTarget) { setView('detalle') }
        else { setView('list') }
        setEditTarget(null)
      }}
    />
  )

  return (
    <div className="proveedores-section">
      <div className="proveedores-header">
        <div>
          <h2 className="proveedores-title">Proveedores</h2>
          <p className="section-date">
            {loading ? '...' : `${proveedores.length} proveedor${proveedores.length !== 1 ? 'es' : ''} registrado${proveedores.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button className="btn-primary btn-add-proveedor" onClick={() => { setEditTarget(null); setView('form') }}>
          + Agregar
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Cargando proveedores...</div>
      ) : proveedores.length === 0 ? (
        <div className="proveedores-empty">
          <span className="proveedores-empty-icon">🏭</span>
          <p>No hay proveedores registrados todavía.</p>
          <button className="btn-primary" onClick={() => setView('form')}>Agregar primer proveedor</button>
        </div>
      ) : (
        <div className="proveedores-grid">
          {proveedores.map(p => {
            const count = p.proveedor_productos?.[0]?.count ?? 0
            return (
              <div
                key={p.id}
                className="proveedor-card"
                onClick={() => { setSelected(p); setView('detalle') }}
              >
                <div className="proveedor-card-avatar">
                  {p.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="proveedor-card-info">
                  <h3>{p.nombre}</h3>
                  {p.contacto && <p className="proveedor-card-contacto">{p.contacto}</p>}
                  <span className="proveedor-card-badge">
                    {count} producto{count !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="proveedor-card-arrow">›</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
