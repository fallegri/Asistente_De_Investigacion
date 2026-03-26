'use client'
// app/(dashboard)/proyecto/[id]/exportar/page.tsx
// Fase 6: Exportación — Matriz de Consistencia + descarga .docx APA 7

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useProjectStore } from '@/lib/store/project-store'
import { createClient } from '@/lib/supabase/client'
import { CheckCircleIcon, ArrowDownTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { ConsistencyMatrixData } from '@/types'
import { STATE_LABELS } from '@/types'
import { cn } from '@/lib/utils'

export default function ExportarPage() {
  const params = useParams()
  const { project, objectives, literature, methodology, alerts, resolveAlert } = useProjectStore()

  const [matrix, setMatrix] = useState<ConsistencyMatrixData | null>(null)
  const [matrixLoading, setMatrixLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    if (!project) return
    const supabase = createClient()
    supabase.rpc('obtener_matriz_consistencia', { p_project_id: project.id })
      .then(({ data }) => {
        setMatrix(data as ConsistencyMatrixData)
        setMatrixLoading(false)
      })
  }, [project])

  const handleExport = async () => {
    if (!project) return
    setExporting(true)
    setExportError('')

    try {
      const res = await fetch(`/api/projects/export-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error al generar el documento')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Perfil_Investigacion_${project.titulo_tentativo?.replace(/\s+/g, '_') ?? 'UDI'}.docx`
      a.click()
      URL.revokeObjectURL(url)
      setExportDone(true)
    } catch (err: any) {
      setExportError(err.message)
    }
    setExporting(false)
  }

  const generalObj = objectives.find(o => o.tipo === 'general')
  const specificObjs = objectives.filter(o => o.tipo === 'specific')
  const activeAlerts = alerts.filter(a => !a.resuelta)

  if (!project) return null

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest mb-1">
          Fase 6 — Exportación
        </p>
        <h1 className="font-display text-3xl">Matriz de Consistencia y Exportación</h1>
        <p className="text-[var(--color-text-secondary)] mt-1 max-w-2xl">
          Revisa la coherencia de todo tu perfil antes de exportar el documento final en formato APA 7.
        </p>
      </div>

      {/* Alertas pendientes */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-amber-700">
            ⚠ Hay {activeAlerts.length} alerta{activeAlerts.length > 1 ? 's' : ''} de consistencia pendiente{activeAlerts.length > 1 ? 's' : ''}:
          </p>
          {activeAlerts.map(alert => (
            <div key={alert.id} className="alert-consistency">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-800">{alert.descripcion}</p>
              </div>
              <button
                onClick={() => resolveAlert(alert.id)}
                className="text-xs text-amber-600 hover:text-amber-800 underline flex-shrink-0"
              >
                Marcar resuelta
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Matriz de consistencia */}
      <div className="card-research space-y-5">
        <h2 className="font-semibold flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 text-[var(--color-accent)]" />
          Matriz de Consistencia
        </h2>

        {matrixLoading ? (
          <div className="animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-stone-100 rounded-lg" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="literature-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Verbo</th>
                  <th>Objetivo</th>
                  <th>Variables</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {/* Objetivo general */}
                {generalObj && (
                  <tr className="bg-teal-50/30">
                    <td>
                      <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wider">
                        General
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold text-[var(--color-accent)] text-sm capitalize">
                        {generalObj.verbo}
                      </span>
                    </td>
                    <td className="max-w-xs">
                      <p className="text-sm leading-snug">{generalObj.descripcion}</p>
                    </td>
                    <td>
                      {generalObj.variables?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {generalObj.variables.map((v, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded-full">
                              {v.nombre}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                    </td>
                    <td>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        generalObj.bloom_validado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {generalObj.bloom_validado ? '✓ Validado' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                )}

                {/* Objetivos específicos */}
                {specificObjs.map((obj, i) => (
                  <tr key={obj.id}>
                    <td>
                      <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                        Esp. {i + 1}
                      </span>
                    </td>
                    <td>
                      <span className="font-medium text-sm capitalize text-stone-700">{obj.verbo}</span>
                    </td>
                    <td className="max-w-xs">
                      <p className="text-sm leading-snug text-[var(--color-text-secondary)]">{obj.descripcion}</p>
                    </td>
                    <td>
                      {obj.variables?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {obj.variables.map((v, j) => (
                            <span key={j} className="text-xs px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                              {v.nombre}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                    </td>
                    <td>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        obj.bloom_validado ? 'bg-green-100 text-green-700' :
                        obj.requiere_revision ? 'bg-amber-100 text-amber-700' :
                        'bg-stone-100 text-stone-600'
                      )}>
                        {obj.bloom_validado ? '✓ Validado' : obj.requiere_revision ? '⚠ Revisar' : 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Resumen del proyecto */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-[var(--color-border)]">
          {[
            { label: 'Artículos', value: literature.length, ok: literature.length >= 6 },
            { label: 'Obj. específicos', value: specificObjs.length, ok: specificObjs.length >= 3 },
            { label: 'Validados Bloom', value: objectives.filter(o => o.bloom_validado).length, ok: objectives.filter(o => o.bloom_validado).length === objectives.length },
            { label: 'Alertas activas', value: activeAlerts.length, ok: activeAlerts.length === 0, invert: true },
          ].map(stat => (
            <div key={stat.label} className={cn(
              'text-center p-3 rounded-xl border',
              stat.ok ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
            )}>
              <p className={cn(
                'text-2xl font-bold',
                stat.ok ? 'text-green-700' : 'text-amber-700'
              )}>
                {stat.value}
              </p>
              <p className="text-xs font-medium text-stone-600 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Metodología resumen */}
      {methodology && (
        <div className="card-research space-y-3">
          <h3 className="font-semibold text-sm">Diseño Metodológico</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Enfoque</p>
              <p className="font-semibold capitalize">
                {methodology.enfoque === 'quantitative' ? 'Cuantitativo' :
                 methodology.enfoque === 'qualitative' ? 'Cualitativo' : 'Mixto'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Alcance</p>
              <p className="font-semibold capitalize">{methodology.alcance ?? '—'}</p>
            </div>
            {methodology.muestra_size && (
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Muestra</p>
                <p className="font-semibold">{methodology.muestra_size} participantes</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Panel de exportación */}
      <div className="card-research space-y-4 border-2 border-[var(--color-accent)]">
        <div>
          <h3 className="font-semibold">Exportar Perfil de Investigación</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            El documento se generará en formato <strong>.docx</strong> con estilo APA 7:
            márgenes de 2.54 cm, Times New Roman 12, citas automáticas (Autor, Año) y bibliografía completa.
          </p>
        </div>

        <ul className="text-sm text-[var(--color-text-secondary)] space-y-1.5">
          {[
            'Portada con datos del estudiante y EIT',
            'Formulación del problema y evidencia',
            'Objetivos general y específicos',
            'Estado de la Cuestión (tabla completa)',
            'Marco Metodológico con instrumentos',
            'Bibliografía en formato APA 7',
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-[var(--color-accent)] flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        {exportError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {exportError}
          </p>
        )}

        {exportDone && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">
              ¡Documento generado y descargado exitosamente!
            </p>
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={exporting || activeAlerts.length > 0}
          className="btn-primary w-full justify-center py-3 text-base"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          {exporting ? 'Generando documento…' :
           activeAlerts.length > 0 ? 'Resuelve las alertas antes de exportar' :
           'Descargar Perfil de Investigación (.docx)'}
        </button>

        {activeAlerts.length > 0 && (
          <p className="text-xs text-center text-amber-600">
            Tienes {activeAlerts.length} alerta{activeAlerts.length > 1 ? 's' : ''} de consistencia sin resolver.
            Resuélvelas para habilitar la exportación.
          </p>
        )}
      </div>
    </div>
  )
}
