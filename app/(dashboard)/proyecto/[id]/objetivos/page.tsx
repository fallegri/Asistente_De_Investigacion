'use client'
// app/(dashboard)/proyecto/[id]/objetivos/page.tsx
// Fase 3: Formulación de Objetivos
// - Tabla espejo Problema ↔ Necesidad de Conocimiento
// - Validación Bloom en tiempo real
// - 1 general + mínimo 3 específicos
// - Alertas de consistencia si se modifica un objetivo validado

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useProjectStore } from '@/lib/store/project-store'
import { IAPanel, type IAPanelMessage } from '@/components/ia-panel/IAPanel'
import { BloomVerbInput } from '@/components/project/BloomVerbInput'
import {
  PlusIcon, TrashIcon, CheckCircleIcon,
  ExclamationTriangleIcon, PencilSquareIcon,
} from '@heroicons/react/24/outline'
import type { Objective, ObjectiveType, BloomValidationResult, ObjectiveVariable } from '@/types'
import { cn } from '@/lib/utils'
import { validarVerboAPI } from '@/lib/bloom/validator'

interface ObjectiveDraft {
  tipo: ObjectiveType
  verbo: string
  descripcion: string
  variables: ObjectiveVariable[]
  verbResult: BloomValidationResult | null
}

const EMPTY_DRAFT: ObjectiveDraft = {
  tipo: 'specific',
  verbo: '',
  descripcion: '',
  variables: [],
  verbResult: null,
}

