// app/api/projects/export-docx/route.ts
// Genera el Perfil de Investigación completo en formato .docx APA 7.
// Recopila todos los datos del proyecto desde Supabase y construye
// el documento con la librería `docx`.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumberElement, TabStopType,
} from 'docx'

// ---- Constantes de layout APA 7 ----
const TEAL     = '0F766E'
const BLACK    = '000000'
const GRAY     = '6B7280'
const MARGIN   = 1440          // 2.54 cm = 1 pulgada en DXA
const PAGE_W   = 11906         // A4
const PAGE_H   = 16838
const CONTENT_W = PAGE_W - MARGIN * 2   // 9026 DXA

// ---- Helpers tipográficos ----
const r = (text: string, opts: Record<string, unknown> = {}) =>
  new TextRun({ text, font: 'Times New Roman', size: 24, ...opts })

const sp = (before = 0, after = 0, line = 480) =>
  ({ before, after, line, lineRule: 'auto' as const })

const h1 = (text: string) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [r(text, { bold: true, size: 28, color: TEAL })],
  spacing: sp(480, 240),
})

const h2 = (text: string) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [r(text, { bold: true })],
  spacing: sp(360, 120),
})

const body = (text: string, indent = true) => new Paragraph({
  children: [r(text)],
  spacing: sp(0, 0),
  indent: indent ? { firstLine: 720 } : undefined,
  alignment: AlignmentType.JUSTIFIED,
})

const empty = () => new Paragraph({ children: [r('')], spacing: sp(0, 0) })

const pb = () => new Paragraph({ children: [r('')], pageBreakBefore: true })

// ---- Secciones del documento ----

function buildPortada(data: ExportData): Paragraph[] {
  const carrera = data.proyecto.carrera === 'ingenieria_sistemas'
    ? 'Ingeniería de Sistemas'
    : data.proyecto.carrera === 'diseno_grafico'
      ? 'Licenciatura en Diseño Gráfico'
      : 'Escuela de Informática y Telecomunicaciones'

  const fecha = new Date(data.proyecto.created_at).toLocaleDateString('es-BO', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const center = { alignment: AlignmentType.CENTER, spacing: sp(0, 0) }

  return [
    empty(), empty(), empty(),
    new Paragraph({ children: [r('UNIVERSIDAD PARA EL DESARROLLO Y LA INNOVACIÓN', { bold: true, size: 26, allCaps: true })], ...center }),
    new Paragraph({ children: [r('Escuela de Informática y Telecomunicaciones')], ...center }),
    new Paragraph({ children: [r(carrera)], ...center }),
    empty(), empty(), empty(),
    new Paragraph({ children: [r(data.proyecto.titulo_tentativo || 'Sin título', { bold: true, size: 28 })], ...center }),
    empty(), empty(),
    new Paragraph({ children: [r('Perfil de Investigación', { italics: true })], ...center }),
    empty(), empty(), empty(), empty(),
    new Paragraph({ children: [r(`Estudiante: ${data.nombre_estudiante}`)], ...center }),
    new Paragraph({ children: [r(`Área de estudio: ${data.proyecto.area_estudio}`)], ...center }),
    new Paragraph({ children: [r(`Fecha: ${fecha}`)], ...center }),
  ]
}

function buildProblema(data: ExportData): Paragraph[] {
  const problema = data.problema_central || 'No se ha definido el problema central del proyecto.'

  return [
    h1('1. Planteamiento del Problema'),
    h2('1.1 Descripción de la Situación Problemática'),
    body(problema),
    empty(),
    h2('1.2 Formulación del Problema'),
    body('En base a la situación descrita, se plantea la siguiente pregunta de investigación:'),
    empty(),
    ...(data.objetivo_general ? [
      new Paragraph({
        children: [r(`¿Cuáles son los factores que ${data.objetivo_general.descripcion.toLowerCase()}?`, { italics: true })],
        indent: { left: 720, right: 720 },
        alignment: AlignmentType.JUSTIFIED,
        spacing: sp(0, 0),
      }),
    ] : [body('Objetivo general no definido.')]),
  ]
}

function buildObjetivos(data: ExportData): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [
    h1('2. Objetivos de la Investigación'),
    h2('2.1 Objetivo General'),
    data.objetivo_general
      ? body(`${data.objetivo_general.verbo} ${data.objetivo_general.descripcion}`)
      : body('Objetivo general no definido.'),
    empty(),
    h2('2.2 Objetivos Específicos'),
    ...data.objetivos_especificos.map((o, i) =>
      new Paragraph({
        children: [r(`${i + 1}. ${o.verbo} ${o.descripcion}`)],
        spacing: sp(0, 120),
        indent: { left: 720 },
        alignment: AlignmentType.JUSTIFIED,
      })
    ),
  ]
  return items
}

