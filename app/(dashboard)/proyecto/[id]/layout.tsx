// app/(dashboard)/proyecto/[id]/layout.tsx
// Layout compartido de todas las fases del proyecto.
// Carga el proyecto al montar y provee el Stepper persistente.

'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ProjectStepper } from '@/components/stepper/ProjectStepper'
import { useProjectStore } from '@/lib/store/project-store'

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const projectId = params?.id as string
  const { loadProject, isLoading, error } = useProjectStore()

  useEffect(() => {
    if (projectId) loadProject(projectId)
  }, [projectId, loadProject])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[var(--color-text-secondary)]">Cargando proyecto…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card-research max-w-sm text-center space-y-3">
          <p className="text-red-600 font-semibold">Error al cargar el proyecto</p>
          <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ProjectStepper />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </>
  )
}
