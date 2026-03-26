'use client'
// app/(dashboard)/proyecto/[id]/metodologia/page.tsx
// Fase 5: Diseño Metodológico
// - Cuestionario socrático → asigna enfoque automáticamente
// - Calculadora de muestra estadística (fórmula Cochran)
// - Sugerencia de instrumentos de recolección con IA

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useProjectStore } from '@/lib/store/project-store'
import { IAPanel, type IAPanelMessage } from '@/components/ia-panel/IAPanel'
import { createClient } from '@/lib/supabase/client'
import { google } from '@ai-sdk/google'
import type { ResearchApproach, ResearchScope } from '@/types'
import { cn } from '@/lib/utils'
import { CheckCircleIcon, CalculatorIcon, BeakerIcon } from '@heroicons/react/24/outline'

// Preguntas socráticas para determinar el enfoque
const QUESTIONS = [
  {
    id: 'q1',
    text: '¿Qué tipo de datos necesitas para responder tu pregunta de investigación?',
    options: [
      { value: 'numerico', label: 'Datos numéricos, estadísticas, porcentajes' },
      { value: 'cualitativo', label: 'Opiniones, experiencias, percepciones detalladas' },
      { value: 'ambos', label: 'Necesito combinar ambos tipos' },
    ]
  },
  {
    id: 'q2',
    text: '¿Tu objetivo principal es medir/cuantificar o comprender en profundidad?',
    options: [
      { value: 'medir', label: 'Medir, cuantificar, comparar con datos' },
      { value: 'comprender', label: 'Comprender el por qué, explorar significados' },
      { value: 'ambos', label: 'Las dos cosas son importantes' },
    ]
  },
  {
    id: 'q3',
    text: '¿Tienes acceso a una población definida y delimitable?',
    options: [
      { value: 'si', label: 'Sí, puedo identificar y enumerar la población' },
      { value: 'no', label: 'No, el fenómeno no se presta a una muestra estadística' },
      { value: 'parcial', label: 'Parcialmente — tengo algunos datos cuantitativos y otros cualitativos' },
    ]
  },
  {
    id: 'q4',
    text: '¿Qué tipo de resultado esperas obtener?',
    options: [
      { value: 'generalizar', label: 'Resultados generalizables a toda la población' },
      { value: 'profundizar', label: 'Comprensión profunda de casos o individuos específicos' },
      { value: 'triangular', label: 'Validar hallazgos cualitativos con datos cuantitativos' },
    ]
  },
]

type Answers = Record<string, string>

function deriveApproach(answers: Answers): ResearchApproach {
  const vals = Object.values(answers)
  const cuantCount = vals.filter(v => ['numerico','medir','si','generalizar'].includes(v)).length
  const cualCount  = vals.filter(v => ['cualitativo','comprender','no','profundizar'].includes(v)).length
  const mixCount   = vals.filter(v => ['ambos','parcial','triangular'].includes(v)).length

  if (mixCount >= 2) return 'mixed'
  if (cuantCount > cualCount) return 'quantitative'
  return 'qualitative'
}

function deriveScope(approach: ResearchApproach, project: any): ResearchScope {
  if (!project.is_exploratory_exception) {
    if (approach === 'quantitative') return 'descriptivo'
    return 'descriptivo'
  }
  return 'exploratorio'
}

const APPROACH_INFO: Record<ResearchApproach, { label: string; color: string; desc: string }> = {
  quantitative: {
    label: 'Cuantitativo',
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    desc: 'Tu investigación usará encuestas, medición estadística y análisis numérico para responder la pregunta.',
  },
  qualitative: {
    label: 'Cualitativo',
    color: 'bg-purple-50 border-purple-200 text-purple-800',
    desc: 'Tu investigación explorará significados y percepciones mediante entrevistas y análisis interpretativo.',
  },
  mixed: {
    label: 'Mixto',
    color: 'bg-teal-50 border-teal-200 text-teal-800',
    desc: 'Tu investigación combina recolección de datos cuantitativos y cualitativos para triangular resultados.',
  },
}

