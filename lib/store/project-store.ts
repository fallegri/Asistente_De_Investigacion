// lib/store/project-store.ts
// Zustand store central: controla la State Machine del proyecto
// y sincroniza con Supabase en tiempo real.

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type {
  Project, Evidence, Objective, LiteratureArticle,
  Methodology, ConsistencyAlert, ProjectStatus,
  StateAdvanceResult,
} from '@/types'
import { STATE_MACHINE_ORDER } from '@/types'

interface ProjectStore {
  // Estado principal
  project: Project | null
  evidence: Evidence | null
  objectives: Objective[]
  literature: LiteratureArticle[]
  methodology: Methodology | null
  alerts: ConsistencyAlert[]

  // UI state
  isLoading: boolean
  error: string | null

  // Actions
  loadProject: (projectId: string) => Promise<void>
  advanceState: (nuevoEstado: ProjectStatus) => Promise<StateAdvanceResult>
  updateProject: (updates: Partial<Project>) => Promise<void>
  addObjective: (obj: Omit<Objective, 'id' | 'project_id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateObjective: (id: string, updates: Partial<Objective>) => Promise<void>
  addLiterature: (article: Omit<LiteratureArticle, 'id' | 'project_id' | 'created_at'>) => Promise<void>
  removeLiterature: (id: string) => Promise<void>
  resolveAlert: (alertId: string) => Promise<void>
  clearError: () => void

  // Computed helpers
  canAdvanceTo: (estado: ProjectStatus) => boolean
  currentStepIndex: () => number
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: null,
  evidence: null,
  objectives: [],
  literature: [],
  methodology: null,
  alerts: [],
  isLoading: false,
  error: null,

  loadProject: async (projectId: string) => {
    set({ isLoading: true, error: null })
    const supabase = createClient()

    try {
      // Cargar proyecto y todas sus relaciones en paralelo
      const [
        { data: project, error: pErr },
        { data: evidenceArr },
        { data: objectives },
        { data: literature },
        { data: methodology },
        { data: alerts },
      ] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('evidence').select('*').eq('project_id', projectId),
        supabase.from('objectives').select('*').eq('project_id', projectId).order('orden'),
        supabase.from('literature_review').select('*').eq('project_id', projectId).order('created_at'),
        supabase.from('methodology').select('*').eq('project_id', projectId).maybeSingle(),
        supabase.from('consistency_alerts').select('*').eq('project_id', projectId).eq('resuelta', false),
      ])

      if (pErr) throw new Error(pErr.message)

      set({
        project: project as Project,
        evidence: evidenceArr?.[0] as Evidence | null,
        objectives: (objectives as Objective[]) || [],
        literature: (literature as LiteratureArticle[]) || [],
        methodology: methodology as Methodology | null,
        alerts: (alerts as ConsistencyAlert[]) || [],
        isLoading: false,
      })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  advanceState: async (nuevoEstado: ProjectStatus) => {
    const { project } = get()
    if (!project) return { ok: false, error: 'No hay proyecto cargado.' }

    const res = await fetch('/api/projects/advance-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, nuevo_estado: nuevoEstado }),
    })
    const result: StateAdvanceResult = await res.json()

    if (result.ok) {
      set(state => ({
        project: state.project ? { ...state.project, status: nuevoEstado } : null,
      }))
    }

    return result
  },

  updateProject: async (updates: Partial<Project>) => {
    const { project } = get()
    if (!project) return

    const supabase = createClient()
    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', project.id)

    if (!error) {
      set(state => ({
        project: state.project ? { ...state.project, ...updates } : null,
      }))
    }
  },

  addObjective: async (obj) => {
    const { project } = get()
    if (!project) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('objectives')
      .insert({ ...obj, project_id: project.id })
      .select()
      .single()

    if (!error && data) {
      set(state => ({ objectives: [...state.objectives, data as Objective] }))
    } else {
      set({ error: error?.message ?? 'Error al guardar objetivo.' })
    }
  },

  updateObjective: async (id: string, updates: Partial<Objective>) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('objectives')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      set(state => ({
        objectives: state.objectives.map(o => o.id === id ? data as Objective : o),
      }))
    }
  },

  addLiterature: async (article) => {
    const { project } = get()
    if (!project) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('literature_review')
      .insert({ ...article, project_id: project.id })
      .select()
      .single()

    if (!error && data) {
      set(state => ({ literature: [...state.literature, data as LiteratureArticle] }))
    }
  },

  removeLiterature: async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('literature_review').delete().eq('id', id)

    if (!error) {
      set(state => ({ literature: state.literature.filter(a => a.id !== id) }))
    }
  },

  resolveAlert: async (alertId: string) => {
    const supabase = createClient()
    await supabase
      .from('consistency_alerts')
      .update({ resuelta: true })
      .eq('id', alertId)

    set(state => ({
      alerts: state.alerts.filter(a => a.id !== alertId),
    }))
  },

  clearError: () => set({ error: null }),

  canAdvanceTo: (estado: ProjectStatus): boolean => {
    const { project, evidence, objectives, literature } = get()
    if (!project) return false

    const currentIdx = STATE_MACHINE_ORDER.indexOf(project.status)
    const targetIdx = STATE_MACHINE_ORDER.indexOf(estado)

    // Solo puede avanzar un paso
    if (targetIdx !== currentIdx + 1) return false

    switch (estado) {
      case 'diagnosis':
        return project.carga_horaria_confirmada
      case 'objectives':
        return !!(evidence?.problema_confirmado)
      case 'literature':
        return (
          objectives.filter(o => o.tipo === 'general' && o.bloom_validado).length >= 1 &&
          objectives.filter(o => o.tipo === 'specific' && o.bloom_validado).length >= 3
        )
      case 'methodology':
        return literature.length >= 6 || project.is_exploratory_exception
      case 'complete':
        return true
      default:
        return false
    }
  },

  currentStepIndex: () => {
    const { project } = get()
    if (!project) return 0
    return STATE_MACHINE_ORDER.indexOf(project.status)
  },
}))
