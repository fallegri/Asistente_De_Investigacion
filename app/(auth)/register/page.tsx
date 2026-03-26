'use client'
// app/(auth)/register/page.tsx

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

type Step = 'form' | 'verify'

export default function RegisterPage() {
  const [step, setStep]           = useState<Step>('form')
  const [nombre, setNombre]       = useState('')
  const [email, setEmail]         = useState('')
  const [carrera, setCarrera]     = useState('ingenieria_sistemas')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  // Validaciones en tiempo real
  const passwordStrength = getPasswordStrength(password)
  const passwordsMatch   = password.length > 0 && confirm.length > 0 && password === confirm
  const passwordsMismatch = confirm.length > 0 && password !== confirm

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 8)  { setError('La contraseña debe tener al menos 8 caracteres.'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          nombre_completo: nombre.trim(),
          carrera,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (authErr) {
      setError(
        authErr.message.includes('already registered')
          ? 'Este correo ya tiene una cuenta registrada. Intenta iniciar sesión.'
          : 'Error al crear la cuenta. Intenta nuevamente.'
      )
      setLoading(false)
      return
    }

    setStep('verify')
    setLoading(false)
  }

  // ---- Pantalla de confirmación ----
  if (step === 'verify') {
    return (
      <div className="space-y-6 animate-fade-in-up text-center">
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircleIcon className="w-8 h-8 text-teal-600" />
        </div>
        <div>
          <h2
            className="text-[var(--color-text-primary)]"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem' }}
          >
            Revisa tu correo
          </h2>
          <p className="text-[var(--color-text-secondary)] text-sm mt-2 leading-relaxed">
            Enviamos un enlace de confirmación a{' '}
            <strong className="text-[var(--color-text-primary)]">{email}</strong>.
            Haz clic en el enlace para activar tu cuenta.
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>¿No lo ves?</strong> Revisa la carpeta de spam o correo no deseado.
            El enlace expira en 24 horas.
          </p>
        </div>
        <Link
          href="/login"
          className="btn-primary w-full justify-center py-2.5 text-sm block"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    )
  }

  // ---- Formulario de registro ----
  return (
    <div className="space-y-6 animate-fade-in-up">

      <div>
        <h2
          className="text-[var(--color-text-primary)] leading-tight"
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.875rem' }}
        >
          Crear cuenta
        </h2>
        <p className="text-[var(--color-text-secondary)] text-sm mt-1.5">
          Regístrate con tu correo institucional de la UDI.
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">

        {/* Nombre completo */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
            Nombre completo
          </label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Juan Pérez Mamani"
            required
            autoComplete="name"
            className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] text-sm outline-none transition-all bg-white placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Carrera */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
            Carrera
          </label>
          <select
            value={carrera}
            onChange={e => setCarrera(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] text-sm outline-none transition-all bg-white focus:border-[var(--color-accent)]"
          >
            <option value="ingenieria_sistemas">Ingeniería de Sistemas</option>
            <option value="diseno_grafico">Licenciatura en Diseño Gráfico</option>
            <option value="otra">Otra carrera</option>
          </select>
        </div>

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
            className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] text-sm outline-none transition-all bg-white placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Contraseña */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-[var(--color-text-primary)]">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-[var(--color-border)] text-sm outline-none transition-all bg-white placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
            />
            <button
              type="button"
              onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              {showPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>

          {/* Indicador de fortaleza */}
          {password.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1,2,3,4].map(i => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all',
                      i <= passwordStrength.score
                        ? passwordStrength.color
                        : 'bg-[var(--color-border)]'
                    )}
                  />
                ))}
              </div>
              <p className={cn('text-xs', passwordStrength.textColor)}>
                {passwordStrength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirmar contraseña */}
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
              'w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-all bg-white placeholder:text-[var(--color-text-muted)]',
              passwordsMatch  && 'border-green-400 focus:border-green-500',
              passwordsMismatch && 'border-red-300 focus:border-red-400',
              !passwordsMatch && !passwordsMismatch && 'border-[var(--color-border)] focus:border-[var(--color-accent)]'
            )}
          />
          {passwordsMismatch && (
            <p className="text-xs text-red-600 animate-fade-in-up">Las contraseñas no coinciden.</p>
          )}
          {passwordsMatch && (
            <p className="text-xs text-green-600 animate-fade-in-up flex items-center gap-1">
              <CheckCircleIcon className="w-3.5 h-3.5" /> Las contraseñas coinciden.
            </p>
          )}
        </div>

        {/* Error global */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 animate-fade-in-up">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !nombre || !email || !password || !confirm || passwordsMismatch}
          className="btn-primary w-full justify-center py-2.5 text-sm mt-2"
        >
          {loading
            ? <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Creando cuenta…
              </span>
            : 'Crear cuenta'
          }
        </button>
      </form>

      <p className="text-center text-sm text-[var(--color-text-secondary)]">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-[var(--color-accent)] hover:underline font-medium">
          Iniciar sesión
        </Link>
      </p>
    </div>
  )
}

// ---- Utilidad: fortaleza de contraseña ----
function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
  textColor: string
} {
  if (password.length === 0) return { score: 0, label: '', color: '', textColor: '' }

  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++

  const levels = [
    { score: 1, label: 'Muy débil',  color: 'bg-red-400',    textColor: 'text-red-600' },
    { score: 2, label: 'Débil',      color: 'bg-orange-400', textColor: 'text-orange-600' },
    { score: 3, label: 'Aceptable',  color: 'bg-amber-400',  textColor: 'text-amber-600' },
    { score: 4, label: 'Segura',     color: 'bg-green-500',  textColor: 'text-green-600' },
  ]

  return levels[Math.min(score, 4) - 1] ?? levels[0]
}
