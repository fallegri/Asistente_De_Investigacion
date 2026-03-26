'use client'
// components/layout/DashboardHeader.tsx
// Header superior del dashboard con datos del usuario y menú de cierre de sesión.

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@/lib/hooks/useUser'
import {
  ChevronDownIcon, ArrowRightStartOnRectangleIcon,
  UserCircleIcon, HomeIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

const CARRERA_LABELS: Record<string, string> = {
  ingenieria_sistemas: 'Ing. de Sistemas',
  diseno_grafico:      'Lic. Diseño Gráfico',
  otra:                'EIT',
}

export function DashboardHeader() {
  const { profile, loading, logout } = useUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = profile?.nombre_completo
    ? profile.nombre_completo.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  return (
    <header className="bg-white border-b border-[var(--color-border)] sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-teal-700 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-stone-700 leading-none">Asistente de Investigación</p>
            <p className="text-[10px] text-[var(--color-text-muted)] leading-none mt-0.5">EIT — UDI</p>
          </div>
        </Link>

        {/* Navegación central (opcional, para futuro) */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-all"
          >
            <HomeIcon className="w-3.5 h-3.5" />
            Mis proyectos
          </Link>
        </nav>

        {/* Menú de usuario */}
        {!loading && profile && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-[var(--color-surface-2)] transition-colors"
            >
              {/* Avatar con iniciales */}
              <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-teal-700">{initials}</span>
              </div>

              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-[var(--color-text-primary)] leading-none">
                  {profile.nombre_completo || profile.email}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)] leading-none mt-0.5">
                  {CARRERA_LABELS[profile.carrera] ?? 'EIT'}
                </p>
              </div>

              <ChevronDownIcon className={cn(
                'w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform',
                menuOpen && 'rotate-180'
              )} />
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-[var(--color-border)] rounded-xl shadow-lg py-1.5 z-50 animate-fade-in-up">

                {/* Info del usuario */}
                <div className="px-3.5 py-2.5 border-b border-[var(--color-border)]">
                  <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                    {profile.nombre_completo || 'Sin nombre'}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate mt-0.5">
                    {profile.email}
                  </p>
                </div>

                {/* Acciones */}
                <div className="py-1">
                  <button
                    onClick={async () => { setMenuOpen(false); await logout() }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Skeleton mientras carga */}
        {loading && (
          <div className="w-32 h-7 bg-stone-100 rounded-xl animate-pulse" />
        )}

      </div>
    </header>
  )
}
