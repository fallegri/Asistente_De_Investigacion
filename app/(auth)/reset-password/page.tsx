'use client'
// app/(auth)/reset-password/page.tsx
// Esta página recibe el token del email de recuperación vía hash fragment.
// Supabase lo procesa automáticamente al cargar si el usuario llega desde el link.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [ready, setReady]         = useState(false)
  const [done, setDone]           = useState(false)

  // Supabase detecta automáticamente el token en el hash fragment
  // y emite el evento PASSWORD_RECOVERY
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 8)  { setError('La contraseña debe tener al menos 8 caracteres.'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: updateErr } = await supabase.auth.updateUser({ password })

    if (updateErr) {
      setError('Error al actualizar la contraseña. El enlace puede haber expirado.')
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
    setLoading(false)
  }

  const passwordsMatch   = password.length > 0 && confirm.length > 0 && password === confirm
  const passwordsMismatch = confirm.length > 0 && password !== confirm

  if (done) {
    return (
      <div className="space-y-5 animate-fade-in-up text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircleIcon className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2
            className="text-[var(--color-text-primary)]"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem' }}
          >
            Contraseña actualizada
          </h2>
          <p className="text-[var(--color-text-secondary)] text-sm mt-2">
            Tu contraseña fue cambiada exitosamente. Redirigiendo al login…
          </p>
        </div>
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="space-y-5 animate-fade-in-up text-center">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-[var(--color-text-secondary)]">Verificando enlace…</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Si esta pantalla no avanza, el enlace puede haber expirado.{' '}
          <a href="/forgot-password" className="text-[var(--color-accent)] hover:underline">
            Solicita uno nuevo.
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2
          className="text-[var(--color-text-primary)] leading-tight"
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.875rem' }}
        >
          Nueva contraseña
        </h2>
        <p className="text-[var(--color-text-secondary)] text-sm mt-1.5">
          Elige una contraseña segura para tu cuenta.
        </p>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-[var(--color-border)] text-sm outline-none bg-white placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] transition-all"
            />
            <button type="button" onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              {showPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
            Confirmar contraseña
          </label>
          <input
            type={showPass ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repite tu contraseña"
            required
            autoComplete="new-password"
            className={cn(
              'w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none bg-white placeholder:text-[var(--color-text-muted)] transition-all',
              passwordsMatch    && 'border-green-400',
              passwordsMismatch && 'border-red-300',
              !passwordsMatch && !passwordsMismatch && 'border-[var(--color-border)] focus:border-[var(--color-accent)]'
            )}
          />
          {passwordsMismatch && <p className="text-xs text-red-600">Las contraseñas no coinciden.</p>}
          {passwordsMatch    && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircleIcon className="w-3.5 h-3.5" /> Coinciden.</p>}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !password || !confirm || passwordsMismatch}
          className="btn-primary w-full justify-center py-2.5 text-sm"
        >
          {loading
            ? <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Actualizando…
              </span>
            : 'Actualizar contraseña'
          }
        </button>
      </form>
    </div>
  )
}
