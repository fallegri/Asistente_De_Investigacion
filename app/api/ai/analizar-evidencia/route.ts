// app/api/ai/analizar-evidencia/route.ts
// Analiza el texto/archivo de evidencia del estudiante
// y extrae una lista de problemas reales identificados.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { AIExtractedProblem } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { evidence_id, contenido, area_estudio } = body

    if (!contenido || !evidence_id) {
      return NextResponse.json(
        { error: 'Se requiere el contenido a analizar.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar word count mínimo (300 palabras)
    const wordCount = contenido.trim().split(/\s+/).length
    if (wordCount < 300) {
      return NextResponse.json({
        error: `La evidencia debe tener al menos 300 palabras. Actual: ${wordCount} palabras.`,
        word_count: wordCount,
        requerido: 300,
      }, { status: 422 })
    }

    const systemPrompt = `Eres un experto en metodología de investigación académica con enfoque en diagnóstico organizacional.
Tu tarea es analizar texto empírico (notas de campo, transcripciones de entrevistas, diagnósticos) 
y extraer los problemas REALES que se observan.

IMPORTANTE:
- Un "problema" es una brecha entre la situación actual y la situación deseada.
- NO confundas el problema con la solución técnica.
- Identifica problemas concretos, medibles y observables.
- Área de estudio: ${area_estudio || 'no especificada'}

Responde SOLO en JSON con esta estructura exacta (sin markdown):
{
  "problemas": [
    {
      "problema": "Descripción concisa del problema identificado",
      "contexto": "Fragmento textual o contexto del diagnóstico que evidencia este problema",
      "aceptado": false
    }
  ],
  "resumen_diagnostico": "Párrafo breve del panorama general identificado",
  "calidad_evidencia": "alta|media|baja",
  "observacion_calidad": "Comentario sobre si la evidencia es suficiente para justificar una investigación"
}`

    const { text } = await generateText({
      model: google('gemini-2.0-flash'),
      system: systemPrompt,
      prompt: `Analiza la siguiente evidencia empírica y extrae los problemas identificables:\n\n${contenido.substring(0, 8000)}`,
      maxOutputTokens: 1500,
    })

    const clean = text.replace(/```json|```/g, '').trim()
    const aiResult = JSON.parse(clean)

    const problemas: AIExtractedProblem[] = aiResult.problemas || []

    // Guardar los problemas extraídos en la base de datos
    const { error: updateError } = await supabase
      .from('evidence')
      .update({
        ai_extracted_problems: problemas,
      })
      .eq('id', evidence_id)

    if (updateError) {
      console.error('Error guardando problemas extraídos:', updateError)
    }

    return NextResponse.json({
      ok: true,
      problemas,
      resumen_diagnostico: aiResult.resumen_diagnostico,
      calidad_evidencia: aiResult.calidad_evidencia,
      observacion_calidad: aiResult.observacion_calidad,
      word_count: wordCount,
    })
  } catch (err) {
    console.error('Error en /api/ai/analizar-evidencia:', err)
    return NextResponse.json(
      { error: 'Error al procesar la evidencia con IA.' },
      { status: 500 }
    )
  }
}
