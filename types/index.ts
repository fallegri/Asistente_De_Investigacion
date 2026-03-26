// ============================================================
// types/index.ts
// Tipos TypeScript centrales del sistema UDI Investigación
// ============================================================

// -- Enums (espejo de los tipos PostgreSQL) ------------------

export type ProjectStatus =
  | 'init'
  | 'diagnosis'
  | 'objectives'
  | 'literature'
  | 'methodology'
  | 'complete'

export type ResearchApproach = 'qualitative' | 'quantitative' | 'mixed'
export type ObjectiveType = 'general' | 'specific'
export type EvidenceType = 'file' | 'text' | 'interview'
export type CareerType = 'ingenieria_sistemas' | 'diseno_grafico' | 'otra'
export type LiteratureSource = 'manual' | 'scholar'
export type ResearchScope = 'exploratorio' | 'descriptivo' | 'correlacional' | 'explicativo'

// -- Entidades principales -----------------------------------

export interface Project {
  id: string
  user_id: string
  escuela: string
  carrera: CareerType
  titulo_tentativo: string | null
  area_estudio: string
  carga_horaria_confirmada: boolean
  status: ProjectStatus
  is_exploratory_exception: boolean
  created_at: string
  updated_at: string
}

export interface Evidence {
  id: string
  project_id: string
  tipo_evidencia: EvidenceType
  contenido_raw: string | null
  word_count: number
  file_path: string | null
  file_name: string | null
  file_size_bytes: number | null
  ai_extracted_problems: AIExtractedProblem[] | null
  problema_central: string | null
  problema_confirmado: boolean
  created_at: string
}

export interface AIExtractedProblem {
  problema: string
  contexto: string
  aceptado: boolean
}

export interface ObjectiveVariable {
  nombre: string
  tipo: 'dependiente' | 'independiente' | 'interviniente'
}

export interface Objective {
  id: string
  project_id: string
  tipo: ObjectiveType
  verbo: string
  descripcion: string
  orden: number | null
  variables: ObjectiveVariable[] | null
  bloom_validado: boolean
  requiere_revision: boolean
  created_at: string
  updated_at: string
}

export interface LiteratureArticle {
  id: string
  project_id: string
  anio: number | null
  pais: string | null
  autor: string
  titulo: string
  aportaciones: string | null
  vacios: string | null
  diferencias: string | null
  similitudes: string | null
  url_pdf: string | null
  file_path: string | null
  source: LiteratureSource
  created_at: string
}

export interface Methodology {
  id: string
  project_id: string
  enfoque: ResearchApproach | null
  alcance: ResearchScope | null
  poblacion_size: number | null
  muestra_size: number | null
  tipo_muestreo: string | null
  nivel_confianza: number
  margen_error: number
  instrumentos: ResearchInstrument[] | null
  marco_teorico_indice: MarcoTeoricoIndex | null
  created_at: string
  updated_at: string
}

export interface ResearchInstrument {
  tipo: 'encuesta' | 'entrevista'
  preguntas: string[]
}

export interface MarcoTeoricoIndex {
  capitulos: {
    titulo: string
    subtemas: string[]
  }[]
}

export interface ConsistencyAlert {
  id: string
  project_id: string
  objective_id: string | null
  tipo_alerta: string
  descripcion: string
  resuelta: boolean
  created_at: string
}

// -- Bloom Verbs ---------------------------------------------

export interface BloomVerb {
  id: number
  verbo: string
  nivel_bloom: string
  permitido: boolean
  motivo: string | null
}

export interface BloomValidationResult {
  valido: boolean
  verbo: string
  nivel_bloom?: string
  mensaje: string
  sugerencias?: string[]
}

// -- State Machine -------------------------------------------

export const STATE_MACHINE_ORDER: ProjectStatus[] = [
  'init',
  'diagnosis',
  'objectives',
  'literature',
  'methodology',
  'complete',
]

export const STATE_LABELS: Record<ProjectStatus, string> = {
  init:        'Inicio',
  diagnosis:   'Diagnóstico',
  objectives:  'Objetivos',
  literature:  'Estado de la Cuestión',
  methodology: 'Metodología',
  complete:    'Finalizado',
}

export const STATE_ROUTES: Record<Exclude<ProjectStatus, 'init' | 'complete'>, string> = {
  diagnosis:   'diagnostico',
  objectives:  'objetivos',
  literature:  'literatura',
  methodology: 'metodologia',
}

// -- API Response types --------------------------------------

export interface APIResponse<T = unknown> {
  data?: T
  error?: string
  ok: boolean
}

export interface StateAdvanceResult {
  ok: boolean
  nuevo_estado?: ProjectStatus
  error?: string
  actual?: number
  requerido?: number
}

export interface SampleCalculationResult {
  muestra: number
  muestra_infinita: number
  nivel_confianza: number
  margen_error: number
  z_value: number
  formula: string
}

// -- Consistency Matrix (para UI) ----------------------------

export interface ConsistencyMatrixData {
  proyecto: Project
  objetivo_general: Objective | null
  objetivos_especificos: Objective[] | null
  literatura_count: number
  alertas_activas: ConsistencyAlert[] | null
  metodologia: Methodology | null
}
