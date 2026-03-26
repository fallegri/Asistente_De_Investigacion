// lib/bloom/validator.ts
// Validación de verbos Taxonomía de Bloom
// Usable tanto en cliente (validación optimista) como servidor (canónica)

import type { BloomValidationResult } from '@/types'

// -------------------------------------------------------
// Lista local para validación OPTIMISTA en el cliente
// La validación canónica siempre va al backend (DB function)
// -------------------------------------------------------

export const VERBOS_PERMITIDOS = [
  'analizar', 'determinar', 'identificar', 'evaluar', 'describir',
  'proponer', 'establecer', 'comparar', 'examinar', 'interpretar',
  'explicar', 'clasificar', 'relacionar', 'caracterizar', 'contrastar',
  'valorar', 'estimar', 'diagnosticar',
]

export const VERBOS_BLOQUEADOS: Record<string, string> = {
  'diseñar':    'Verbo de propuesta de solución. Para tu perfil, usa "proponer" o "evaluar" el problema.',
  'crear':      'Verbo de propuesta de solución. Usa "identificar" o "determinar" en cambio.',
  'desarrollar':'Verbo de ejecución técnica. Usa "analizar" o "describir" el proceso existente.',
  'implementar':'Verbo de ejecución técnica. Usa "evaluar" o "determinar" la factibilidad.',
  'construir':  'Verbo de construcción. En investigación, usa "analizar" o "proponer".',
  'programar':  'Verbo técnico. El perfil investiga, no ejecuta. Usa "analizar" o "describir".',
  'elaborar':   'Verbo de producción. Usa "proponer" si buscas plantear una solución metodológica.',
}

/**
 * Extrae el primer verbo en infinitivo de un texto de objetivo.
 * Normaliza a minúsculas y elimina acentos para comparación robusta.
 */
export function extraerVerboInicial(texto: string): string {
  const primera_palabra = texto.trim().split(/\s+/)[0]
  return primera_palabra.toLowerCase()
}

/**
 * Normaliza un string: minúsculas + eliminar acentos
 */
function normalizar(s: string): string {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Validación optimista LOCAL (para feedback instantáneo en UI).
 * No requiere llamada al servidor.
 */
export function validarVerboLocal(verbo: string): BloomValidationResult {
  const verboNorm = normalizar(verbo)

  // Verificar bloqueados primero
  const bloqueadoKey = Object.keys(VERBOS_BLOQUEADOS).find(
    v => normalizar(v) === verboNorm
  )
  if (bloqueadoKey) {
    return {
      valido: false,
      verbo,
      mensaje: VERBOS_BLOQUEADOS[bloqueadoKey],
      sugerencias: VERBOS_PERMITIDOS.slice(0, 6),
    }
  }

  // Verificar permitidos
  const esPermitido = VERBOS_PERMITIDOS.some(v => normalizar(v) === verboNorm)
  if (esPermitido) {
    return {
      valido: true,
      verbo,
      mensaje: 'Verbo válido para formulación de objetivos de investigación.',
    }
  }

  // No reconocido
  return {
    valido: false,
    verbo,
    mensaje: 'Verbo no reconocido. Verifica la ortografía o selecciona uno de la lista de verbos permitidos.',
    sugerencias: VERBOS_PERMITIDOS.slice(0, 6),
  }
}

/**
 * Validación CANÓNICA via API (llama al endpoint que usa la función DB).
 * Usar esta antes de guardar en base de datos.
 */
export async function validarVerboAPI(
  verbo: string,
  projectId: string
): Promise<BloomValidationResult> {
  const res = await fetch('/api/ai/validar-objetivo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verbo, project_id: projectId }),
  })

  if (!res.ok) {
    return {
      valido: false,
      verbo,
      mensaje: 'Error al validar el verbo. Intenta nuevamente.',
    }
  }

  return res.json()
}

/**
 * Construye el mensaje modal para verbos bloqueados.
 * Siguiendo el spec: explicación pedagogica del porqué.
 */
export function getMensajeBloqueo(verbo: string): {
  titulo: string
  explicacion: string
  sugerencias: string[]
} {
  const verboNorm = normalizar(verbo)
  const bloqueadoKey = Object.keys(VERBOS_BLOQUEADOS).find(
    v => normalizar(v) === verboNorm
  )

  return {
    titulo: `"${verbo}" es un verbo de propuesta, no de investigación`,
    explicacion: bloqueadoKey
      ? VERBOS_BLOQUEADOS[bloqueadoKey]
      : `Los objetivos de un perfil de investigación deben buscar CONOCER el problema, no resolverlo todavía. Usa verbos que impliquen análisis, descripción o evaluación.`,
    sugerencias: ['Analizar', 'Identificar', 'Evaluar', 'Determinar', 'Describir', 'Proponer'],
  }
}
