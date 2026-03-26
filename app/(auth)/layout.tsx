// app/(auth)/layout.tsx
// Layout compartido para las páginas de autenticación.
// Diseño: pantalla dividida — panel institucional izquierdo + formulario derecho.

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Acceso — Asistente de Investigación UDI',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* Panel izquierdo — identidad institucional */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-stone-900 flex-col justify-between p-12 overflow-hidden">

        {/* Textura de fondo */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              #ffffff 0px,
              #ffffff 1px,
              transparent 1px,
              transparent 12px
            )`
          }}
        />

        {/* Acento de color en esquina superior */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-400 via-teal-600 to-transparent" />

        {/* Logo / nombre institucional */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-teal-400 text-xs font-bold uppercase tracking-widest">EIT — UDI</p>
            </div>
          </div>
          <h1
            className="text-white mt-6 leading-[1.1]"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3vw, 2.75rem)' }}
          >
            Asistente Digital<br />
            <span className="text-teal-400">de Investigación</span>
          </h1>
          <p className="text-stone-400 mt-4 text-sm leading-relaxed max-w-sm">
            Sistema de guía académica para la formulación de perfiles de investigación,
            basado en el formulario MDG100.
          </p>
        </div>

        {/* Características del sistema */}
        <div className="relative z-10 space-y-4">
          {[
            { icon: '🎯', title: 'Validación metodológica', desc: 'Taxonomía de Bloom aplicada en tiempo real' },
            { icon: '🤖', title: 'Asistencia con IA', desc: 'Retroalimentación socrática en cada fase' },
            { icon: '📄', title: 'Exportación APA 7', desc: 'Documento listo para revisión académica' },
          ].map((feat) => (
            <div key={feat.title} className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{feat.icon}</span>
              <div>
                <p className="text-white text-sm font-semibold">{feat.title}</p>
                <p className="text-stone-500 text-xs mt-0.5">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer institucional */}
        <div className="relative z-10">
          <p className="text-stone-600 text-xs">
            Universidad para el Desarrollo y la Innovación<br />
            Escuela de Informática y Telecomunicaciones
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-[var(--color-surface)]">

        {/* Logo mobile (solo visible en pantallas pequeñas) */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-bold text-stone-700">EIT — UDI</span>
        </div>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          {children}
        </div>
      </div>

    </div>
  )
}
