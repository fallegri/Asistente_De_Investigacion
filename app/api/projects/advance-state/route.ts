// app/api/projects/advance-state/route.ts
// Avanza el estado del proyecto (State Machine).
// Usa la función DB validar_avance_estado para bloqueos.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ProjectStatus, StateAdvanceResult } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { project_id, nuevo_estado } = body as {
      project_id: string
      nuevo_estado: ProjectStatus
    }

    if (!project_id || !nuevo_estado) {
      return NextResponse.json(
        { ok: false, error: 'Se requieren project_id y nuevo_estado.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }

    // Llamar a la función DB que valida y actualiza el estado
    const { data, error } = await supabase
      .rpc('validar_avance_estado', {
        p_project_id: project_id,
        p_nuevo_estado: nuevo_estado,
      })

    if (error) {
      console.error('Error en validar_avance_estado:', error)
      return NextResponse.json(
        { ok: false, error: 'Error interno al validar el avance de estado.' },
        { status: 500 }
      )
    }

    const result = data as StateAdvanceResult
    return NextResponse.json(result, { status: result.ok ? 200 : 422 })
  } catch (err) {
    console.error('Error en /api/projects/advance-state:', err)
    return NextResponse.json(
      { ok: false, error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