function buildLiteratura(data: ExportData): (Paragraph | Table)[] {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
  const borders = { top: border, bottom: border, left: border, right: border }
  const cols = [1400, 2000, 1700, 1600, 1163, 1163]
  const headers = ['Autor(es) y Año', 'Título', 'Aportaciones', 'Vacíos', 'Diferencias', 'Similitudes']

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      borders,
      width: { size: cols[i], type: WidthType.DXA },
      shading: { fill: '0F766E', type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [r(h, { bold: true, color: 'FFFFFF', size: 18 })],
        alignment: AlignmentType.CENTER,
      })],
    })),
  })

  const dataRows = data.literatura.map((art, idx) => {
    const cells = [
      `${art.autor} (${art.anio ?? 's.f.'})`,
      art.titulo,
      art.aportaciones || '—',
      art.vacios || '—',
      art.diferencias || '—',
      art.similitudes || '—',
    ]
    return new TableRow({
      children: cells.map((text, i) => new TableCell({
        borders,
        width: { size: cols[i], type: WidthType.DXA },
        shading: { fill: idx % 2 === 0 ? 'FFFFFF' : 'F9FAFB', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlign.TOP,
        children: [new Paragraph({
          children: [r(text, { size: 18 })],
          alignment: AlignmentType.JUSTIFIED,
        })],
      })),
    })
  })

  return [
    h1('3. Estado de la Cuestión'),
    body(`A continuación se presenta la revisión de ${data.literatura.length} antecedentes de investigación relacionados con la temática de estudio:`),
    empty(),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: cols,
      rows: [headerRow, ...dataRows],
    }),
  ]
}

function buildMetodologia(data: ExportData): Paragraph[] {
  const m = data.metodologia
  if (!m) return [h1('4. Diseño Metodológico'), body('Metodología no definida.')]

  const enfoqueLabel = m.enfoque === 'quantitative' ? 'cuantitativo'
    : m.enfoque === 'qualitative' ? 'cualitativo' : 'mixto'

  const items: Paragraph[] = [
    h1('4. Diseño Metodológico'),
    h2('4.1 Enfoque y Alcance'),
    body(`La presente investigación adopta un enfoque ${enfoqueLabel} con alcance ${m.alcance ?? 'descriptivo'}, dado que busca ${m.enfoque === 'qualitative' ? 'comprender en profundidad' : 'medir y cuantificar'} los factores identificados en el planteamiento del problema.`),
    empty(),
  ]

  if (m.enfoque !== 'qualitative' && m.muestra_size) {
    items.push(
      h2('4.2 Población y Muestra'),
      body(`La población de estudio está conformada por ${m.poblacion_size ?? 'N/D'} personas. Aplicando la fórmula de Cochran con corrección para población finita, con un nivel de confianza del ${m.nivel_confianza}% y un margen de error de ±${m.margen_error}%, se determinó una muestra de ${m.muestra_size} participantes.`),
      empty(),
    )
  }

  const instrNum = m.enfoque !== 'qualitative' ? '4.3' : '4.2'
  if (m.instrumentos?.length) {
    items.push(h2(`${instrNum} Instrumentos de Recolección`))
    m.instrumentos.forEach((ins: any) => {
      const tipo = ins.tipo === 'encuesta' ? 'Encuesta estructurada' : 'Guía de entrevista semiestructurada'
      items.push(body(`${tipo}: se aplicará a los participantes seleccionados para recopilar datos sobre las variables de estudio. Las preguntas guía son:`))
      ins.preguntas?.forEach((q: string, i: number) => {
        items.push(new Paragraph({
          children: [r(`${i + 1}. ${q}`)],
          spacing: sp(0, 0),
          indent: { left: 720 },
          alignment: AlignmentType.JUSTIFIED,
        }))
      })
      items.push(empty())
    })
  }

  return items
}

