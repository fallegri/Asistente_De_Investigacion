'use client'
// lib/hooks/useUser.ts
// Hook para acceder al usuario autenticado en Client Components.
// Incluye logout y datos del perfil.

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  nombre_completo: string
  carrera: string
  avatar_url?: string
}

export function useUser() {
  const router = useRouter()
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Obtener sesión inicial
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        setProfile({
          id: user.id,
          email: user.email ?? '',
          nombre_completo: user.user_metadata?.nombre_completo ?? '',
          carrera: user.user_metadata?.carrera ?? '',
          avatar_url: user.user_metadata?.avatar_url,
        })
      }
      setLoading(false)
    })

    // Escuchar cambios de sesión (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          setProfile({
            id: session.user.id,
            email: session.user.email ?? '',
            nombre_completo: session.user.user_metadata?.nombre_completo ?? '',
            carrera: session.user.user_metadata?.carrera ?? '',
          })
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const logout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }, [router])

  return { user, profile, loading, logout }
}
