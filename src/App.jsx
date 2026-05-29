import { useState, useEffect, useCallback, useRef } from 'react'
import confetti from 'canvas-confetti'
import logoPrida from './assets/logo-prida.png'
import { supabase } from './lib/supabase'
import { useCountUp } from './hooks/useCountUp'
import { useRole } from './hooks/useRole'
import FormCosecha from './components/FormCosecha'
import FormVenta from './components/FormVenta'
import Registros from './components/Registros'
import Proveedores from './components/Proveedores'
import Usuarios from './components/Usuarios'
import GestionProductos from './components/GestionProductos'
import Dashboard from './components/Dashboard'
import Compras from './components/Compras'
import Mermas from './components/Mermas'
import Devoluciones from './components/Devoluciones'
import Gastos from './components/Gastos'
import Personal from './components/Personal'
import Login from './components/Login'
import './App.css'

const ALL_TABS = [
  { id: 'cosecha',     label: 'Cosecha',     icon: '🌿' },
  { id: 'venta',       label: 'Venta',       icon: '💰' },
  { id: 'registros',   label: 'Registros',   icon: '📋' },
  { id: 'compras',     label: 'Compras',     icon: '🛒' },
  { id: 'mermas',       label: 'Mermas',       icon: '⚠️' },
  { id: 'devoluciones', label: 'Devoluciones', icon: '↩️' },
  { id: 'gastos',       label: 'Gastos',       icon: '💸' },
  { id: 'personal',     label: 'Personal',     icon: '👷' },
  { id: 'dashboard',    label: 'Dashboard',    icon: '📊' },
  { id: 'proveedores', label: 'Proveedores', icon: '🏭' },
  { id: 'catalogos',   label: 'Catálogos',   icon: '🥬', adminOnly: true },
  { id: 'usuarios',    label: 'Usuarios',    icon: '👥', adminOnly: true },
]

