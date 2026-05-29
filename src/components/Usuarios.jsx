import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ConfirmModal from './ConfirmModal'

const ROLE_LABELS = { admin: 'Admin', editor: 'Editor', viewer: 'Viewer' }
const ROLE_BADGE  = { admin: 'badge-admin', editor: 'badge-editor', viewer: 'badge-viewer' }

export default function Usuarios({ session, showToast }) {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [addForm, setAddForm]   = useState({ email: '', password: '', role: 'editor' })
  const [adding, setAdding]     = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [editingRole, setEditingRole] = useState('')
  const [confirmDeact, setConfirmDeact] = useState(null)

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('user_roles').select('*'),
    ])
    const rolesMap = {}
    roles?.forEach(r => { rolesMap[r.user_id] = r })
    setUsuarios((profs || []).map(p => ({
      ...p,
      role:   rolesMap[p.id]?.role   ?? 'viewer',
      activo: rolesMap[p.id]?.activo ?? true,
    })))
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsuarios() }, [fetchUsuarios])

  const cancelEdit = () => { setEditingId(null); setEditingRole('') }

  const handleSaveRole = async (userId) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: editingRole })
      .eq('user_id', userId)
    if (error) { showToast('Error al cambiar rol', 'error'); return }
    showToast('✅ Rol actualizado')
    cancelEdit()
    fetchUsuarios()
  }

  const handleToggleActivo = async (userId, currentActivo) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ activo: !currentActivo })
      .eq('user_id', userId)
    if (error) { showToast('Error al actualizar usuario', 'error'); return }
    showToast(currentActivo ? 'Usuario desactivado' : '✅ Usuario activado')
    setConfirmDeact(null)
    fetchUsuarios()
  }

  const handleAddUser = async e => {
    e.preventDefault()
    setAdding(true)
    const email = addForm.email.trim().toLowerCase()

    // Verificar si el usuario ya existe en profiles
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      // Usuario ya existe: solo actualizar rol
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: existing.id, role: addForm.role, activo: true }, { onConflict: 'user_id' })
      if (error) { showToast('Error: ' + error.message, 'error'); setAdding(false); return }
      showToast('✅ Rol asignado al usuario existente')
    } else {
      // Usuario nuevo: usar Edge Function para no afectar la sesión del admin
      if (!addForm.password) {
        showToast('Ingresá una contraseña para el usuario nuevo', 'error')
        setAdding(false)
        return
      }
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email, password: addForm.password, role: addForm.role },
      })
      if (error || data?.error) {
        showToast('Error: ' + (data?.error ?? error.message), 'error')
        setAdding(false)
        return
      }
      showToast('✅ Usuario creado. Ya puede iniciar sesión.')
    }

    setAdding(false)
    setShowAdd(false)
    setAddForm({ email: '', password: '', role: 'editor' })
    fetchUsuarios()
  }

  return (
    <div className="usuarios-section">
      <div className="proveedores-header">
        <div>
          <h2 className="proveedores-title">👥 Usuarios</h2>
          <p className="section-date">
            {loading ? '...' : `${usuarios.length} usuario${usuarios.length !== 1 ? 's' : ''} registrado${usuarios.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          className="btn-primary btn-add-proveedor"
          onClick={() => { setShowAdd(v => !v); cancelEdit() }}
        >
          {showAdd ? '✕ Cancelar' : '+ Agregar'}
        </button>
      </div>

      {showAdd && (
        <div className="card add-user-card">
          <div className="card-header">
            <span className="card-icon">👤</span>
            <h2>Agregar Usuario</h2>
          </div>
          <form className="form" onSubmit={handleAddUser}>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={addForm.email}
                onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Contraseña temporal</label>
              <input
                type="password"
                value={addForm.password}
                onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Solo requerida si el usuario es nuevo"
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>Rol</label>
              <select
                value={addForm.role}
                onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}
              >
                <option value="admin">Admin — acceso total</option>
                <option value="editor">Editor — registrar y archivar</option>
                <option value="viewer">Viewer — solo visualizar</option>
              </select>
            </div>
            <p className="add-user-note">
              💡 Si el correo ya tiene cuenta, solo se actualiza el rol (contraseña ignorada).
              El usuario nuevo podrá iniciar sesión de inmediato con la contraseña indicada.
            </p>
            <button type="submit" className="btn-primary" disabled={adding}>
              {adding ? 'Procesando...' : 'Guardar usuario'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Cargando usuarios...</div>
      ) : (
        <div className="usuarios-list">
          {usuarios.map(u => (
            <div key={u.id} className={`usuario-card ${!u.activo ? 'usuario-inactivo' : ''}`}>
              <div className="usuario-avatar">
                {u.email.charAt(0).toUpperCase()}
              </div>
              <div className="usuario-info">
                <p className="usuario-email">{u.email}</p>
                <div className="usuario-meta">
                  {!u.activo && <span className="badge-inactivo">Inactivo</span>}
                  <span className="usuario-fecha">
                    Desde {new Date(u.created_at).toLocaleDateString('es-CR', { year: 'numeric', month: 'short' })}
                  </span>
                  {u.id === session.user.id && (
                    <span className="badge-yo">Tú</span>
                  )}
                </div>
              </div>

              <div className="usuario-right">
                {editingId === u.id ? (
                  <div className="role-edit-row">
                    <select
                      className="role-select"
                      value={editingRole}
                      onChange={e => setEditingRole(e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      className="btn-action-restore"
                      title="Guardar"
                      onClick={() => handleSaveRole(u.id)}
                    >✓</button>
                    <button
                      className="btn-action-delete"
                      title="Cancelar"
                      onClick={cancelEdit}
                    >✕</button>
                  </div>
                ) : (
                  <div className="usuario-actions">
                    <span className={`role-badge ${ROLE_BADGE[u.role] ?? 'badge-viewer'}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                    {u.id !== session.user.id && (
                      <>
                        <button
                          className="btn-action-archive"
                          title="Cambiar rol"
                          onClick={() => { setEditingId(u.id); setEditingRole(u.role) }}
                        >✏️</button>
                        {u.activo ? (
                          <button
                            className="btn-action-delete"
                            title="Desactivar usuario"
                            onClick={() => setConfirmDeact(u)}
                          >⏸</button>
                        ) : (
                          <button
                            className="btn-action-restore"
                            title="Activar usuario"
                            onClick={() => handleToggleActivo(u.id, false)}
                          >▶</button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDeact && (
        <div className="confirm-overlay" onClick={() => setConfirmDeact(null)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon-wrap">⏸</div>
            <p>¿Desactivar a <strong>{confirmDeact.email}</strong>?<br/>No podrá acceder a la app hasta que lo reactives.</p>
            <div className="confirm-actions">
              <button className="btn-export" onClick={() => setConfirmDeact(null)}>Cancelar</button>
              <button className="btn-danger" onClick={() => handleToggleActivo(confirmDeact.id, true)}>
                Sí, desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
