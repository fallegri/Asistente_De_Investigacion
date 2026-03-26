'use client'
// app/(dashboard)/proyecto/[id]/diagnostico/page.tsx
// Fase 2: Diagnóstico — Carga de evidencia empírica del problema.
// El botón "Siguiente" se activa solo con 300+ palabras o archivo cargado.

import { useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useProjectStore } from '@/lib/store/project-store'
import { IAPanel, type IAPanelMessage } from '@/components/ia-panel/IAPanel'
import { CloudArrowUpIcon, DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function DiagnosticoPage() {
  const params = useParams()
  const router = useRouter()
  const { project, evidence, advanceState } = useProjectStore()

  const [tab, setTab] = useState<'text' | 'file'>('text')
  const [texto, setTexto] = useState(evidence?.contenido_raw ?? '')
  const [fileUploaded, setFileUploaded] = useState<{ name: string; path: string } | null>(
    evidence?.file_path ? { name: evidence.file_name ?? 'archivo', path: evidence.file_path } : null
  )

  const [aiMessages, setAiMessages] = useState<IAPanelMessage[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [extractedProblems, setExtractedProblems] = useState(evidence?.ai_extracted_problems ?? [])
  const [selectedProblem, setSelectedProblem] = useState<string>(evidence?.problema_central ?? '')
  const [problemConfirmed, setProblemConfirmed] = useState(evidence?.problema_confirmado ?? false)
  const [advancing, setAdvancing] = useState(false)
  const [saveError, setSaveError] = useState('')

  const wordCount = texto.trim().split(/\s+/).filter(Boolean).length
  const wordCountPercent = Math.min((wordCount / 300) * 100, 100)
  const isTextValid = wordCount >= 300
  const canAnalyze = (isTextValid || fileUploaded) && !aiLoading

  const analyzeEvidence = useCallback(async () => {
    if (!canAnalyze || !project) return

    setAiLoading(true)
    setAiMessages([])

    try {
      // Guardar o actualizar evidencia primero
      const supabase = createClient()
      const payload = {
        project_id: project.id,
        tipo_evidencia: tab === 'text' ? 'text' : 'file',
        contenido_raw: texto || null,
        file_path: fileUploaded?.path ?? null,
        file_name: fileUploaded?.name ?? null,
      }

      const { data: savedEvidence } = evidence?.id
        ? await supabase.from('evidence').update(payload).eq('id', evidence.id).select().single()
        : await supabase.from('evidence').insert(payload).select().single()

      if (!savedEvidence) throw new Error('Error al guardar evidencia')

      // Llamar al endpoint de análisis IA
      const res = await fetch('/api/ai/analizar-evidencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_id: savedEvidence.id,
          contenido: texto,
          area_estudio: project.area_estudio,
        }),
      })
      const result = await res.json()

      if (result.error) {
        setAiMessages([{
          id: 'error',
          type: 'warning',
          content: result.error,
        }])
        return
      }

      setExtractedProblems(result.problemas ?? [])

      const msgs: IAPanelMessage[] = [
        {
          id: 'resumen',
          type: 'info',
          content: result.resumen_diagnostico,
          dismissible: true,
        },
      ]
      if (result.calidad_evidencia === 'baja') {
        msgs.push({
          id: 'calidad',
          type: 'warning',
          content: `Calidad de evidencia ${result.calidad_evidencia}: ${result.observacion_calidad}`,
          dismissible: true,
        })
      }
      setAiMessages(msgs)
    } catch (err: any) {
      setAiMessages([{ id: 'err', type: 'warning', content: 'Error al analizar la evidencia. Intenta de nuevo.' }])
    } finally {
      setAiLoading(false)
    }
  }, [canAnalyze, project, tab, texto, fileUploaded, evidence])

  const confirmProblem = async (problema: string) => {
    setSelectedProblem(problema)
    const supabase = createClient()
    if (evidence?.id) {
      await supabase.from('evidence')
        .update({ problema_central: problema, problema_confirmado: true })
        .eq('id', evidence.id)
    }
    setProblemConfirmed(true)
    setAiMessages(prev => [
      ...prev.filter(m => m.id !== 'confirmed'),
      { id: 'confirmed', type: 'success', content: `Problema confirmado: "${problema.substring(0, 80)}..."` },
    ])
  }

  const handleAdvance = async () => {
    setAdvancing(true)
    setSaveError('')
    const result = await advanceState('objectives')
    if (result.ok) {
      router.push(`/proyecto/${params.id}/objetivos`)
    } else {
      setSaveError(result.error ?? 'No puedes avanzar aún.')
      setAdvancing(false)
    }
  }

  if (!project) return null

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header de fase */}
      <div>
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1">
          Fase 2 — Diagnóstico
        </p>
        <h1 className="font-display text-3xl">Evidencia del Problema</h1>
        <p className="text-[var(--color-text-secondary)] mt-1 max-w-2xl">
          Describe o carga la evidencia empírica que justifica la existencia de un problema real
          en tu área de estudio. El sistema identificará los problemas observables.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tabs */}
          <div className="flex gap-1 bg-[var(--color-surface-2)] p-1 rounded-lg w-fit">
            {(['text', 'file'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                  tab === t
                    ? 'bg-white shadow-sm text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                )}
              >
                {t === 'text' ? <DocumentTextIcon className="w-4 h-4" /> : <CloudArrowUpIcon className="w-4 h-4" />}
                {t === 'text' ? 'Redactar texto' : 'Cargar archivo'}
              </button>
            ))}
          </div>

          {/* Input de texto */}
          {tab === 'text' && (
            <div className="card-research space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">
                  Notas de campo, transcripciones o diagnóstico
                </label>
                <span className={cn(
                  'text-xs font-mono px-2 py-0.5 rounded-full',
                  isTextValid ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                )}>
                  {wordCount} / 300 palabras
                </span>
              </div>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                rows={12}
                placeholder="Escribe aquí tus notas de campo, resultados de entrevistas, observaciones del problema...&#10;&#10;Mínimo 300 palabras para que el sistema pueda identificar los problemas con precisión."
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm resize-none focus:border-[var(--color-accent)] outline-none leading-relaxed"
              />
              {/* Barra de progreso de palabras */}
              <div className="word-count-bar">
                <div
                  className="word-count-bar-fill"
                  style={{
                    width: `${wordCountPercent}%`,
                    backgroundColor: isTextValid ? 'var(--color-success)' : '#D97706',
                  }}
                />
              </div>
              {!isTextValid && wordCount > 0 && (
                <p className="text-xs text-[var(--color-warning)]">
                  Faltan {300 - wordCount} palabras para cumplir el mínimo requerido.
                </p>
              )}
            </div>
          )}

          {/* Carga de archivo */}
          {tab === 'file' && (
            <div className="card-research">
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                  fileUploaded
                    ? 'border-green-300 bg-green-50'
                    : 'border-[var(--color-border)] hover:border-[var(--color-accent)] cursor-pointer'
                )}
              >
                {fileUploaded ? (
                  <div className="space-y-2">
                    <CheckCircleIcon className="w-10 h-10 text-green-600 mx-auto" />
                    <p className="font-semibold text-green-700">{fileUploaded.name}</p>
                    <button
                      onClick={() => setFileUploaded(null)}
                      className="text-xs text-[var(--color-text-muted)] hover:text-red-600 underline"
                    >
                      Eliminar y cargar otro
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <CloudArrowUpIcon className="w-10 h-10 text-[var(--color-text-muted)] mx-auto" />
                    <p className="font-semibold text-[var(--color-text-secondary)]">
                      Arrastra tu archivo aquí
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      PDF, Word, TXT — máx. 10 MB
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                      (Integración con Supabase Storage — configurar en .env.local)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botón analizar */}
          <button
            onClick={analyzeEvidence}
            disabled={!canAnalyze}
            className="btn-primary w-full justify-center py-3"
          >
            {aiLoading ? 'Analizando evidencia…' : '🔍 Analizar con IA y extraer problemas'}
          </button>

          {/* Problemas extraídos */}
          {extractedProblems.length > 0 && (
            <div className="card-research space-y-3 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Problemas identificados</h3>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Selecciona el problema central de tu investigación
                </span>
              </div>
              <div className="space-y-2">
                {extractedProblems.map((p: any, i: number) => (
                  <div
                    key={i}
                    onClick={() => !problemConfirmed && confirmProblem(p.problema)}
                    className={cn(
                      'p-3 rounded-lg border-2 transition-colors',
                      selectedProblem === p.problema
                        ? 'border-[var(--color-accent)] bg-teal-50'
                        : 'border-[var(--color-border)] hover:border-[var(--color-accent)] cursor-pointer'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center',
                        selectedProblem === p.problema
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                          : 'border-stone-300'
                      )}>
                        {selectedProblem === p.problema && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{p.problema}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{p.contexto}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error de avance */}
          {saveError && (
            <div className="alert-consistency">
              <span className="text-amber-600 font-bold text-sm">⚠</span>
              <p className="text-sm text-amber-800">{saveError}</p>
            </div>
          )}

          {/* Botón avanzar */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleAdvance}
              disabled={!problemConfirmed || advancing}
              className="btn-primary px-8"
            >
              {advancing ? 'Guardando…' : 'Continuar a Objetivos →'}
            </button>
          </div>
        </div>

        {/* Panel IA */}
        <div className="space-y-4">
          <IAPanel
            title="Guía metodológica"
            messages={aiMessages}
            isLoading={aiLoading}
          />

          {/* Instrucciones estáticas */}
          <div className="card-research space-y-3 text-sm">
            <h4 className="font-semibold text-[var(--color-text-secondary)] text-xs uppercase tracking-wider">
              ¿Qué debe contener la evidencia?
            </h4>
            <ul className="space-y-2 text-[var(--color-text-secondary)]">
              {[
                'Notas de observación directa en el campo',
                'Transcripciones de entrevistas con involucrados',
                'Datos cuantitativos que evidencien el problema',
                'Descripción del contexto organizacional',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[var(--color-accent)] font-bold mt-0.5">›</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