export default function MetodologiaPage() {
  const params = useParams()
  const router = useRouter()
  const { project, objectives, advanceState } = useProjectStore()

  const [step, setStep] = useState<'questionnaire' | 'result' | 'sample' | 'instruments'>('questionnaire')
  const [answers, setAnswers] = useState<Answers>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [derivedApproach, setDerivedApproach] = useState<ResearchApproach | null>(null)
  const [derivedScope, setDerivedScope] = useState<ResearchScope | null>(null)

  // Sample calc state
  const [poblacion, setPoblacion] = useState('')
  const [confianza, setConfianza] = useState<90 | 95 | 99>(95)
  const [margenError, setMargenError] = useState(5)
  const [sampleResult, setSampleResult] = useState<any>(null)
  const [calcLoading, setCalcLoading] = useState(false)

  // Instruments state
  const [instruments, setInstruments] = useState<any>(null)
  const [instrLoading, setInstrLoading] = useState(false)
  const [aiMessages, setAiMessages] = useState<IAPanelMessage[]>([])

  const [saving, setSaving] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [advanceError, setAdvanceError] = useState('')

  const handleAnswer = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value }
    setAnswers(newAnswers)

    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(q => q + 1), 300)
    } else {
      // Todas respondidas → derivar enfoque
      const approach = deriveApproach(newAnswers)
      const scope = project ? deriveScope(approach, project) : 'descriptivo'
      setDerivedApproach(approach)
      setDerivedScope(scope)
      setStep('result')
    }
  }

  const calcularMuestra = async () => {
    setCalcLoading(true)
    const supabase = createClient()
    const { data } = await supabase.rpc('calcular_muestra', {
      p_poblacion: parseInt(poblacion) || null,
      p_confianza: confianza,
      p_margen_error: margenError,
    })
    setSampleResult(data)
    setCalcLoading(false)
  }

  const generarInstrumentos = async () => {
    if (!project || !derivedApproach) return
    setInstrLoading(true)

    const variables = objectives.flatMap(o => o.variables ?? [])
    const variablesStr = variables.length > 0
      ? variables.map(v => `${v.nombre} (${v.tipo})`).join(', ')
      : 'variables no especificadas'

    try {
      const res = await fetch('/api/ai/marco-teorico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          variables,
          enfoque: derivedApproach,
        }),
      })
      const data = await res.json()
      setInstruments(data.instrumentos)

      setAiMessages([{
        id: 'instr-ok',
        type: 'success',
        content: 'Instrumentos generados basados en tus variables y enfoque metodológico.',
        dismissible: true,
      }])
    } catch {
      setAiMessages([{
        id: 'instr-err',
        type: 'warning',
        content: 'Error al generar instrumentos. Puedes continuar y definirlos manualmente.',
      }])
    }
    setInstrLoading(false)
  }

  const saveAndAdvance = async () => {
    if (!project || !derivedApproach) return
    setSaving(true)

    const supabase = createClient()
    const payload = {
      project_id: project.id,
      enfoque: derivedApproach,
      alcance: derivedScope,
      poblacion_size: poblacion ? parseInt(poblacion) : null,
      muestra_size: sampleResult?.muestra ?? null,
      nivel_confianza: confianza,
      margen_error: margenError,
      instrumentos: instruments ?? null,
    }

    const { data: existing } = await supabase
      .from('methodology').select('id').eq('project_id', project.id).maybeSingle()

    if (existing) {
      await supabase.from('methodology').update(payload).eq('project_id', project.id)
    } else {
      await supabase.from('methodology').insert(payload)
    }

    setSaving(false)
    setAdvancing(true)
    const result = await advanceState('complete')
    if (result.ok) {
      router.push(`/proyecto/${params.id}/exportar`)
    } else {
      setAdvanceError(result.error ?? 'Error al finalizar la metodología.')
      setAdvancing(false)
    }
  }

  if (!project) return null

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1">
          Fase 5 — Metodología
        </p>
        <h1 className="font-display text-3xl">Diseño Metodológico</h1>
        <p className="text-[var(--color-text-secondary)] mt-1 max-w-2xl">
          Responde las preguntas reflexivas. El sistema asignará automáticamente el enfoque y alcance
          de tu investigación basándose en tus intenciones investigativas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* ---- PASO 1: Cuestionario socrático ---- */}
          {step === 'questionnaire' && (
            <div className="card-research space-y-6">
              {/* Progress de preguntas */}
              <div className="flex gap-1.5">
                {QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition-all',
                      i < currentQ ? 'bg-[var(--color-accent)]' :
                      i === currentQ ? 'bg-[var(--color-accent)] opacity-50' :
                      'bg-[var(--color-border)]'
                    )}
                  />
                ))}
              </div>

              <div className="animate-fade-in-up" key={currentQ}>
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                  Pregunta {currentQ + 1} de {QUESTIONS.length}
                </p>
                <h3 className="font-display text-xl mb-4">
                  {QUESTIONS[currentQ].text}
                </h3>

                <div className="space-y-2">
                  {QUESTIONS[currentQ].options.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleAnswer(QUESTIONS[currentQ].id, opt.value)}
                      className={cn(
                        'w-full text-left px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all',
                        answers[QUESTIONS[currentQ].id] === opt.value
                          ? 'border-[var(--color-accent)] bg-teal-50 text-[var(--color-accent)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-stone-50'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---- PASO 2: Resultado del enfoque ---- */}
          {step === 'result' && derivedApproach && (
            <div className="space-y-4 animate-fade-in-up">
              <div className={cn('card-research border-2', APPROACH_INFO[derivedApproach].color)}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    {derivedApproach === 'quantitative' ? '📊' : derivedApproach === 'qualitative' ? '💬' : '🔀'}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Enfoque asignado</p>
                    <h2 className="font-display text-2xl font-normal mb-2">
                      Investigación {APPROACH_INFO[derivedApproach].label}
                    </h2>
                    <p className="text-sm opacity-80 leading-relaxed">
                      {APPROACH_INFO[derivedApproach].desc}
                    </p>
                    <div className="mt-2">
                      <span className="text-xs font-semibold px-2 py-1 bg-white/60 rounded-full">
                        Alcance: {derivedScope}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opciones post-resultado */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('questionnaire')}
                  className="btn-secondary flex-1"
                >
                  Volver a responder
                </button>
                <button
                  onClick={() => setStep(derivedApproach === 'quantitative' ? 'sample' : 'instruments')}
                  className="btn-primary flex-1 justify-center"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ---- PASO 3: Calculadora de muestra (solo cuantitativo/mixto) ---- */}
          {step === 'sample' && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="card-research space-y-4">
                <div className="flex items-center gap-2">
                  <CalculatorIcon className="w-5 h-5 text-[var(--color-accent)]" />
                  <h3 className="font-semibold">Calculadora de Muestra Estadística</h3>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Fórmula de Cochran con corrección para población finita.
                  Ingresa el tamaño de tu población para calcular la muestra necesaria.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Tamaño de población (N)</label>
                    <input
                      type="number"
                      value={poblacion}
                      onChange={e => setPoblacion(e.target.value)}
                      placeholder="ej. 250"
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Nivel de confianza</label>
                    <select
                      value={confianza}
                      onChange={e => setConfianza(Number(e.target.value) as 90 | 95 | 99)}
                      className="field-input"
                    >
                      <option value={90}>90%</option>
                      <option value={95}>95% (recomendado)</option>
                      <option value={99}>99%</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Margen de error (%)</label>
                    <input
                      type="number"
                      value={margenError}
                      onChange={e => setMargenError(Number(e.target.value))}
                      min={1} max={20} step={0.5}
                      className="field-input"
                    />
                  </div>
                </div>

                <button
                  onClick={calcularMuestra}
                  disabled={calcLoading}
                  className="btn-primary w-full justify-center"
                >
                  {calcLoading ? 'Calculando…' : 'Calcular muestra'}
                </button>

                {sampleResult && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 animate-fade-in-up">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-3xl font-bold text-[var(--color-accent)]">{sampleResult.muestra}</p>
                        <p className="text-xs text-teal-700 font-semibold mt-1">Muestra requerida (n)</p>
                        <p className="text-xs text-teal-600">Con corrección finita</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-teal-600">{sampleResult.muestra_infinita}</p>
                        <p className="text-xs text-teal-700 font-semibold mt-1">Sin corrección (n₀)</p>
                        <p className="text-xs text-teal-600">Fórmula Cochran base</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-teal-200 text-xs text-teal-700 text-center">
                      Nivel de confianza: {sampleResult.nivel_confianza}% · Z={sampleResult.z_value} · Error: ±{sampleResult.margen_error}%
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('result')} className="btn-secondary flex-1">← Atrás</button>
                <button onClick={() => setStep('instruments')} className="btn-primary flex-1 justify-center">
                  Continuar a Instrumentos →
                </button>
              </div>
            </div>
          )}

          {/* ---- PASO 4: Instrumentos de recolección ---- */}
          {step === 'instruments' && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="card-research space-y-4">
                <div className="flex items-center gap-2">
                  <BeakerIcon className="w-5 h-5 text-[var(--color-accent)]" />
                  <h3 className="font-semibold">Instrumentos de Recolección</h3>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  La IA generará un borrador de preguntas basadas en las variables de tus objetivos
                  y tu enfoque {derivedApproach === 'quantitative' ? 'cuantitativo' : derivedApproach === 'qualitative' ? 'cualitativo' : 'mixto'}.
                </p>

                {!instruments ? (
                  <button
                    onClick={generarInstrumentos}
                    disabled={instrLoading}
                    className="btn-primary w-full justify-center py-3"
                  >
                    {instrLoading ? 'Generando preguntas…' : '✨ Generar instrumentos con IA'}
                  </button>
                ) : (
                  <div className="space-y-4">
                    {instruments.map((instr: any, i: number) => (
                      <div key={i} className="bg-[var(--color-surface-2)] rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{instr.tipo === 'encuesta' ? '📋' : '🎤'}</span>
                          <h4 className="font-semibold capitalize">{instr.tipo}</h4>
                        </div>
                        <ol className="space-y-1.5 pl-4 list-decimal">
                          {instr.preguntas?.map((q: string, j: number) => (
                            <li key={j} className="text-sm text-[var(--color-text-secondary)]">{q}</li>
                          ))}
                        </ol>
                      </div>
                    ))}
                    <button
                      onClick={generarInstrumentos}
                      disabled={instrLoading}
                      className="btn-secondary w-full text-sm"
                    >
                      Regenerar instrumentos
                    </button>
                  </div>
                )}
              </div>

              {advanceError && (
                <div className="alert-consistency">
                  <p className="text-sm text-amber-800">{advanceError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(derivedApproach === 'quantitative' ? 'sample' : 'result')}
                  className="btn-secondary flex-1"
                >
                  ← Atrás
                </button>
                <button
                  onClick={saveAndAdvance}
                  disabled={saving || advancing || !derivedApproach}
                  className="btn-primary flex-1 justify-center"
                >
                  {saving || advancing ? 'Guardando…' : 'Finalizar y exportar →'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Panel IA */}
        <div className="space-y-4">
          <IAPanel
            title="Orientación metodológica"
            messages={aiMessages}
            isLoading={instrLoading}
            collapsible
          />

          {/* Explicación de enfoques */}
          <div className="card-research text-sm space-y-3">
            <h4 className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">
              ¿Cuál es la diferencia?
            </h4>
            <div className="space-y-2 text-xs text-[var(--color-text-secondary)]">
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                <strong className="text-blue-700">Cuantitativo:</strong> Encuestas, escalas Likert, análisis estadístico, resultados generalizables.
              </div>
              <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                <strong className="text-purple-700">Cualitativo:</strong> Entrevistas, grupos focales, análisis de contenido, comprensión profunda.
              </div>
              <div className="p-2 bg-teal-50 rounded-lg border border-teal-100">
                <strong className="text-teal-700">Mixto:</strong> Ambos métodos para triangular y validar resultados.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
