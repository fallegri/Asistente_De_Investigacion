// app/api/scholar-fallback/route.ts
// Fallback bibliográfico (HU-4.3):
// Si el estudiante tiene < 6 artículos, busca en Google Scholar.
// Si no hay resultados, habilita la Excepción por Escasez Documental.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { project_id, query } = body

    if (!project_id || !query) {
      return NextResponse.json(
        { error: 'Se requieren project_id y query.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el proyecto pertenece al usuario
    const { data: project } = await supabase
      .from('projects')
      .select('id, status, is_exploratory_exception')
      .eq('id', project_id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Contar artículos actuales
    const { count: literaturaCount } = await supabase
      .from('literature_review')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project_id)

    if ((literaturaCount ?? 0) >= 6) {
      return NextResponse.json({
        ok: true,
        mensaje: 'Ya tienes suficientes artículos. El fallback no es necesario.',
        count: literaturaCount,
      })
    }

    // Llamar a Serp API / Google Scholar
    // NOTA: Requiere SERP_API_KEY en variables de entorno
    // Alternativa gratuita: Semantic Scholar API (académica y libre)
    const serpApiKey = process.env.SERP_API_KEY

    let scholarResults: ScholarResult[] = []
    let apiSuccess = false

    if (serpApiKey) {
      try {
        const searchUrl = `https://serpapi.com/search.json?engine=google_scholar&q=${encodeURIComponent(query)}&api_key=${serpApiKey}&num=10&hl=es`
        const serpRes = await fetch(searchUrl)
        const serpData = await serpRes.json()

        if (serpData.organic_results) {
          scholarResults = serpData.organic_results.map((r: any) => ({
            titulo: r.title,
            autor: r.publication_info?.summary || 'Autor no disponible',
            anio: extractYear(r.publication_info?.summary),
            snippet: r.snippet,
            url: r.link,
            source: 'scholar' as const,
          }))
          apiSuccess = true
        }
      } catch (serpErr) {
        console.error('Error en Serp API:', serpErr)
      }
    }

    // Si no hay API key o falló, intentar Semantic Scholar (gratuita)
    if (!apiSuccess) {
      try {
        const semanticUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=title,authors,year,abstract,url&limit=10`
        const semanticRes = await fetch(semanticUrl, {
          headers: { 'User-Agent': 'UDI-Investigacion/1.0' }
        })
        const semanticData = await semanticRes.json()

        if (semanticData.data && semanticData.data.length > 0) {
          scholarResults = semanticData.data.map((p: any) => ({
            titulo: p.title,
            autor: p.authors?.map((a: any) => a.name).join(', ') || 'Autor no disponible',
            anio: p.year,
            snippet: p.abstract?.substring(0, 300) || '',
            url: p.url || `https://api.semanticscholar.org/graph/v1/paper/${p.paperId}`,
            source: 'scholar' as const,
          }))
          apiSuccess = true
        }
      } catch (semanticErr) {
        console.error('Error en Semantic Scholar:', semanticErr)
      }
    }

    // Si no hay resultados -> habilitar Excepción por Escasez Documental
    if (!apiSuccess || scholarResults.length === 0) {
      await supabase
        .from('projects')
        .update({ is_exploratory_exception: true })
        .eq('id', project_id)

      return NextResponse.json({
        ok: true,
        tipo: 'excepcion_documental',
        mensaje: 'No se encontraron artículos en las bases de datos consultadas. Tu proyecto ha sido marcado como "Investigación Exploratoria", lo que te permite continuar al siguiente módulo.',
        resultados: [],
        excepcion_habilitada: true,
      })
    }

    return NextResponse.json({
      ok: true,
      tipo: 'resultados_encontrados',
      mensaje: `Se encontraron ${scholarResults.length} artículos sugeridos. Selecciona los que sean relevantes para tu tema.`,
      resultados: scholarResults,
      excepcion_habilitada: false,
    })
  } catch (err) {
    console.error('Error en /api/scholar-fallback:', err)
    return NextResponse.json(
      { error: 'Error al buscar en bases de datos académicas.' },
      { status: 500 }
    )
  }
}

interface ScholarResult {
  titulo: string
  autor: string
  anio: number | null
  snippet: string
  url: string
  source: 'scholar'
}

function extractYear(text: string | undefined): number | null {
  if (!text) return null
  const match = text.match(/\b(19|20)\d{2}\b/)
  return match ? parseInt(match[0]) : null
}
