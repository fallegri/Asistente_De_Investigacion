'use client'
// app/(auth)/forgot-password/page.tsx

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeftIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

type Step = 'form' | 'sent'

export default function ForgotPasswordPage() {
  const [step, setStep]     = useState<Step>('form')
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authErr } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password` }
    )

    // Por seguridad, no revelamos si el correo existe o no
    if (authErr && !authErr.message.includes('not found')) {
      setError('Error al enviar el correo. Intenta nuevamente.')
      setLoading(false)
      return
    }

    setStep('sent')
    setLoading(false)
  }

  if (step === 'sent') {
    return (
      <div className="space-y-6 animate-fade-in-up text-center">
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
          <EnvelopeIcon className="w-8 h-8 text-teal-600" />
        </div>
        <div>
          <h2
            className="text-[var(--color-text-primary)]"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem' }}
          >
            Revisa tu correo
          </h2>
          <p className="text-[var(--color-text-secondary)] text-sm mt-2 leading-relaxed">
            Si <strong className="text-[var(--color-text-primary)]">{email}</strong> tiene
            una cuenta, recibirás un enlace para restablecer tu contraseña.
          </p>
        </div>
        <div className="bg-stone-100 rounded-lg p-4 text-left">
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            El enlace expira en <strong>1 hora</strong>. Si no ves el correo,
            revisa la carpeta de spam.
          </p>
        </div>
        <Link href="/login" className="btn-secondary w-full text-center py-2.5 text-sm block">
          Volver a iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-4 transition-colors"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Volver al login
        </Link>
        <h2
          className="text-[var(--color-text-primary)] leading-tight"
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.875rem' }}
        >
          Restablecer contraseña
        </h2>
        <p className="text-[var(--color-text-secondary)] text-sm mt-1.5">
          Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email}
          className="btn-primary w-full justify-center py-2.5 text-sm"
        >
          {loading
            ? <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Enviando…
              </span>
            : 'Enviar enlace de recuperación'
          }
        </button>
      </form>
    </div>
  )
}