function SinPermiso({ mensaje }) {
  return (
    <div className="card sin-permiso-card">
      <span className="sin-permiso-icon">🔒</span>
      <p>{mensaje}</p>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [activeTab, setActiveTab] = useState('cosecha')
  const [cosechas, setCosechas] = useState([])
  const [ventas, setVentas] = useState([])
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [fincas, setFincas] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [toast, setToast] = useState(null)

  const signOutExplicit = useRef(false)

  const handleSignOut = useCallback(() => {
    signOutExplicit.current = true
    supabase.auth.signOut()
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !signOutExplicit.current) {
        // Refresh de token falló en background — verificar si la sesión sigue válida
        // antes de expulsar al usuario
        supabase.auth.getSession().then(({ data }) => setSession(data.session))
        return
      }
      if (event === 'SIGNED_OUT') signOutExplicit.current = false
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const { role, loading: roleLoading, isAdmin, canWrite, canArchive, canDelete } = useRole(session)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    Promise.all([
      supabase.from('productos').select('nombre').eq('activo', true).order('orden', { ascending: true }),
      supabase.from('clientes').select('nombre').eq('activo', true).order('orden', { ascending: true }),
      supabase.from('fincas').select('id,nombre').eq('activo', true).order('id', { ascending: true }),
    ]).then(([{ data: p }, { data: c }, { data: f }]) => {
      setProductos((p || []).map(x => x.nombre))
      setClientes((c || []).map(x => x.nombre))
      setFincas(f || [])
    })
  }, [])

  const fetchData = useCallback(async () => {
    setLoadingData(true)
    const [{ data: c }, { data: v }] = await Promise.all([
      supabase
        .from('cosechas')
        .select('*')
        .eq('fecha', today)
        .eq('estado', 'activo')
        .order('created_at', { ascending: false }),
      supabase
        .from('ventas')
        .select('*')
        .eq('fecha', today)
        .eq('estado', 'activo')
        .order('created_at', { ascending: false }),
    ])
    setCosechas(c || [])
    setVentas(v || [])
    setLoadingData(false)
  }, [today])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const subCosechas = supabase
      .channel('cosechas-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cosechas' }, payload => {
        if (payload.new.fecha === today) {
          setCosechas(prev => [payload.new, ...prev])
        }
      })
      .subscribe()

    const subVentas = supabase
      .channel('ventas-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ventas' }, payload => {
        if (payload.new.fecha === today) {
          setVentas(prev => [payload.new, ...prev])
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subCosechas)
      supabase.removeChannel(subVentas)
    }
  }, [today])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleArchive = async (tabla, id) => {
    const { error } = await supabase.from(tabla).update({ estado: 'archivado' }).eq('id', id)
    if (error) { showToast('Error al archivar', 'error'); return }
    if (tabla === 'cosechas') setCosechas(prev => prev.filter(r => r.id !== id))
    if (tabla === 'ventas')   setVentas(prev => prev.filter(r => r.id !== id))
    showToast('📦 Registro archivado')
  }

  const handleDelete = async (tabla, id) => {
    const { error } = await supabase.from(tabla).delete().eq('id', id)
    if (error) { showToast('Error al eliminar', 'error'); return }
    if (tabla === 'cosechas') setCosechas(prev => prev.filter(r => r.id !== id))
    if (tabla === 'ventas')   setVentas(prev => prev.filter(r => r.id !== id))
    showToast('Registro eliminado')
  }

  const handleCosechaSuccess = () => {
    showToast('✅ Cosecha registrada correctamente')
    setActiveTab('registros')
  }

  const handleVentaSuccess = () => {
    showToast('✅ Venta registrada correctamente')
    setActiveTab('registros')
    const colors = ['#3AAE38', '#C4A012', '#D4B828', '#ffffff']
    confetti({ particleCount: 55, angle: 60,  spread: 55, origin: { x: 0,    y: 0.7 }, colors, gravity: 0.85, scalar: 0.9 })
    confetti({ particleCount: 55, angle: 120, spread: 55, origin: { x: 1,    y: 0.7 }, colors, gravity: 0.85, scalar: 0.9 })
    setTimeout(() => {
      confetti({ particleCount: 30, angle: 75,  spread: 40, origin: { x: 0.25, y: 0.5 }, colors, gravity: 0.7, scalar: 0.8 })
      confetti({ particleCount: 30, angle: 105, spread: 40, origin: { x: 0.75, y: 0.5 }, colors, gravity: 0.7, scalar: 0.8 })
    }, 750)
  }

  const totalVendido  = ventas.reduce((s, v) => s + parseFloat(v.total || 0), 0)
  const animCosechas  = useCountUp(cosechas.length)
  const animVentas    = useCountUp(ventas.length)
  const animTotal     = useCountUp(totalVendido)

  if (session === undefined) return null
  if (!session) return <Login />

  // Cuenta desactivada
  if (!roleLoading && role === '__deactivated__') {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center', gap: 20 }}>
          <img src={logoPrida} alt="Prida" className="login-logo" />
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Tu cuenta ha sido <strong style={{ color: '#f87171' }}>desactivada</strong>.<br />
            Contactá al administrador del sistema.
          </p>
          <button className="btn-danger" onClick={handleSignOut}>
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  const TABS = roleLoading
    ? ALL_TABS.filter(t => !t.adminOnly)
    : ALL_TABS.filter(t => !t.adminOnly || isAdmin)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <img src={logoPrida} alt="Prida" className="brand-logo-img" />
            <div>
              <h1 className="brand-title">Prida</h1>
              <p className="brand-sub">Sistema Agrícola</p>
            </div>
          </div>
          <div className="header-right">
            {!roleLoading && role && (
              <span className={`role-badge header-role-badge ${
                role === 'admin' ? 'badge-admin' : role === 'editor' ? 'badge-editor' : 'badge-viewer'
              }`}>
                {role === 'admin' ? 'Admin' : role === 'editor' ? 'Editor' : 'Viewer'}
              </span>
            )}
            <div className="header-nexobit">
              <span>by</span>
              <strong>AuralyticsAP</strong>
            </div>
            <button className="btn-logout" onClick={handleSignOut} title="Cerrar sesión">
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="summary-bar">
        <div className="summary-item">
          <span className="summary-icon">🌿</span>
          <span className="summary-num">{Math.round(animCosechas)}</span>
          <span className="summary-label">Cosechas hoy</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="summary-icon">💰</span>
          <span className="summary-num">{Math.round(animVentas)}</span>
          <span className="summary-label">Ventas hoy</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="summary-icon">📈</span>
          <span className="summary-num">
            ₡{Math.round(animTotal).toLocaleString('es-CR')}
          </span>
          <span className="summary-label">Total vendido</span>
        </div>
      </div>

      <div className="tab-nav-wrap">
        <nav className="tab-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <main className="app-main">
        <div key={activeTab} className="tab-content">
          {roleLoading ? (
            <div className="loading-state">Cargando...</div>
          ) : (
            <>
              {activeTab === 'cosecha' && (
                canWrite
                  ? <FormCosecha onSuccess={handleCosechaSuccess} productos={productos} fincas={fincas} session={session} />
                  : <SinPermiso mensaje="No tienes permiso para registrar cosechas." />
              )}
              {activeTab === 'venta' && (
                canWrite
                  ? <FormVenta onSuccess={handleVentaSuccess} productos={productos} clientes={clientes} fincas={fincas} session={session} />
                  : <SinPermiso mensaje="No tienes permiso para registrar ventas." />
              )}
              {activeTab === 'registros' && (
                <Registros
                  onRefresh={fetchData}
                  canArchive={canArchive}
                  canDelete={canDelete}
                />
              )}
              {activeTab === 'compras' && (
                <Compras
                  fincas={fincas}
                  session={session}
                  showToast={showToast}
                  canWrite={canWrite}
                  canArchive={canArchive}
                  canDelete={canDelete}
                />
              )}
              {activeTab === 'mermas' && (
                <Mermas
                  fincas={fincas}
                  session={session}
                  showToast={showToast}
                  canWrite={canWrite}
                  canArchive={canArchive}
                  canDelete={canDelete}
                />
              )}
              {activeTab === 'devoluciones' && (
                <Devoluciones
                  fincas={fincas}
                  session={session}
                  showToast={showToast}
                  canWrite={canWrite}
                  canArchive={canArchive}
                  canDelete={canDelete}
                />
              )}
              {activeTab === 'gastos' && (
                <Gastos
                  fincas={fincas}
                  session={session}
                  showToast={showToast}
                  canWrite={canWrite}
                  canArchive={canArchive}
                  canDelete={canDelete}
                />
              )}
              {activeTab === 'personal' && (
                <Personal
                  fincas={fincas}
                  session={session}
                  showToast={showToast}
                  canWrite={canWrite}
                  canArchive={canArchive}
                  canDelete={canDelete}
                />
              )}
              {activeTab === 'dashboard' && (
                <Dashboard />
              )}
              {activeTab === 'proveedores' && (
                <Proveedores
                  session={session}
                  showToast={showToast}
                  canWrite={canWrite}
                  canArchive={canArchive}
                  canDelete={canDelete}
                />
              )}
              {activeTab === 'catalogos' && isAdmin && (
                <GestionProductos showToast={showToast} />
              )}
              {activeTab === 'usuarios' && isAdmin && (
                <Usuarios session={session} showToast={showToast} />
              )}
            </>
          )}
        </div>
      </main>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}

      <a
        className="whatsapp-fab"
        href="https://wa.me/50671876371?text=Hola%2C%20me%20comunico%20desde%20el%20sistema%20Prida%20de%20AuralyticsAP."
        target="_blank"
        rel="noopener noreferrer"
        title="Contactar por WhatsApp"
      >
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      <footer className="app-footer">
        <p>Prida © {new Date().getFullYear()} · Desarrollado por <strong>AuralyticsAP</strong></p>
      </footer>
    </div>
  )
}
