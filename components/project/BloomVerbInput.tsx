'use client'
// components/project/BloomVerbInput.tsx
// Input especializado para verbos con validación Bloom en tiempo real.
// Validación optimista local → confirmación canónica al guardar.

import { useState, useCallback, useRef } from 'react'
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { validarVerboLocal, getMensajeBloqueo, VERBOS_PERMITIDOS } from '@/lib/bloom/validator'
import type { BloomValidationResult } from '@/types'
import { cn } from '@/lib/utils'

interface BloomVerbInputProps {
  value: string
  onChange: (value: string, result: BloomValidationResult | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function BloomVerbInput({
  value,
  onChange,
  placeholder = 'ej. Analizar, Identificar, Evaluar…',
  disabled,
  className,
}: BloomVerbInputProps) {
  const [result, setResult] = useState<BloomValidationResult | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    onChange(raw, null)

    clearTimeout(debounceRef.current)

    if (raw.trim().length < 3) {
      setResult(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      const validation = validarVerboLocal(raw.trim())
      setResult(validation)
      onChange(raw, validation)

      if (!validation.valido && raw.trim().length >= 3) {
        setShowModal(true)
      }
    }, 400)
  }, [onChange])

  const blockedInfo = !result?.valido && value.trim().length >= 3
    ? getMensajeBloqueo(value.trim())
    : null

  const inputClass = cn(
    'w-full px-3 py-2.5 rounded-lg border text-sm transition-all outline-none font-medium',
    'bg-white placeholder:text-[var(--color-text-muted)] placeholder:font-normal',
    !result && 'border-[var(--color-border)] focus:border-[var(--color-accent)]',
    result?.valido === true  && 'verb-input-valid',
    result?.valido === false && 'verb-input-blocked',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  )

  return (
    <div className="space-y-2">
      {/* Input principal */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClass}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Icono de estado */}
        {result && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {result.valido
              ? <CheckCircleIcon className="w-4 h-4 text-green-600" />
              : <XCircleIcon className="w-4 h-4 text-red-600" />
            }
          </div>
        )}
      </div>

      {/* Feedback inline */}
      {result && (
        <div className={cn(
          'flex items-start gap-2 text-xs rounded-md px-3 py-2 animate-fade-in-up',
          result.valido
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        )}>
          <InformationCircleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{result.mensaje}</span>
        </div>
      )}

      {/* Sugerencias de verbos */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-xs text-[var(--color-accent)] hover:underline font-medium"
        >
          {showSuggestions ? 'Ocultar verbos' : 'Ver verbos permitidos'}
        </button>
      </div>

      {showSuggestions && (
        <div className="bg-[var(--color-surface-2)] rounded-lg p-3 animate-fade-in-up">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">
            Verbos válidos (Taxonomía de Bloom — nivel investigativo):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {VERBOS_PERMITIDOS.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  const capitalized = v.charAt(0).toUpperCase() + v.slice(1)
                  const validation = validarVerboLocal(capitalized)
                  setResult(validation)
                  onChange(capitalized, validation)
                  setShowSuggestions(false)
                }}
                className="px-2 py-0.5 bg-white border border-[var(--color-border)] rounded-full text-xs
                           text-[var(--color-text-primary)] hover:border-[var(--color-accent)]
                           hover:text-[var(--color-accent)] transition-colors capitalize"
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal de verbo bloqueado */}
      {showModal && blockedInfo && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in-up"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <XCircleIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)] leading-tight">
                  {blockedInfo.titulo}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {blockedInfo.explicacion}
                </p>
              </div>
            </div>

            <div className="bg-[var(--color-surface-2)] rounded-lg p-3">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">
                En cambio, puedes usar:
              </p>
              <div className="flex flex-wrap gap-2">
                {blockedInfo.sugerencias.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      const validation = validarVerboLocal(s)
                      setResult(validation)
                      onChange(s, validation)
                      setShowModal(false)
                    }}
                    className="px-3 py-1 bg-white border border-[var(--color-accent)] rounded-full
                               text-sm text-[var(--color-accent)] font-medium hover:bg-teal-50 transition-colors"
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="btn-primary w-full justify-center"
            >
              Entendido, voy a cambiar el verbo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
