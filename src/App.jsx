import { useState, useEffect, useCallback } from 'react'
import logoPrida from './assets/logo-prida.png'
import { supabase } from './lib/supabase'
import FormCosecha from './components/FormCosecha'
import FormVenta from './components/FormVenta'
import RegistrosHoy from './components/RegistrosHoy'
import Login from './components/Login'
import './App.css'

const TABS = [
  { id: 'cosecha', label: 'Cosecha', icon: '🌿' },
  { id: 'venta', label: 'Venta', icon: '💰' },
  { id: 'registros', label: 'Registros', icon: '📋' },
]

export default function App() {
  const [session, setSession] = useState(undefined)
  const [activeTab, setActiveTab] = useState('cosecha')
  const [cosechas, setCosechas] = useState([])
  const [ventas, setVentas] = useState([])
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    Promise.all([
      supabase.from('productos').select('nombre').eq('activo', true).order('orden', { ascending: true }),
      supabase.from('clientes').select('nombre').eq('activo', true).order('orden', { ascending: true }),
    ]).then(([{ data: p }, { data: c }]) => {
      setProductos((p || []).map(x => x.nombre))
      setClientes((c || []).map(x => x.nombre))
    })
  }, [])

  const fetchData = useCallback(async () => {
    setLoadingData(true)
    const [{ data: c }, { data: v }] = await Promise.all([
      supabase
        .from('cosechas')
        .select('*')
        .eq('fecha', today)
        .order('created_at', { ascending: false }),
      supabase
        .from('ventas')
        .select('*')
        .eq('fecha', today)
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

  const handleCosechaSuccess = () => {
    showToast('✅ Cosecha registrada correctamente')
    setActiveTab('registros')
  }

  const handleVentaSuccess = () => {
    showToast('✅ Venta registrada correctamente')
    setActiveTab('registros')
  }

  if (session === undefined) return null
  if (!session) return <Login />

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
            <div className="header-nexobit">
              <span>by</span>
              <strong>NexoBit</strong>
            </div>
            <button className="btn-logout" onClick={() => supabase.auth.signOut()} title="Cerrar sesión">
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="summary-bar">
        <div className="summary-item">
          <span className="summary-icon">🌿</span>
          <span className="summary-num">{cosechas.length}</span>
          <span className="summary-label">Cosechas hoy</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="summary-icon">💰</span>
          <span className="summary-num">{ventas.length}</span>
          <span className="summary-label">Ventas hoy</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="summary-icon">📈</span>
          <span className="summary-num">
            ₡{ventas.reduce((s, v) => s + parseFloat(v.total || 0), 0).toLocaleString('es-CR')}
          </span>
          <span className="summary-label">Total vendido</span>
        </div>
      </div>

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

      <main className="app-main">
        <div key={activeTab} className="tab-content">
          {activeTab === 'cosecha' && (
            <FormCosecha onSuccess={handleCosechaSuccess} productos={productos} session={session} />
          )}
          {activeTab === 'venta' && (
            <FormVenta onSuccess={handleVentaSuccess} productos={productos} clientes={clientes} session={session} />
          )}
          {activeTab === 'registros' && (
            <RegistrosHoy
              cosechas={cosechas}
              ventas={ventas}
              loading={loadingData}
            />
          )}
        </div>
      </main>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}

      <footer className="app-footer">
        <p>Prida © {new Date().getFullYear()} · Desarrollado por <strong>NexoBit</strong></p>
      </footer>
    </div>
  )
}
