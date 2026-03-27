'use client'
// components/stepper/ProjectStepper.tsx
// Stepper siempre visible que muestra la fase actual del proyecto.
// Los pasos bloqueados no son clickeables.

import { CheckIcon, LockClosedIcon } from '@heroicons/react/24/solid'
import { useProjectStore } from '@/lib/store/project-store'
import { STATE_LABELS, STATE_MACHINE_ORDER, type ProjectStatus } from '@/types'
import { useRouter, useParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const STEPS: { status: ProjectStatus; route?: string }[] = [
  { status: 'init' },
  { status: 'diagnosis',   route: 'diagnostico' },
  { status: 'objectives',  route: 'objetivos' },
  { status: 'literature',  route: 'literatura' },
  { status: 'methodology', route: 'metodologia' },
  { status: 'complete',    route: 'exportar' },
]

export function ProjectStepper() {
  const { project, alerts } = useProjectStore()
  const router = useRouter()
  const params = useParams()
  const projectId = params?.id as string

  if (!project) return null

  const currentIdx = STATE_MACHINE_ORDER.indexOf(project.status)

  const handleStepClick = (step: typeof STEPS[0], idx: number) => {
    if (idx > currentIdx) return // Bloqueado
    if (!step.route || !projectId) return
    router.push(`/proyecto/${projectId}/${step.route}`)
  }

  return (
    <div className="bg-white border-b border-[var(--color-border)] sticky top-0 z-40 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">

        {/* Header del proyecto */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest font-semibold">
              EIT — Perfil de Investigación
            </p>
            <h2 className="font-display text-base sm:text-lg text-[var(--color-text-primary)] leading-tight">
              {project.titulo_tentativo || 'Sin título aún'}
            </h2>
          </div>

          {/* Badge de alertas activas */}
          {alerts.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-amber-700">
                {alerts.length} alerta{alerts.length > 1 ? 's' : ''} de consistencia
              </span>
            </div>
          )}
        </div>

        {/* Stepper track */}
        <div className="relative">
          {/* Línea de fondo */}
          <div
            className="absolute top-4 left-4 right-4 h-0.5 bg-[var(--color-border)]"
            aria-hidden="true"
          />
          {/* Línea de progreso */}
          <div
            className="absolute top-4 left-4 h-0.5 bg-[var(--color-accent)] transition-all duration-500"
            style={{ width: `${(currentIdx / (STEPS.length - 1)) * calc}%` }}
            aria-hidden="true"
          />

          <ol className="relative flex items-start justify-between">
            {STEPS.map((step, idx) => {
              const isCompleted = idx < currentIdx
              const isActive    = idx === currentIdx
              const isLocked    = idx > currentIdx
              const label       = STATE_LABELS[step.status]

              return (
                <li
                  key={step.status}
                  className="flex flex-col items-center gap-2"
                  style={{ width: `${100 / STEPS.length}%` }}
                >
                  <button
                    onClick={() => handleStepClick(step, idx)}
                    disabled={isLocked}
                    title={isLocked ? 'Completa la fase anterior para acceder' : label}
                    className={cn(
                      'step-indicator transition-all',
                      isCompleted && 'completed cursor-pointer',
                      isActive && 'active cursor-default',
                      isLocked && 'locked cursor-not-allowed'
                    )}
                  >
                    {isCompleted ? (
                      <CheckIcon className="w-3.5 h-3.5" />
                    ) : isLocked ? (
                      <LockClosedIcon className="w-3 h-3" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </button>

                  <span
                    className={cn(
                      'hidden sm:block text-center text-xs font-medium leading-tight max-w-[80px]',
                      isActive    && 'text-[var(--color-text-primary)]',
                      isCompleted && 'text-[var(--color-accent)]',
                      isLocked    && 'text-[var(--color-text-muted)]'
                    )}
                  >
                    {label}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}

// Helper para calcular el ancho de la línea de progreso
// (no puede ser una expresión inline en el JSX por limitaciones de Tailwind)
const calc = 100
