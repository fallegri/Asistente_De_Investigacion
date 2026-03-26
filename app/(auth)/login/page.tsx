'use client'
// app/(auth)/login/page.tsx

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (authErr) {
      setError(
        authErr.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos. Verifica tus datos.'
          : authErr.message === 'Email not confirmed'
          ? 'Debes confirmar tu correo electrónico antes de ingresar. Revisa tu bandeja de entrada.'
          : 'Error al iniciar sesión. Intenta nuevamente.'
      )
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="space-y-7 animate-fade-in-up">

      <div>
        <h2
          className="text-[var(--color-text-primary)] leading-tight"
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.875rem' }}
        >
          Bienvenido de vuelta
        </h2>
        <p className="text-[var(--color-text-secondary)] text-sm mt-1.5">
          Ingresa con tu cuenta institucional para continuar.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="estudiante@udi.edu.bo"
            required
            autoComplete="email"
            className={cn(
              'w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-all',
              'bg-white placeholder:text-[var(--color-text-muted)]',
              error
                ? 'border-red-300 focus:border-red-400'
                : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'
            )}
          />
        </div>

        {/* Contraseña */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
              Contraseña
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[var(--color-accent)] hover:underline font-medium"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className={cn(
                'w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-all',
                'bg-white placeholder:text-[var(--color-text-muted)]',
                error
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {showPass
                ? <EyeSlashIcon className="w-4 h-4" />
                : <EyeIcon className="w-4 h-4" />
              }
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 animate-fade-in-up">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !email || !password}
          className="btn-primary w-full justify-center py-2.5 text-sm mt-2"
        >
          {loading
            ? <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Ingresando…
              </span>
            : 'Ingresar'
          }
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-text-muted)]">¿no tienes cuenta?</span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>

      <Link
        href="/register"
        className="btn-secondary w-full text-center py-2.5 text-sm block"
      >
        Crear cuenta nueva
      </Link>
    </div>
  )
}
