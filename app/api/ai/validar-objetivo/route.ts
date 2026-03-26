// app/api/ai/validar-objetivo/route.ts
// Endpoint de validación de objetivos:
// 1. Valida el verbo contra la lista Bloom (DB function)
// 2. Si el verbo es válido, usa IA para verificar coherencia con el problema

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { BloomValidationResult } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { verbo, descripcion_completa, project_id } = body

    if (!verbo) {
      return NextResponse.json(
        { valido: false, mensaje: 'Se requiere el verbo a validar.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 1. Validar verbo contra función DB (canónica)
    const { data: bloomResult, error: bloomError } = await supabase
      .rpc('validar_verbo_bloom', { p_verbo: verbo })

    if (bloomError) {
      console.error('Error en validar_verbo_bloom:', bloomError)
      return NextResponse.json(
        { valido: false, mensaje: 'Error en validación de base de datos.' },
        { status: 500 }
      )
    }

    const validacion = bloomResult as BloomValidationResult

    // Si el verbo está bloqueado, retornar inmediatamente con el modal
    if (!validacion.valido) {
      return NextResponse.json(validacion)
    }

    // 2. Si hay descripción completa y project_id, validar coherencia con IA
    if (descripcion_completa && project_id) {
      // Obtener el problema central del proyecto
      const { data: evidence } = await supabase
        .from('evidence')
        .select('problema_central')
        .eq('project_id', project_id)
        .eq('problema_confirmado', true)
        .limit(1)
        .single()

      if (evidence?.problema_central) {
        const systemPrompt = `Eres un validador académico estricto especializado en metodología de investigación.
Tu función es evaluar si un objetivo de investigación es coherente con el problema identificado.

REGLAS:
- El objetivo debe CONOCER el problema, no resolverlo.
- Verbos como "Diseñar", "Crear", "Implementar" son de PROPUESTA, no de investigación.
- El objetivo debe poder medirse o verificarse mediante instrumentos de recolección.
- Responde SIEMPRE en JSON con esta estructura exacta:
{
  "coherente": boolean,
  "score": number (0.0 a 1.0),
  "observacion": "texto breve explicando el resultado",
  "es_investigativo": boolean,
  "sugiere_cambio": "texto de sugerencia si coherente es false, o null"
}`

        const userPrompt = `PROBLEMA IDENTIFICADO: "${evidence.problema_central}"

OBJETIVO PROPUESTO: "${descripcion_completa}"

Evalúa la coherencia. ¿El objetivo busca CONOCER el problema o ya está proponiendo una solución?`

        try {
          const { text } = await generateText({
            model: google('gemini-2.0-flash'),
            system: systemPrompt,
            prompt: userPrompt,
            maxOutputTokens: 400,
          })

          const clean = text.replace(/```json|```/g, '').trim()
          const aiResult = JSON.parse(clean)

          return NextResponse.json({
            ...validacion,
            coherencia: {
              score: aiResult.score,
              coherente: aiResult.coherente,
              observacion: aiResult.observacion,
              es_investigativo: aiResult.es_investigativo,
              sugiere_cambio: aiResult.sugiere_cambio,
            },
          })
        } catch (aiErr) {
          console.error('Error en validación IA:', aiErr)
          // Retornar resultado Bloom sin coherencia IA (no bloquear al usuario)
          return NextResponse.json(validacion)
        }
      }
    }

    return NextResponse.json(validacion)
  } catch (err) {
    console.error('Error en /api/ai/validar-objetivo:', err)
    return NextResponse.json(
      { valido: false, mensaje: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