export default function ObjetivosPage() {
  const params = useParams()
  const router = useRouter()
  const { project, evidence, objectives, addObjective, updateObjective, advanceState, alerts } = useProjectStore()

  const [draft, setDraft] = useState<ObjectiveDraft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [aiMessages, setAiMessages] = useState<IAPanelMessage[]>([
    {
      id: 'intro',
      type: 'question',
      content: '¿Tu objetivo busca CONOCER el problema o ya estás proponiendo una solución? Los objetivos de investigación responden "¿Qué quiero saber?" — no "¿Qué quiero hacer?".',
      dismissible: true,
    }
  ])
  const [aiLoading, setAiLoading] = useState(false)
  const [varInput, setVarInput] = useState('')

  const generalObj = objectives.find(o => o.tipo === 'general')
  const specificObjs = objectives.filter(o => o.tipo === 'specific').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  const objectiveAlerts = alerts.filter(a => !a.resuelta)

  // ---- Handlers ----

  const handleVerbChange = (value: string, result: BloomValidationResult | null) => {
    setDraft(d => ({ ...d, verbo: value, verbResult: result }))
  }

  const addVariable = () => {
    if (!varInput.trim()) return
    const parts = varInput.trim().split(':')
    const nombre = parts[0].trim()
    const tipo = (parts[1]?.trim() as ObjectiveVariable['tipo']) ?? 'dependiente'
    setDraft(d => ({ ...d, variables: [...d.variables, { nombre, tipo }] }))
    setVarInput('')
  }

  const removeVariable = (idx: number) => {
    setDraft(d => ({ ...d, variables: d.variables.filter((_, i) => i !== idx) }))
  }

  const handleSave = async () => {
    if (!draft.verbo.trim() || !draft.descripcion.trim() || !project) return
    if (draft.tipo === 'general' && generalObj && !editingId) {
      setSaveError('Ya existe un objetivo general. Solo se permite uno.')
      return
    }

    setSaving(true)
    setSaveError('')
    setAiLoading(true)

    // Validación canónica + coherencia IA
    const canonicalResult = await validarVerboAPI(draft.verbo, project.id)

    if (!canonicalResult.valido) {
      setAiMessages(prev => [{
        id: 'blocked-' + Date.now(),
        type: 'warning',
        content: canonicalResult.mensaje,
      }, ...prev])
      setSaving(false)
      setAiLoading(false)
      return
    }

    // Coherencia IA (si la validación extendida viene con score)
    const coherencia = (canonicalResult as any).coherencia
    if (coherencia && coherencia.score < 0.8) {
      setAiMessages(prev => [{
        id: 'coherencia-' + Date.now(),
        type: 'warning',
        content: `Coherencia baja (${Math.round(coherencia.score * 100)}%): ${coherencia.observacion}${coherencia.sugiere_cambio ? ' — ' + coherencia.sugiere_cambio : ''}`,
        dismissible: true,
      }, ...prev])
    } else if (coherencia && coherencia.score >= 0.8) {
      setAiMessages(prev => [{
        id: 'ok-' + Date.now(),
        type: 'success',
        content: `Objetivo coherente con el problema (${Math.round(coherencia.score * 100)}%). ${coherencia.observacion}`,
        dismissible: true,
      }, ...prev])
    }

    setAiLoading(false)

    const payload = {
      tipo: draft.tipo,
      verbo: draft.verbo.trim(),
      descripcion: draft.descripcion.trim(),
      variables: draft.variables.length > 0 ? draft.variables : null,
      bloom_validado: true,
      orden: draft.tipo === 'specific' ? specificObjs.length + 1 : null,
      requiere_revision: false,
    }

    if (editingId) {
      await updateObjective(editingId, payload)
      setEditingId(null)
    } else {
      await addObjective(payload)
    }

    setDraft(EMPTY_DRAFT)
    setSaving(false)
  }

  const startEdit = (obj: Objective) => {
    setDraft({
      tipo: obj.tipo,
      verbo: obj.verbo,
      descripcion: obj.descripcion,
      variables: obj.variables ?? [],
      verbResult: { valido: true, verbo: obj.verbo, mensaje: 'Verbo previamente validado.' },
    })
    setEditingId(obj.id)
    setSaveError('')
  }

  const cancelEdit = () => {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    setSaveError('')
  }

  const handleAdvance = async () => {
    setAdvancing(true)
    setSaveError('')
    const result = await advanceState('literature')
    if (result.ok) {
      router.push(`/proyecto/${params.id}/literatura`)
    } else {
      setSaveError(result.error ?? 'No puedes avanzar aún.')
      setAdvancing(false)
    }
  }

  const canAdvance = (
    objectives.filter(o => o.tipo === 'general' && o.bloom_validado).length >= 1 &&
    objectives.filter(o => o.tipo === 'specific' && o.bloom_validado).length >= 3
  )

  if (!project) return null

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1">
          Fase 3 — Objetivos de Investigación
        </p>
        <h1 className="font-display text-3xl">Formulación de Objetivos</h1>
        <p className="text-[var(--color-text-secondary)] mt-1 max-w-2xl">
          Los objetivos deben buscar <strong>conocer</strong> el problema, no resolverlo.
          Usa verbos de la Taxonomía de Bloom nivel investigativo.
          Requieres <strong>1 general</strong> y al menos <strong>3 específicos</strong>.
        </p>
      </div>

      {/* Alertas de consistencia */}
      {objectiveAlerts.length > 0 && (
        <div className="space-y-2">
          {objectiveAlerts.map(alert => (
            <div key={alert.id} className="alert-consistency animate-fade-in-up">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{alert.descripcion}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla espejo: Problema ↔ Necesidad de conocimiento */}
      {evidence?.problema_central && (
        <div className="card-research bg-gradient-to-br from-stone-50 to-teal-50/30 border-teal-100">
          <h3 className="font-semibold text-sm text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Tabla Espejo — Coherencia metodológica
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Problema identificado
              </p>
              <p className="text-[var(--color-text-primary)] leading-relaxed bg-white rounded-lg p-3 border border-[var(--color-border)]">
                {evidence.problema_central}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wider">
                Necesidad de conocimiento
              </p>
              <p className="text-[var(--color-text-secondary)] leading-relaxed bg-teal-50/50 rounded-lg p-3 border border-teal-100 italic">
                {generalObj
                  ? `${generalObj.verbo} ${generalObj.descripcion}`
                  : 'Define tu objetivo general para ver cómo se conecta con el problema.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-5">

          {/* Objetivos existentes */}
          {objectives.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">
                Objetivos formulados
                <span className="ml-2 text-xs text-[var(--color-text-muted)] font-normal">
                  ({objectives.filter(o => o.tipo === 'general').length} general,
                   {objectives.filter(o => o.tipo === 'specific').length}/3+ específicos)
                </span>
              </h3>

              {/* Objetivo general */}
              {generalObj && (
                <ObjectiveCard
                  obj={generalObj}
                  label="Objetivo General"
                  accent="teal"
                  onEdit={() => startEdit(generalObj)}
                  isEditing={editingId === generalObj.id}
                />
              )}

              {/* Objetivos específicos */}
              {specificObjs.map((obj, i) => (
                <ObjectiveCard
                  key={obj.id}
                  obj={obj}
                  label={`Objetivo Específico ${i + 1}`}
                  accent="stone"
                  onEdit={() => startEdit(obj)}
                  isEditing={editingId === obj.id}
                />
              ))}
            </div>
          )}

          {/* Progreso */}
          <div className="flex items-center gap-3">
            <ProgressDot
              done={objectives.filter(o => o.tipo === 'general' && o.bloom_validado).length >= 1}
              label="1 General"
            />
            {[1,2,3].map(n => (
              <ProgressDot
                key={n}
                done={objectives.filter(o => o.tipo === 'specific' && o.bloom_validado).length >= n}
                label={`Esp. ${n}`}
              />
            ))}
            {objectives.filter(o => o.tipo === 'specific' && o.bloom_validado).length > 3 && (
              <span className="text-xs text-[var(--color-accent)] font-semibold">
                +{objectives.filter(o => o.tipo === 'specific' && o.bloom_validado).length - 3} adicionales ✓
              </span>
            )}
          </div>

          {/* Formulario de nuevo objetivo */}
          <div className="card-research space-y-4 border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <PlusIcon className="w-4 h-4 text-[var(--color-accent)]" />
              {editingId ? 'Editando objetivo' : 'Agregar objetivo'}
            </h3>

            {/* Tipo de objetivo */}
            <div className="flex gap-2">
              {(['general', 'specific'] as ObjectiveType[]).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => setDraft(d => ({ ...d, tipo }))}
                  disabled={tipo === 'general' && !!generalObj && !editingId}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                    draft.tipo === tipo
                      ? 'border-[var(--color-accent)] bg-teal-50 text-[var(--color-accent)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-stone-300',
                    tipo === 'general' && !!generalObj && !editingId && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {tipo === 'general' ? 'General' : 'Específico'}
                  {tipo === 'general' && !!generalObj && !editingId && ' (ya definido)'}
                </button>
              ))}
            </div>

            {/* Verbo con validación Bloom */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Verbo en infinitivo *
              </label>
              <BloomVerbInput
                value={draft.verbo}
                onChange={handleVerbChange}
              />
            </div>

            {/* Descripción completa del objetivo */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Descripción del objetivo *
              </label>
              <textarea
                value={draft.descripcion}
                onChange={e => setDraft(d => ({ ...d, descripcion: e.target.value }))}
                rows={3}
                placeholder="...el nivel de satisfacción de los clientes con el proceso de atención en la empresa X durante el período 2025."
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm resize-none focus:border-[var(--color-accent)] outline-none"
              />
              {draft.verbo && draft.descripcion && (
                <div className="mt-2 p-2 bg-stone-50 rounded-lg border border-stone-200 text-sm">
                  <span className="font-semibold text-[var(--color-accent)]">{draft.verbo} </span>
                  <span className="text-[var(--color-text-primary)]">{draft.descripcion}</span>
                </div>
              )}
            </div>

            {/* Variables (opcional) */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Variables <span className="text-[var(--color-text-muted)] font-normal">(opcional — para el Marco Teórico)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={varInput}
                  onChange={e => setVarInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addVariable()}
                  placeholder="Nombre: dependiente  (Enter para agregar)"
                  className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:border-[var(--color-accent)] outline-none"
                />
                <button onClick={addVariable} className="btn-secondary px-3">+</button>
              </div>
              {draft.variables.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {draft.variables.map((v, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 px-2 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs text-teal-800"
                    >
                      {v.nombre}
                      <span className="text-teal-500">({v.tipo})</span>
                      <button onClick={() => removeVariable(i)} className="ml-1 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {saveError}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              {editingId && (
                <button onClick={cancelEdit} className="btn-secondary flex-1">
                  Cancelar
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!draft.verbo.trim() || !draft.descripcion.trim() || saving || draft.verbResult?.valido === false}
                className="btn-primary flex-1 justify-center"
              >
                {saving ? 'Validando y guardando…' : editingId ? 'Actualizar objetivo' : 'Guardar objetivo'}
              </button>
            </div>
          </div>

          {/* Error y botón de avance */}
          <div className="flex items-center justify-between pt-2">
            <p className={cn(
              'text-sm',
              canAdvance ? 'text-green-600 font-medium' : 'text-[var(--color-text-muted)]'
            )}>
              {canAdvance
                ? '✓ Todos los objetivos requeridos están completos'
                : `Faltan ${Math.max(0, 1 - objectives.filter(o=>o.tipo==='general'&&o.bloom_validado).length)} general y ${Math.max(0, 3 - objectives.filter(o=>o.tipo==='specific'&&o.bloom_validado).length)} específicos`
              }
            </p>
            <button
              onClick={handleAdvance}
              disabled={!canAdvance || advancing}
              className="btn-primary px-8"
            >
              {advancing ? 'Guardando…' : 'Continuar a Literatura →'}
            </button>
          </div>
        </div>

        {/* Panel IA */}
        <div className="space-y-4">
          <IAPanel
            title="Validación metodológica"
            messages={aiMessages}
            isLoading={aiLoading}
            collapsible
          />

          {/* Guía de verbos */}
          <div className="card-research text-sm space-y-3">
            <h4 className="font-semibold text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">
              Estructura del objetivo
            </h4>
            <div className="space-y-2 text-[var(--color-text-secondary)]">
              <div className="p-2.5 bg-teal-50 rounded-lg border border-teal-100">
                <p className="font-semibold text-teal-700 text-xs mb-1">Formato correcto:</p>
                <p className="italic text-xs">
                  <span className="font-bold not-italic text-[var(--color-accent)]">[Verbo Bloom]</span>
                  {' '} + [qué] + [de quién/dónde] + [para qué/período]
                </p>
              </div>
              <div className="p-2.5 bg-red-50 rounded-lg border border-red-100">
                <p className="font-semibold text-red-600 text-xs mb-1">❌ Evitar:</p>
                <p className="text-xs italic text-red-700">
                  "Diseñar un sistema que mejore..." — esto es una propuesta, no investigación.
                </p>
              </div>
              <div className="p-2.5 bg-green-50 rounded-lg border border-green-100">
                <p className="font-semibold text-green-700 text-xs mb-1">✓ Ejemplo:</p>
                <p className="text-xs italic text-green-800">
                  "Analizar los factores que generan retrasos en la gestión de pedidos de la empresa X."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Sub-componentes ----

function ObjectiveCard({
  obj, label, accent, onEdit, isEditing,
}: {
  obj: Objective
  label: string
  accent: 'teal' | 'stone'
  onEdit: () => void
  isEditing: boolean
}) {
  const colors = {
    teal:  { border: 'border-teal-200',  bg: 'bg-teal-50/50',  badge: 'bg-teal-100 text-teal-700' },
    stone: { border: 'border-stone-200', bg: 'bg-stone-50/50', badge: 'bg-stone-100 text-stone-600' },
  }
  const c = colors[accent]

  return (
    <div className={cn(
      'card-research border-l-4 space-y-2 animate-fade-in-up',
      c.border, c.bg,
      isEditing && 'ring-2 ring-[var(--color-accent)] ring-offset-1'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', c.badge)}>
              {label}
            </span>
            {obj.bloom_validado && (
              <CheckCircleIcon className="w-4 h-4 text-green-600" />
            )}
            {obj.requiere_revision && (
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
            <span className="font-semibold text-[var(--color-accent)]">{obj.verbo} </span>
            {obj.descripcion}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="flex-shrink-0 p-1.5 hover:bg-white rounded-lg transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          title="Editar objetivo"
        >
          <PencilSquareIcon className="w-4 h-4" />
        </button>
      </div>

      {obj.variables && obj.variables.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {obj.variables.map((v, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-white border border-stone-200 rounded-full text-stone-600">
              {v.nombre} <span className="text-stone-400">({v.tipo})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ProgressDot({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center transition-all',
        done
          ? 'bg-[var(--color-accent)] text-white'
          : 'bg-[var(--color-surface-2)] border-2 border-[var(--color-border)]'
      )}>
        {done && <CheckCircleIcon className="w-4 h-4" />}
      </div>
      <span className={cn(
        'text-xs',
        done ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-text-muted)]'
      )}>
        {label}
      </span>
    </div>
  )
}
