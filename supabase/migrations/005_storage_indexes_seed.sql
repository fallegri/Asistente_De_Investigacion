-- ============================================================
-- MIGRACIÓN 005: Storage, Índices y Datos Semilla
-- ============================================================

-- -------------------------------------------------------
-- ÍNDICES para performance
-- -------------------------------------------------------

-- Búsquedas frecuentes de proyectos por usuario
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

-- Filtro de evidencias por proyecto
CREATE INDEX idx_evidence_project_id ON evidence(project_id);
CREATE INDEX idx_evidence_confirmada ON evidence(project_id, problema_confirmado);

-- Filtro de objetivos
CREATE INDEX idx_objectives_project_id ON objectives(project_id);
CREATE INDEX idx_objectives_tipo ON objectives(project_id, tipo);

-- Búsqueda de literatura por proyecto
CREATE INDEX idx_literature_project_id ON literature_review(project_id);

-- Alertas activas (consulta frecuente en UI)
CREATE INDEX idx_alerts_active ON consistency_alerts(project_id, resuelta)
  WHERE resuelta = FALSE;

-- -------------------------------------------------------
-- STORAGE BUCKETS (ejecutar en Supabase Dashboard o via API)
-- Estos comandos son para referencia; Supabase Storage
-- se configura via Dashboard o CLI.
-- -------------------------------------------------------
-- Bucket: evidence-files    (archivos de campo del estudiante)
-- Bucket: literature-pdfs   (artículos científicos, cifrado AES-256)
-- Bucket: exports           (archivos .docx generados)
--
-- Política de acceso: privado (signed URLs, no público)
-- Cifrado: habilitado en Supabase Storage por defecto (AES-256)

-- -------------------------------------------------------
-- TABLA: bloom_verbs_whitelist
-- Lista blanca de verbos permitidos (Taxonomía de Bloom)
-- Se usa tanto en backend como en validaciones DB
-- -------------------------------------------------------
CREATE TABLE bloom_verbs (
  id          SERIAL PRIMARY KEY,
  verbo       TEXT NOT NULL UNIQUE,
  nivel_bloom TEXT NOT NULL,  -- 'analisis', 'evaluacion', 'comprension', etc.
  permitido   BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE = bloqueado
  motivo      TEXT  -- Explicación del bloqueo si aplica
);

-- Verbos PERMITIDOS (investigativos)
INSERT INTO bloom_verbs (verbo, nivel_bloom, permitido) VALUES
  ('analizar',      'analisis',    TRUE),
  ('determinar',    'analisis',    TRUE),
  ('identificar',   'comprension', TRUE),
  ('evaluar',       'evaluacion',  TRUE),
  ('describir',     'comprension', TRUE),
  ('proponer',      'evaluacion',  TRUE),
  ('establecer',    'analisis',    TRUE),
  ('comparar',      'analisis',    TRUE),
  ('examinar',      'analisis',    TRUE),
  ('interpretar',   'comprension', TRUE),
  ('explicar',      'comprension', TRUE),
  ('clasificar',    'comprension', TRUE),
  ('relacionar',    'analisis',    TRUE),
  ('caracterizar',  'comprension', TRUE),
  ('contrastar',    'analisis',    TRUE),
  ('valorar',       'evaluacion',  TRUE),
  ('estimar',       'evaluacion',  TRUE),
  ('diagnosticar',  'analisis',    TRUE);

-- Verbos BLOQUEADOS (ejecución técnica / propuesta)
INSERT INTO bloom_verbs (verbo, nivel_bloom, permitido, motivo) VALUES
  ('diseñar',       'creacion', FALSE, 'Verbo de propuesta de solución. En perfil de investigación, usa "proponer" o "evaluar".'),
  ('crear',         'creacion', FALSE, 'Verbo de propuesta de solución. En perfil de investigación, usa "identificar" o "determinar".'),
  ('desarrollar',   'creacion', FALSE, 'Verbo de ejecución técnica. Usa "analizar" o "describir" el proceso existente.'),
  ('implementar',   'creacion', FALSE, 'Verbo de ejecución técnica. Usa "evaluar" o "determinar" la factibilidad.'),
  ('construir',     'creacion', FALSE, 'Verbo de construcción física/digital. No corresponde a una fase de investigación.'),
  ('programar',     'creacion', FALSE, 'Verbo técnico. El perfil investiga, no ejecuta. Usa "analizar" o "describir".'),
  ('elaborar',      'creacion', FALSE, 'Verbo de producción. Usa "proponer" si buscas plantear una solución metodológica.');

-- Hacer la tabla de verbos solo lectura para usuarios autenticados
ALTER TABLE bloom_verbs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bloom_verbs: read only for authenticated"
  ON bloom_verbs FOR SELECT
  TO authenticated
  USING (TRUE);

-- -------------------------------------------------------
-- FUNCIÓN: validar_verbo_bloom
-- Retorna si un verbo está permitido y la explicación
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_verbo_bloom(p_verbo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_registro bloom_verbs%ROWTYPE;
  v_verbo_lower TEXT;
BEGIN
  v_verbo_lower := LOWER(TRIM(p_verbo));

  SELECT * INTO v_registro
  FROM bloom_verbs
  WHERE LOWER(verbo) = v_verbo_lower;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valido',   FALSE,
      'verbo',    p_verbo,
      'mensaje',  'Verbo no reconocido en la Taxonomía de Bloom. Verifica la ortografía o consulta la lista de verbos permitidos.',
      'sugerencias', (
        SELECT jsonb_agg(verbo)
        FROM bloom_verbs
        WHERE permitido = TRUE
        LIMIT 5
      )
    );
  END IF;

  IF v_registro.permitido THEN
    RETURN jsonb_build_object(
      'valido',       TRUE,
      'verbo',        v_registro.verbo,
      'nivel_bloom',  v_registro.nivel_bloom,
      'mensaje',      'Verbo válido para formulación de objetivos de investigación.'
    );
  ELSE
    RETURN jsonb_build_object(
      'valido',   FALSE,
      'verbo',    v_registro.verbo,
      'mensaje',  v_registro.motivo,
      'nivel',    v_registro.nivel_bloom,
      'sugerencias', (
        SELECT jsonb_agg(verbo)
        FROM bloom_verbs
        WHERE permitido = TRUE AND nivel_bloom IN ('analisis', 'evaluacion')
        LIMIT 6
      )
    );
  END IF;
END;
$$;