function buildReferencias(data: ExportData): Paragraph[] {
  const sorted = [...data.literatura].sort((a, b) =>
    (a.autor || '').localeCompare(b.autor || '')
  )

  return [
    h1('Referencias'),
    body('Las siguientes referencias bibliográficas están ordenadas alfabéticamente conforme al formato APA 7ma edición.', false),
    empty(),
    ...sorted.map(art => new Paragraph({
      children: [r(`${art.autor} (${art.anio ?? 's.f.'}). ${art.titulo}. ${art.pais ?? 'Sin lugar de publicación'}.`)],
      spacing: sp(0, 0),
      indent: { left: 720, hanging: 720 },
      alignment: AlignmentType.JUSTIFIED,
    })),
  ]
}

// ---- Construcción del documento ----
async function buildDocument(data: ExportData): Promise<Buffer> {
  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: 24 } } },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Times New Roman', color: TEAL },
          paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font: 'Times New Roman', color: BLACK },
          paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              r('PERFIL DE INVESTIGACIÓN — UDI / EIT', { size: 20, color: GRAY }),
              new TextRun({
                children: ['\t', new PageNumberElement()],
                font: 'Times New Roman', size: 20, color: GRAY,
              }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: TEAL, space: 1 } },
          })],
        }),
      },
      children: [
        ...buildPortada(data),
        pb(),
        ...buildProblema(data),
        pb(),
        ...buildObjetivos(data),
        pb(),
        ...buildLiteratura(data),
        pb(),
        ...buildMetodologia(data),
        pb(),
        ...buildReferencias(data),
      ],
    }],
  })

  return Packer.toBuffer(doc) as unknown as Buffer
}

// ---- Tipos ----
interface ExportData {
  proyecto: {
    id: string
    titulo_tentativo: string | null
    area_estudio: string
    carrera: string
    created_at: string
  }
  nombre_estudiante: string
  problema_central: string | null
  objetivo_general: { verbo: string; descripcion: string } | null
  objetivos_especificos: { verbo: string; descripcion: string }[]
  literatura: {
    autor: string; anio: number | null; titulo: string; pais: string | null
    aportaciones: string | null; vacios: string | null
    diferencias: string | null; similitudes: string | null
  }[]
  metodologia: {
    enfoque: string | null; alcance: string | null
    poblacion_size: number | null; muestra_size: number | null
    nivel_confianza: number; margen_error: number
    instrumentos: any
  } | null
}

// ---- Route Handler ----
export async function POST(req: NextRequest) {
  try {
    const { project_id } = await req.json()

    if (!project_id) {
      return NextResponse.json({ error: 'Se requiere project_id.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    // Obtener todos los datos del proyecto en paralelo
    const [
      { data: proyecto, error: pErr },
      { data: evidencias },
      { data: objetivos },
      { data: literatura },
      { data: metodologia },
    ] = await Promise.all([
      supabase.from('projects').select('*').eq('id', project_id).single(),
      supabase.from('evidence').select('*').eq('project_id', project_id).eq('problema_confirmado', true).limit(1),
      supabase.from('objectives').select('*').eq('project_id', project_id).order('orden'),
      supabase.from('literature_review').select('*').eq('project_id', project_id).order('created_at'),
      supabase.from('methodology').select('*').eq('project_id', project_id).maybeSingle(),
    ])

    if (pErr || !proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado.' }, { status: 404 })
    }

    // Verificar que el proyecto pertenece al usuario (RLS ya lo hace, pero doble check)
    if (proyecto.user_id !== user.id) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 })
    }

    // Obtener nombre del estudiante desde metadata
    const nombreEstudiante = user.user_metadata?.nombre_completo || user.email || 'Estudiante'

    const exportData: ExportData = {
      proyecto,
      nombre_estudiante: nombreEstudiante,
      problema_central: evidencias?.[0]?.problema_central ?? null,
      objetivo_general: objetivos?.find((o: any) => o.tipo === 'general') ?? null,
      objetivos_especificos: objetivos?.filter((o: any) => o.tipo === 'specific') ?? [],
      literatura: literatura ?? [],
      metodologia: metodologia ?? null,
    }

    // Generar el documento
    const buffer = await buildDocument(exportData)

    // Nombre de archivo limpio
    const titulo = proyecto.titulo_tentativo
      ?.substring(0, 60)
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '')
      .trim()
      .replace(/\s+/g, '_') ?? 'Perfil_Investigacion'

    const filename = `${titulo}_UDI.docx`

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (err: any) {
    console.error('Error en export-docx:', err)
    return NextResponse.json(
      { error: 'Error al generar el documento. Intenta nuevamente.' },
      { status: 500 }
    )
  }
}
