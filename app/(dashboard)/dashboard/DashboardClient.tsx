'use client'
// app/(dashboard)/dashboard/DashboardClient.tsx
// CLIENT COMPONENT — solo maneja el estado del modal y la navegación.
// Recibe proyectos ya cargados como props. Sin fetching de auth aquí.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlusIcon, BeakerIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import type { Project, CareerType } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  init:        { label: 'Inicio',             color: 'bg-stone-100 text-stone-600' },
  diagnosis:   { label: 'Diagnóstico',        color: 'bg-blue-50 text-blue-700' },
  objectives:  { label: 'Objetivos',          color: 'bg-purple-50 text-purple-700' },
  literature:  { label: 'Estado de Cuestión', color: 'bg-amber-50 text-amber-700' },
  methodology: { label: 'Metodología',        color: 'bg-teal-50 text-teal-700' },
  complete:    { label: 'Finalizado',          color: 'bg-green-50 text-green-700' },
}

interface Props {
  initialProjects: Project[]
  userId: string
}

export function DashboardClient({ initialProjects, userId }: Props) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [showModal, setShowModal] = useState(false)

  const navigateToProject = (project: Project) => {
    const routes: Record<string, string> = {
      init:        'diagnostico',
      diagnosis:   'diagnostico',
      objectives:  'objetivos',
      literature:  'literatura',
      methodology: 'metodologia',
      complete:    'exportar',
    }
    router.push(`/proyecto/${project.id}/${routes[project.status]}`)
  }

  const handleProjectCreated = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev])
    setShowModal(false)
    router.push(`/proyecto/${newProject.id}/diagnostico`)
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest font-semibold mb-0.5">
              Asistente de Investigación
            </p>
            <h1 className="font-display text-xl sm:text-2xl">Mis Proyectos</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary self-start sm:self-auto"
          >
            <PlusIcon className="w-4 h-4" />
            Nuevo Proyecto
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Activos',     value: projects.filter(p => p.status !== 'complete').length,                    icon: BeakerIcon,      color: 'text-teal-600' },
            { label: 'En progreso', value: projects.filter(p => !['init','complete'].includes(p.status)).length,    icon: ClockIcon,       color: 'text-amber-600' },
            { label: 'Finalizados', value: projects.filter(p => p.status === 'complete').length,                    icon: CheckCircleIcon, color: 'text-green-600' },
          ].map(stat => (
            <div key={stat.label} className="card-research flex items-center gap-2 sm:gap-4 p-3 sm:p-6">
              <stat.icon className={cn('w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0', stat.color)} />
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
                <p className="text-xs text-[var(--color-text-secondary)] truncate">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Lista de proyectos */}
        <div>
          <h2 className="font-semibold text-[var(--color-text-secondary)] text-xs uppercase tracking-wider mb-4">
            Proyectos
          </h2>

          {projects.length === 0 && (
            <div className="card-research text-center py-12 px-4">
              <BeakerIcon className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
              <p className="font-display text-xl text-[var(--color-text-secondary)]">
                Aún no tienes proyectos
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-4">
                Crea tu primer perfil de investigación para comenzar
              </p>
              <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
                <PlusIcon className="w-4 h-4" />
                Crear primer proyecto
              </button>
            </div>
          )}

          <div className="space-y-3">
            {projects.map((project, i) => {
              const badge = STATUS_BADGE[project.status] ?? STATUS_BADGE.init
              return (
                <button
                  key={project.id}
                  onClick={() => navigateToProject(project)}
                  className="card-research w-full text-left hover:border-[var(--color-accent)] transition-colors group animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', badge.color)}>
                          {badge.label}
                        </span>
                        {project.is_exploratory_exception && (
                          <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                            Exploratoria
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm sm:text-base text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                        {project.titulo_tentativo || (
                          <span className="italic text-[var(--color-text-muted)]">Sin título</span>
                        )}
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5 truncate">
                        {project.area_estudio}
                      </p>
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] flex-shrink-0 text-right">
                      {new Date(project.created_at).toLocaleDateString('es-BO', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

      </main>

      {showModal && (
        <NewProjectModal
          userId={userId}
          onClose={() => setShowModal(false)}
          onCreated={handleProjectCreated}
        />
      )}
    </div>
  )
}

// ---- Modal nuevo proyecto ----

function NewProjectModal({
  userId,
  onClose,
  onCreated,
}: {
  userId: string
  onClose: () => void
  onCreated: (project: Project) => void
}) {
  const [form, setForm] = useState({
    institucion: '',
    carrera: '',
    area_estudio: '',
    titulo_tentativo: '',
    carga_horaria_confirmada: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.institucion.trim())        { setError('La institución es obligatoria.'); return }
    if (!form.carrera.trim())            { setError('La carrera es obligatoria.'); return }
    if (!form.area_estudio.trim())       { setError('El área de estudio es obligatoria.'); return }
    if (!form.carga_horaria_confirmada)  { setError('Debes confirmar el compromiso académico.'); return }

    setSaving(true)
    setError('')

    const supabase = createClient()
    const { data, error: dbErr } = await supabase
      .from('projects')
      .insert({
        user_id:                  userId,
        escuela:                  form.institucion.trim(),
        carrera:                  'otra' as CareerType,
        area_estudio:             `${form.carrera.trim()} — ${form.area_estudio.trim()}`,
        titulo_tentativo:         form.titulo_tentativo.trim() || null,
        carga_horaria_confirmada: true,
        status:                   'init',
      })
      .select()
      .single()

    if (dbErr) {
      setError(`Error: ${dbErr.message}`)
      setSaving(false)
      return
    }

    onCreated(data as Project)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <div className="p-6 space-y-5">

          <div>
            <h2 className="font-display text-2xl">Nuevo Proyecto de Investigación</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Completa los datos para iniciar tu perfil
            </p>
          </div>

          <div className="space-y-4">

            <div>
              <label className="block text-sm font-semibold mb-1.5">Institución académica *</label>
              <input
                type="text"
                value={form.institucion}
                onChange={e => setForm(f => ({ ...f, institucion: e.target.value }))}
                placeholder="ej. Universidad Mayor de San Andrés"
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:border-[var(--color-accent)] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Carrera *</label>
              <input
                type="text"
                value={form.carrera}
                onChange={e => setForm(f => ({ ...f, carrera: e.target.value }))}
                placeholder="ej. Ingeniería de Sistemas"
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:border-[var(--color-accent)] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Área de estudio / Empresa o contexto *</label>
              <input
                type="text"
                value={form.area_estudio}
                onChange={e => setForm(f => ({ ...f, area_estudio: e.target.value }))}
                placeholder="ej. Empresa manufacturera del sector textil, La Paz"
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:border-[var(--color-accent)] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Título tentativo{' '}
                <span className="text-[var(--color-text-muted)] font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={form.titulo_tentativo}
                onChange={e => setForm(f => ({ ...f, titulo_tentativo: e.target.value }))}
                placeholder="Puedes definirlo más adelante"
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:border-[var(--color-accent)] outline-none"
              />
            </div>

            <div
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors select-none',
                form.carga_horaria_confirmada
                  ? 'border-[var(--color-accent)] bg-teal-50'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-2)]'
              )}
              onClick={() => setForm(f => ({ ...f, carga_horaria_confirmada: !f.carga_horaria_confirmada }))}
            >
              <div className={cn(
                'w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors',
                form.carga_horaria_confirmada
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                  : 'border-stone-300'
              )}>
                {form.carga_horaria_confirmada && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Confirmo mi compromiso académico
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  Declaro que este proyecto es un trabajo de investigación académica y me comprometo
                  a completar todas las fases del proceso con rigor metodológico.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary flex-1 justify-center"
            >
              {saving
                ? <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Creando…
                  </span>
                : 'Crear Proyecto'
              }
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
