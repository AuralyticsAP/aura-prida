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
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setRole('viewer')
        } else if (!data.activo) {
          setRole('__deactivated__')
        } else {
          setRole(data.role ?? 'viewer')
        }
        setLoading(false)
      })
      .catch(() => {
        setRole('viewer')
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
