'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  nombre_completo: string
  carrera: string
}

export function useUser() {
  const router = useRouter()
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user)
        setProfile({
          id: user.id,
          email: user.email ?? '',
          nombre_completo: user.user_metadata?.nombre_completo ?? '',
          carrera: user.user_metadata?.carrera ?? '',
        })
      }
      setLoading(false)
    })
  }, [])

  const logout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  return { user, profile, loading, logout }
}
