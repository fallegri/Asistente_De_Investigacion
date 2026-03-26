'use client'
// app/(dashboard)/dashboard/page.tsx
// Dashboard principal: lista de proyectos del estudiante + crear nuevo

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlusIcon, BeakerIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import type { Project, CareerType } from '@/types'
import { STATE_LABELS } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  init:        { label: 'Inicio',              color: 'bg-stone-100 text-stone-600' },
  diagnosis:   { label: 'Diagnóstico',         color: 'bg-blue-50 text-blue-700' },
  objectives:  { label: 'Objetivos',           color: 'bg-purple-50 text-purple-700' },
  literature:  { label: 'Estado de Cuestión',  color: 'bg-amber-50 text-amber-700' },
  methodology: { label: 'Metodología',         color: 'bg-teal-50 text-teal-700' },
  complete:    { label: 'Finalizado',           color: 'bg-green-50 text-green-700' },
}

const CAREER_LABELS: Record<CareerType, string> = {
  ingenieria_sistemas: 'Ing. de Sistemas',
  diseno_grafico:      'Lic. Diseño Gráfico',
  otra:                'Otra carrera',
}

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('projects').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        setProjects(data as Project[] ?? [])
        setLoading(false)
      })
  }, [])

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

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Page title + action */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest font-semibold mb-0.5">
              Universidad para el Desarrollo y la Innovación
            </p>
            <h1 className="font-display text-2xl">
              Mis Proyectos de Investigación
            </h1>
          </div>
          <button onClick={() => setShowNewModal(true)} className="btn-primary">
            <PlusIcon className="w-4 h-4" />
            Nuevo Proyecto
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Proyectos activos', value: projects.filter(p => p.status !== 'complete').length, icon: BeakerIcon, color: 'text-teal-600' },
            { label: 'En progreso',        value: projects.filter(p => !['init','complete'].includes(p.status)).length, icon: ClockIcon, color: 'text-amber-600' },
            { label: 'Finalizados',        value: projects.filter(p => p.status === 'complete').length, icon: CheckCircleIcon, color: 'text-green-600' },
          ].map(stat => (
            <div key={stat.label} className="card-research flex items-center gap-4">
              <stat.icon className={cn('w-8 h-8', stat.color)} />
              <div>
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Project list */}
        <div>
          <h2 className="font-semibold text-[var(--color-text-secondary)] text-sm uppercase tracking-wider mb-4">
            Mis Proyectos
          </h2>

          {loading && (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="card-research animate-pulse">
                  <div className="h-4 bg-stone-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-stone-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {!loading && projects.length === 0 && (
            <div className="card-research text-center py-12">
              <BeakerIcon className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
              <p className="font-display text-xl text-[var(--color-text-secondary)]">
                Aún no tienes proyectos
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-4">
                Crea tu primer perfil de investigación para comenzar
              </p>
              <button onClick={() => setShowNewModal(true)} className="btn-primary mx-auto">
                <PlusIcon className="w-4 h-4" /> Crear primer proyecto
              </button>
            </div>
          )}

          <div className="space-y-3">
            {projects.map((project, i) => {
              const badge = STATUS_BADGE[project.status]
              return (
                <button
                  key={project.id}
                  onClick={() => navigateToProject(project)}
                  className="card-research w-full text-left hover:border-[var(--color-accent)] transition-colors group animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', badge.color)}>
                          {badge.label}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {CAREER_LABELS[project.carrera]}
                        </span>
                        {project.is_exploratory_exception && (
                          <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                            Investigación Exploratoria
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                        {project.titulo_tentativo || <span className="italic text-[var(--color-text-muted)]">Sin título</span>}
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                        {project.area_estudio}
                      </p>
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] flex-shrink-0 text-right">
                      {new Date(project.created_at).toLocaleDateString('es-BO', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </main>

      {/* Modal nuevo proyecto */}
      {showNewModal && (
        <NewProjectModal
          onClose={() => setShowNewModal(false)}
          onCreated={(id) => router.push(`/proyecto/${id}/diagnostico`)}
        />
      )}
    </div>
  )
}

// ---- Modal de creación de proyecto ----

function NewProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [form, setForm] = useState({
    carrera: 'ingenieria_sistemas' as CareerType,
    area_estudio: '',
    titulo_tentativo: '',
    carga_horaria_confirmada: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.area_estudio.trim()) { setError('El área de estudio es obligatoria.'); return }
    if (!form.carga_horaria_confirmada) { setError('Debes confirmar la carga horaria de 400 horas.'); return }

    setSaving(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) { setError('Debes iniciar sesión.'); setSaving(false); return }

    const { data, error: dbErr } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        escuela: 'EIT',
        carrera: form.carrera,
        area_estudio: form.area_estudio,
        titulo_tentativo: form.titulo_tentativo || null,
        carga_horaria_confirmada: form.carga_horaria_confirmada,
        status: 'init',
      })
      .select()
      .single()

    if (dbErr) { setError(dbErr.message); setSaving(false); return }
    onCreated(data.id)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-fade-in-up">
        <div>
          <h2 className="font-display text-2xl">Nuevo Perfil de Investigación</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Formulario MDG100 — Escuela de Informática y Telecomunicaciones
          </p>
        </div>

        <div className="space-y-4">
          {/* Carrera */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Carrera *</label>
            <select
              value={form.carrera}
              onChange={e => setForm(f => ({ ...f, carrera: e.target.value as CareerType }))}
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white"
            >
              <option value="ingenieria_sistemas">Ingeniería de Sistemas</option>
              <option value="diseno_grafico">Licenciatura en Diseño Gráfico</option>
              <option value="otra">Otra</option>
            </select>
          </div>

          {/* Área de estudio */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">Área de Estudio / Empresa *</label>
            <input
              type="text"
              value={form.area_estudio}
              onChange={e => setForm(f => ({ ...f, area_estudio: e.target.value }))}
              placeholder="ej. Empresa manufacturera del sector textil, La Paz"
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:border-[var(--color-accent)] outline-none"
            />
          </div>

          {/* Título tentativo */}
          <div>
            <label className="block text-sm font-semibold mb-1.5">
              Título Tentativo <span className="text-[var(--color-text-muted)] font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.titulo_tentativo}
              onChange={e => setForm(f => ({ ...f, titulo_tentativo: e.target.value }))}
              placeholder="Puedes definirlo más adelante"
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:border-[var(--color-accent)] outline-none"
            />
          </div>

          {/* Checkbox 400 horas */}
          <div
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors',
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
                Confirmo la carga horaria de 400 horas
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Declaro conocer que el proyecto de grado debe cubrir 400 horas académicas según el reglamento de graduación de la UDI.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary flex-1 justify-center"
          >
            {saving ? 'Creando…' : 'Crear Proyecto'}
          </button>
        </div>
      </div>
    </div>
  )
}
