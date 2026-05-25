import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ProveedorDetalle from './ProveedorDetalle'
import FormProveedor from './FormProveedor'
import ConfirmModal from './ConfirmModal'

export default function Proveedores({ session, showToast }) {
  const [view, setView] = useState('list')
  const [proveedores, setProveedores] = useState([])
  const [selected, setSelected] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showArchivados, setShowArchivados] = useState(false)
  const [archProveedores, setArchProveedores] = useState([])
  const [loadingArch, setLoadingArch] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [archConfirmDel, setArchConfirmDel] = useState(null)

  const fetchProveedores = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('proveedores')
      .select('*, proveedor_productos(count)')
      .eq('estado', 'activo')
      .order('nombre')
    setProveedores(data || [])
    setLoading(false)
  }, [])

  const fetchArchivados = useCallback(async () => {
    setLoadingArch(true)
    const { data } = await supabase
      .from('proveedores')
      .select('*')
      .eq('estado', 'archivado')
      .order('nombre')
    setArchProveedores(data || [])
    setLoadingArch(false)
  }, [])

  useEffect(() => { fetchProveedores() }, [fetchProveedores])

  useEffect(() => {
    if (showArchivados) fetchArchivados()
  }, [showArchivados, fetchArchivados])

  const goList = () => {
    setView('list')
    setSelected(null)
    setEditTarget(null)
    fetchProveedores()
  }

  const handleArchiveProveedor = async (id) => {
    const { error } = await supabase.from('proveedores').update({ estado: 'archivado' }).eq('id', id)
    if (error) { showToast('Error al archivar', 'error'); return }
    showToast('📦 Proveedor archivado')
    fetchProveedores()
    if (showArchivados) fetchArchivados()
  }

  const handleDeleteFromList = async () => {
    const { error } = await supabase.from('proveedores').delete().eq('id', confirmDel.id)
    if (error) { showToast('Error al eliminar', 'error'); return }
    setConfirmDel(null)
    showToast('Proveedor eliminado')
    fetchProveedores()
  }

  const handleRestoreProveedor = async (id) => {
    const { error } = await supabase.from('proveedores').update({ estado: 'activo' }).eq('id', id)
    if (error) { showToast('Error al restaurar', 'error'); return }
    showToast('✅ Proveedor restaurado')
    fetchArchivados()
    fetchProveedores()
  }

  const handleDeleteArchived = async () => {
    const { error } = await supabase.from('proveedores').delete().eq('id', archConfirmDel.id)
    if (error) { showToast('Error al eliminar', 'error'); return }
    setArchConfirmDel(null)
    showToast('Proveedor eliminado definitivamente')
    fetchArchivados()
  }

  if (view === 'detalle') return (
    <ProveedorDetalle
      proveedor={selected}
      session={session}
      showToast={showToast}
      onBack={goList}
      onEdit={() => { setEditTarget(selected); setView('form') }}
      onDeleted={() => { goList(); showToast('Proveedor eliminado') }}
      onArchived={() => { goList(); showToast('📦 Proveedor archivado') }}
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
                <div className="proveedor-card-actions" onClick={e => e.stopPropagation()}>
                  <button
                    className="btn-action-archive"
                    title="Archivar"
                    onClick={() => handleArchiveProveedor(p.id)}
                  >🗃️</button>
                  <button
                    className="btn-action-delete"
                    title="Eliminar"
                    onClick={() => setConfirmDel({ id: p.id, nombre: p.nombre })}
                  >🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Archivados */}
      <div className="card registros-card archivados-section" style={{ marginTop: 8 }}>
        <div className="registros-header">
          <div className="registros-header-left">
            <span className="card-icon">📦</span>
            <h3>
              Archivados
              {showArchivados && !loadingArch && ` (${archProveedores.length})`}
            </h3>
          </div>
          <button className="btn-export" onClick={() => setShowArchivados(v => !v)}>
            {showArchivados ? 'Ocultar' : 'Ver archivados'}
          </button>
        </div>

        {showArchivados && (
          loadingArch ? (
            <div className="loading-state">Cargando archivados...</div>
          ) : archProveedores.length === 0 ? (
            <p className="empty-state">No hay proveedores archivados.</p>
          ) : (
            <div className="proveedores-archivados">
              {archProveedores.map(p => (
                <div key={p.id} className="proveedor-arch-card">
                  <span className="proveedor-arch-name">🏭 {p.nombre}</span>
                  {p.contacto && <span className="proveedor-card-contacto" style={{ fontSize: 12 }}>{p.contacto}</span>}
                  <div className="proveedor-arch-actions">
                    <button
                      className="btn-action-restore"
                      title="Restaurar"
                      onClick={() => handleRestoreProveedor(p.id)}
                    >↩</button>
                    <button
                      className="btn-action-delete"
                      title="Eliminar permanentemente"
                      onClick={() => setArchConfirmDel({ id: p.id, nombre: p.nombre })}
                    >🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal eliminar proveedor activo */}
      {confirmDel && (
        <ConfirmModal
          message={`¿Seguro que desea eliminar a "${confirmDel.nombre}"?`}
          onConfirm={handleDeleteFromList}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {/* Modal eliminar proveedor archivado */}
      {archConfirmDel && (
        <ConfirmModal
          message={`¿Eliminar permanentemente a "${archConfirmDel.nombre}" y todos sus productos?`}
          onConfirm={handleDeleteArchived}
          onCancel={() => setArchConfirmDel(null)}
        />
      )}
    </div>
  )
}
