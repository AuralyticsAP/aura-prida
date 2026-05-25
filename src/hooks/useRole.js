import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRole(session) {
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user) {
      setRole(null)
      setLoading(false)
      return
    }

    supabase
      .from('user_roles')
      .select('role, activo')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!data) {
          setRole('viewer') // sin entrada = viewer por defecto
        } else if (!data.activo) {
          setRole('__deactivated__')
        } else {
          setRole(data.role ?? 'viewer')
        }
        setLoading(false)
      })
  }, [session])

  return {
    role,
    loading,
    isAdmin:    role === 'admin',
    canWrite:   role === 'admin' || role === 'editor',
    canArchive: role === 'admin' || role === 'editor',
    canDelete:  role === 'admin',
  }
}
