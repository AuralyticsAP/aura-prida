import { useState, useEffect, useCallback } from 'react'
import logoPrida from './assets/logo-prida.png'
import { supabase } from './lib/supabase'
import FormCosecha from './components/FormCosecha'
import FormVenta from './components/FormVenta'
import RegistrosHoy from './components/RegistrosHoy'
import './App.css'

const TABS = [
  { id: 'cosecha', label: 'Cosecha', icon: '🌿' },
  { id: 'venta', label: 'Venta', icon: '💰' },
  { id: 'registros', label: 'Registros', icon: '📋' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('cosecha')
  const [cosechas, setCosechas] = useState([])
  const [ventas, setVentas] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [toast, setToast] = useState(null)

  const today = new Date().toISOString().split('T')[0]

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
          <div className="header-nexobit">
            <span>by</span>
            <strong>NexoBit</strong>
          </div>
        </div>
      </header>

      <div className="summary-bar">
        <div className="summary-item">
          <span className="summary-num">{cosechas.length}</span>
          <span className="summary-label">Cosechas hoy</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="summary-num">{ventas.length}</span>
          <span className="summary-label">Ventas hoy</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
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
        {activeTab === 'cosecha' && (
          <FormCosecha onSuccess={handleCosechaSuccess} />
        )}
        {activeTab === 'venta' && (
          <FormVenta onSuccess={handleVentaSuccess} />
        )}
        {activeTab === 'registros' && (
          <RegistrosHoy
            cosechas={cosechas}
            ventas={ventas}
            loading={loadingData}
          />
        )}
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
