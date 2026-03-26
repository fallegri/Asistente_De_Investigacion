'use client'
// app/(dashboard)/proyecto/[id]/literatura/page.tsx
// Fase 4: Estado de la Cuestión
// - Tabla de 6-15 artículos con los 8 campos del MDG100
// - Fallback a Google Scholar/Semantic Scholar si < 6
// - Excepción por Escasez Documental si no hay resultados

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useProjectStore } from '@/lib/store/project-store'
import { IAPanel, type IAPanelMessage } from '@/components/ia-panel/IAPanel'
import {
  PlusIcon, TrashIcon, MagnifyingGlassIcon,
  CheckCircleIcon, ExclamationTriangleIcon,
  DocumentArrowUpIcon, ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import type { LiteratureArticle } from '@/types'
import { cn } from '@/lib/utils'

interface ArticleDraft {
  anio: string
  pais: string
  autor: string
  titulo: string
  aportaciones: string
  vacios: string
  diferencias: string
  similitudes: string
  url_pdf: string
}

const EMPTY_DRAFT: ArticleDraft = {
  anio: '', pais: '', autor: '', titulo: '',
  aportaciones: '', vacios: '', diferencias: '', similitudes: '',
  url_pdf: '',
}

interface ScholarResult {
  titulo: string
  autor: string
  anio: number | null
  snippet: string
  url: string
}

export default function LiteraturaPage() {
  const params = useParams()
  const router = useRouter()
  const { project, literature, addLiterature, removeLiterature, advanceState } = useProjectStore()

  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<ArticleDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [advanceError, setAdvanceError] = useState('')
  const [scholarQuery, setScholarQuery] = useState('')
  const [scholarResults, setScholarResults] = useState<ScholarResult[]>([])
  const [scholarLoading, setScholarLoading] = useState(false)
  const [exploratoryGranted, setExploratoryGranted] = useState(project?.is_exploratory_exception ?? false)
  const [aiMessages, setAiMessages] = useState<IAPanelMessage[]>([
    {
      id: 'intro',
      type: 'info',
      content: `Registra entre 6 y 15 artículos científicos. Para cada uno, completa los 8 campos del Estado de la Cuestión. Si no encuentras suficientes, usa el buscador integrado.`,
      dismissible: true,
    }
  ])

  const literatureCount = literature.length
  const isMinMet = literatureCount >= 6
  const isMaxExceeded = literatureCount > 15
  const progressPercent = Math.min((literatureCount / 6) * 100, 100)

  const handleSaveArticle = async () => {
    if (!draft.autor.trim() || !draft.titulo.trim() || !project) return
    setSaving(true)

    await addLiterature({
      anio: draft.anio ? parseInt(draft.anio) : null,
      pais: draft.pais || null,
      autor: draft.autor,
      titulo: draft.titulo,
      aportaciones: draft.aportaciones || null,
      vacios: draft.vacios || null,
      diferencias: draft.diferencias || null,
      similitudes: draft.similitudes || null,
      url_pdf: draft.url_pdf || null,
      file_path: null,
      source: 'manual',
    })

    setDraft(EMPTY_DRAFT)
    setShowForm(false)
    setSaving(false)

    if (literatureCount + 1 >= 6) {
      setAiMessages(prev => [{
        id: 'min-met',
        type: 'success',
        content: '¡Mínimo de 6 artículos alcanzado! Puedes seguir agregando hasta 15 o continuar al siguiente módulo.',
        dismissible: true,
      }, ...prev])
    }
  }

  const addScholarResult = async (result: ScholarResult) => {
    await addLiterature({
      autor: result.autor,
      titulo: result.titulo,
      anio: result.anio,
      pais: null,
      aportaciones: result.snippet || null,
      vacios: null,
      diferencias: null,
      similitudes: null,
      url_pdf: result.url,
      file_path: null,
      source: 'scholar',
    })
    setScholarResults(prev => prev.filter(r => r.titulo !== result.titulo))
  }

  const runScholarFallback = async () => {
    if (!scholarQuery.trim() || !project) return
    setScholarLoading(true)
    setScholarResults([])

    const res = await fetch('/api/scholar-fallback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, query: scholarQuery }),
    })
    const data = await res.json()

    if (data.tipo === 'excepcion_documental') {
      setExploratoryGranted(true)
      setAiMessages(prev => [{
        id: 'exploratory',
        type: 'success',
        content: data.mensaje,
        dismissible: false,
      }, ...prev])
    } else if (data.resultados?.length > 0) {
      setScholarResults(data.resultados)
      setAiMessages(prev => [{
        id: 'scholar-ok',
        type: 'suggestion',
        content: data.mensaje,
        dismissible: true,
      }, ...prev])
    }
    setScholarLoading(false)
  }

  const handleAdvance = async () => {
    setAdvancing(true)
    setAdvanceError('')
    const result = await advanceState('methodology')
    if (result.ok) {
      router.push(`/proyecto/${params.id}/metodologia`)
    } else {
      setAdvanceError(result.error ?? 'No puedes avanzar aún.')
      setAdvancing(false)
    }
  }

  if (!project) return null

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1">
          Fase 4 — Estado de la Cuestión
        </p>
        <h1 className="font-display text-3xl">Literatura Científica</h1>
        <p className="text-[var(--color-text-secondary)] mt-1 max-w-2xl">
          Registra los antecedentes de investigación relacionados con tu tema.
          Mínimo <strong>6 artículos</strong>, máximo <strong>15</strong>.
        </p>
      </div>

      {/* Barra de progreso */}
      <div className="card-research space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={cn(
              'text-3xl font-bold',
              isMinMet ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'
            )}>
              {literatureCount}
            </span>
            <div>
              <p className="text-sm font-semibold">artículos registrados</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {isMinMet
                  ? isMaxExceeded ? '⚠ Máximo superado (15)' : '✓ Mínimo alcanzado'
                  : `Faltan ${6 - literatureCount} para el mínimo`
                }
              </p>
            </div>
          </div>
          {exploratoryGranted && (
            <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-full px-3 py-1.5">
              <CheckCircleIcon className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-700">Investigación Exploratoria habilitada</span>
            </div>
          )}
        </div>

        <div className="word-count-bar h-2">
          <div
            className="word-count-bar-fill"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: isMinMet ? 'var(--color-accent)' : '#D97706',
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tabla de artículos */}
          {literature.length > 0 && (
            <div className="card-research p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="literature-table">
                  <thead>
                    <tr>
                      <th>Año</th>
                      <th>Autor(es)</th>
                      <th>Título</th>
                      <th>Aportaciones</th>
                      <th>Vacíos</th>
                      <th>Fuente</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {literature.map((art, i) => (
                      <tr key={art.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.04}s` }}>
                        <td className="whitespace-nowrap font-mono text-xs">{art.anio ?? '—'}</td>
                        <td className="max-w-[120px]">
                          <p className="text-xs leading-snug">{art.autor}</p>
                          {art.pais && <p className="text-xs text-[var(--color-text-muted)]">{art.pais}</p>}
                        </td>
                        <td className="max-w-[200px]">
                          <p className="text-xs leading-snug font-medium">{art.titulo}</p>
                          {art.url_pdf && (
                            <a
                              href={art.url_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline mt-0.5"
                            >
                              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                              Ver artículo
                            </a>
                          )}
                        </td>
                        <td className="max-w-[150px]">
                          <p className="text-xs text-[var(--color-text-secondary)] leading-snug line-clamp-3">
                            {art.aportaciones ?? <span className="italic text-[var(--color-text-muted)]">Sin completar</span>}
                          </p>
                        </td>
                        <td className="max-w-[120px]">
                          <p className="text-xs text-[var(--color-text-secondary)] leading-snug line-clamp-2">
                            {art.vacios ?? <span className="italic text-[var(--color-text-muted)]">—</span>}
                          </p>
                        </td>
                        <td>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            art.source === 'scholar'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-stone-100 text-stone-600'
                          )}>
                            {art.source === 'scholar' ? 'Scholar' : 'Manual'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => removeLiterature(art.id)}
                            className="p-1 hover:text-red-500 text-[var(--color-text-muted)] transition-colors"
                            title="Eliminar artículo"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botón agregar artículo */}
          {!showForm && !isMaxExceeded && (
            <button
              onClick={() => setShowForm(true)}
              className="card-research w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed
                         text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]
                         hover:text-[var(--color-accent)] transition-colors text-sm font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              Agregar artículo científico
            </button>
          )}

          {/* Formulario de nuevo artículo */}
          {showForm && (
            <div className="card-research space-y-4 border-2 border-[var(--color-accent)] animate-fade-in-up">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Nuevo artículo — campos MDG100</h3>
                <button
                  onClick={() => { setShowForm(false); setDraft(EMPTY_DRAFT) }}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Año *" required>
                  <input type="number" value={draft.anio} onChange={e => setDraft(d => ({...d, anio: e.target.value}))}
                    placeholder="2023" min="1900" max="2026"
                    className="field-input" />
                </Field>
                <Field label="País">
                  <input type="text" value={draft.pais} onChange={e => setDraft(d => ({...d, pais: e.target.value}))}
                    placeholder="Bolivia, México…"
                    className="field-input" />
                </Field>
              </div>

              <Field label="Autor(es) *" required>
                <input type="text" value={draft.autor} onChange={e => setDraft(d => ({...d, autor: e.target.value}))}
                  placeholder="Apellido, N. & Apellido, N."
                  className="field-input" />
              </Field>

              <Field label="Título del artículo *" required>
                <input type="text" value={draft.titulo} onChange={e => setDraft(d => ({...d, titulo: e.target.value}))}
                  placeholder="Título completo de la publicación"
                  className="field-input" />
              </Field>

              <Field label="URL / DOI">
                <input type="url" value={draft.url_pdf} onChange={e => setDraft(d => ({...d, url_pdf: e.target.value}))}
                  placeholder="https://doi.org/..."
                  className="field-input" />
              </Field>

              <Field label="Aportaciones a la cuestión del problema">
                <textarea rows={2} value={draft.aportaciones}
                  onChange={e => setDraft(d => ({...d, aportaciones: e.target.value}))}
                  placeholder="¿Qué aporta este artículo al entendimiento del problema que estudio?"
                  className="field-input resize-none" />
              </Field>

              <Field label="Vacíos que no resuelve">
                <textarea rows={2} value={draft.vacios}
                  onChange={e => setDraft(d => ({...d, vacios: e.target.value}))}
                  placeholder="¿Qué aspectos del problema deja sin responder?"
                  className="field-input resize-none" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Diferencias con tu tema">
                  <textarea rows={2} value={draft.diferencias}
                    onChange={e => setDraft(d => ({...d, diferencias: e.target.value}))}
                    placeholder="¿En qué difiere de tu investigación?"
                    className="field-input resize-none" />
                </Field>
                <Field label="Similitudes con tu tema">
                  <textarea rows={2} value={draft.similitudes}
                    onChange={e => setDraft(d => ({...d, similitudes: e.target.value}))}
                    placeholder="¿Qué tienen en común?"
                    className="field-input resize-none" />
                </Field>
              </div>

              <button
                onClick={handleSaveArticle}
                disabled={!draft.autor.trim() || !draft.titulo.trim() || saving}
                className="btn-primary w-full justify-center"
              >
                {saving ? 'Guardando…' : 'Guardar artículo'}
              </button>
            </div>
          )}

          {/* Buscador Scholar (fallback) */}
          {!isMinMet && !exploratoryGranted && (
            <div className="card-research space-y-3 border-amber-200 bg-amber-50/50">
              <div className="flex items-start gap-2">
                <MagnifyingGlassIcon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    ¿No encuentras suficientes artículos?
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Busca en Google Scholar y Semantic Scholar. Si no hay resultados, se habilitará la Excepción por Escasez Documental.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={scholarQuery}
                  onChange={e => setScholarQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runScholarFallback()}
                  placeholder="ej. gestión de inventarios PYME Bolivia"
                  className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white focus:border-amber-400 outline-none"
                />
                <button
                  onClick={runScholarFallback}
                  disabled={scholarLoading || !scholarQuery.trim()}
                  className="btn-primary bg-amber-600 hover:bg-amber-700 px-4"
                >
                  {scholarLoading ? '…' : 'Buscar'}
                </button>
              </div>

              {/* Resultados de Scholar */}
              {scholarResults.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-amber-700">
                    Resultados sugeridos — haz clic para agregar:
                  </p>
                  {scholarResults.map((r, i) => (
                    <div
                      key={i}
                      className="bg-white border border-amber-200 rounded-lg p-3 cursor-pointer hover:border-[var(--color-accent)] transition-colors"
                      onClick={() => addScholarResult(r)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold leading-snug">{r.titulo}</p>
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            {r.autor} {r.anio ? `(${r.anio})` : ''}
                          </p>
                          {r.snippet && (
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2">{r.snippet}</p>
                          )}
                        </div>
                        <PlusIcon className="w-4 h-4 text-[var(--color-accent)] flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error y avance */}
          {advanceError && (
            <div className="alert-consistency">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">{advanceError}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <p className={cn(
              'text-sm',
              (isMinMet || exploratoryGranted) ? 'text-green-600 font-medium' : 'text-[var(--color-text-muted)]'
            )}>
              {exploratoryGranted
                ? '✓ Excepción exploratoria habilitada — puedes continuar'
                : isMinMet
                  ? `✓ ${literatureCount} artículos registrados — listo para continuar`
                  : `${literatureCount} / 6 artículos mínimos`
              }
            </p>
            <button
              onClick={handleAdvance}
              disabled={(!isMinMet && !exploratoryGranted) || isMaxExceeded || advancing}
              className="btn-primary px-8"
            >
              {advancing ? 'Guardando…' : 'Continuar a Metodología →'}
            </button>
          </div>
        </div>

        {/* Panel IA */}
        <div className="space-y-4">
          <IAPanel
            title="Orientación bibliográfica"
            messages={aiMessages}
            isLoading={scholarLoading}
            collapsible
          />

          {/* Guía de campos */}
          <div className="card-research text-sm space-y-2">
            <h4 className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">
              Campos requeridos (MDG100)
            </h4>
            <ol className="space-y-1 text-[var(--color-text-secondary)] text-xs list-decimal list-inside">
              {['Año', 'País', 'Autor(es)', 'Título',
                'Aportaciones al problema', 'Vacíos que no resuelve',
                'Diferencias con tu tema', 'Similitudes con tu tema'].map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Field helper ----
function Field({ label, required, children }: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-[var(--color-text-secondary)]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
