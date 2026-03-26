// app/api/ai/marco-teorico/route.ts
// Genera instrumentos de recolección y el índice del Marco Teórico
// basados en las variables de los objetivos y el enfoque metodológico.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { project_id, variables, enfoque } = body

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const variablesStr = variables?.length > 0
      ? variables.map((v: any) => `${v.nombre} (${v.tipo})`).join(', ')
      : 'No se especificaron variables'

    const enfoqueLabel = enfoque === 'quantitative' ? 'cuantitativo'
      : enfoque === 'qualitative' ? 'cualitativo' : 'mixto'

    const systemPrompt = `Eres un experto en metodología de investigación académica.
Tu tarea es generar instrumentos de recolección de datos para una investigación ${enfoqueLabel}.

Responde SOLO en JSON con esta estructura exacta (sin markdown):
{
  "instrumentos": [
    {
      "tipo": "encuesta",
      "preguntas": ["pregunta 1", "pregunta 2", ...]
    }
  ],
  "marco_teorico_indice": {
    "capitulos": [
      {
        "titulo": "Capítulo 1: ...",
        "subtemas": ["subtema 1", "subtema 2"]
      }
    ]
  }
}

REGLAS para instrumentos:
- Si es cuantitativo: genera una encuesta con 8-12 preguntas de escala Likert o selección múltiple
- Si es cualitativo: genera una guía de entrevista con 6-10 preguntas abiertas
- Si es mixto: genera ambos (encuesta corta + guía de entrevista)
- Las preguntas deben derivarse directamente de las variables indicadas
- Usa lenguaje accesible para los participantes

REGLAS para marco teórico:
- Genera 3-5 capítulos basados en las variables
- Cada capítulo con 2-4 subtemas relevantes
- Sigue el método de vertebración (de lo general a lo específico)`

    const { text } = await generateText({
      model: google('gemini-2.0-flash'),
      system: systemPrompt,
      prompt: `Variables de investigación: ${variablesStr}\nEnfoque: ${enfoqueLabel}`,
      maxOutputTokens: 2000,
    })

    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    // Guardar en methodology si existe
    if (project_id) {
      await supabase
        .from('methodology')
        .update({
          instrumentos: result.instrumentos,
          marco_teorico_indice: result.marco_teorico_indice,
        })
        .eq('project_id', project_id)
    }

    return NextResponse.json({
      ok: true,
      instrumentos: result.instrumentos,
      marco_teorico_indice: result.marco_teorico_indice,
    })
  } catch (err) {
    console.error('Error en /api/ai/marco-teorico:', err)
    return NextResponse.json({ error: 'Error al generar instrumentos.' }, { status: 500 })
  }
}
