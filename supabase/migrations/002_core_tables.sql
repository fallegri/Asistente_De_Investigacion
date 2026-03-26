-- ============================================================
-- MIGRACIÓN 002: Tablas Principales
-- Proyecto: Asistente Digital de Investigación UDI
-- ============================================================

-- -------------------------------------------------------
-- TABLA: projects
-- Registro principal de cada perfil de investigación.
-- Controla el estado del flujo (state machine).
-- -------------------------------------------------------
CREATE TABLE projects (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Datos del formulario MDG100
  escuela                     TEXT NOT NULL DEFAULT 'EIT',
  carrera                     career_type NOT NULL,
  titulo_tentativo            TEXT,
  area_estudio                TEXT NOT NULL,

  -- Validación de carga horaria (requerimiento MDG100)
  carga_horaria_confirmada    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Estado de la máquina de estados (State Machine)
  status                      project_status NOT NULL DEFAULT 'init',

  -- Excepción documental: cuando no se encuentran 6 artículos
  -- y Google Scholar tampoco retorna resultados relevantes
  is_exploratory_exception    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -------------------------------------------------------
-- TABLA: evidence
-- Evidencia empírica del problema (Épica 1 / MDG100 punto 2).
-- Puede ser archivo subido a Storage o texto redactado.
-- -------------------------------------------------------
CREATE TABLE evidence (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  tipo_evidencia          evidence_type NOT NULL DEFAULT 'text',
  contenido_raw           TEXT,                    -- Texto redactado por el estudiante
  word_count              INTEGER GENERATED ALWAYS AS (
                            COALESCE(array_length(string_to_array(trim(contenido_raw), ' '), 1), 0)
                          ) STORED,                -- Conteo de palabras automático (mín. 300)
  file_path               TEXT,                    -- URL en Supabase Storage (si es archivo)
  file_name               TEXT,
  file_size_bytes         BIGINT,

  -- Resultado del análisis IA: lista de problemas identificados
  -- Formato: [{ "problema": "...", "contexto": "...", "aceptado": false }]
  ai_extracted_problems   JSONB,

  -- Problema central seleccionado/confirmado por el estudiante
  problema_central        TEXT,
  problema_confirmado     BOOLEAN NOT NULL DEFAULT FALSE,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- TABLA: objectives
-- Formulación de objetivos con validación Bloom.
-- Restricción: 1 general + mínimo 3 específicos.
-- -------------------------------------------------------
CREATE TABLE objectives (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  tipo            objective_type NOT NULL,
  verbo           TEXT NOT NULL,   -- Verbo en infinitivo (validado contra lista Bloom)
  descripcion     TEXT NOT NULL,   -- Descripción completa del objetivo
  orden           INTEGER,         -- Para ordenar los específicos

  -- Variables extraídas de este objetivo (para Marco Teórico)
  -- Formato: [{ "nombre": "...", "tipo": "dependiente|independiente|interviniente" }]
  variables       JSONB,

  -- Flag de validación: confirmado por el filtro Bloom
  bloom_validado  BOOLEAN NOT NULL DEFAULT FALSE,

  -- Alerta activa si el objetivo fue modificado y hay
  -- instrumentos/marco teórico que deben revisarse
  requiere_revision BOOLEAN NOT NULL DEFAULT FALSE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER objectives_updated_at
  BEFORE UPDATE ON objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Restricción: solo 1 objetivo general por proyecto
CREATE UNIQUE INDEX idx_one_general_objective
  ON objectives(project_id)
  WHERE tipo = 'general';

-- -------------------------------------------------------
-- TABLA: literature_review
-- Estado de la Cuestión (MDG100 punto 4).
-- 6-15 artículos por proyecto.
-- -------------------------------------------------------
CREATE TABLE literature_review (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Datos bibliográficos
  anio            INTEGER CHECK (anio >= 1900 AND anio <= EXTRACT(YEAR FROM NOW()) + 1),
  pais            TEXT,
  autor           TEXT NOT NULL,
  titulo          TEXT NOT NULL,

  -- Análisis del artículo (Headers MDG100)
  aportaciones    TEXT,   -- Aportaciones a la cuestión del problema
  vacios          TEXT,   -- Problemas o vacíos que no resuelve
  diferencias     TEXT,   -- Diferencias con el tema del estudiante
  similitudes     TEXT,   -- Similitudes con el tema del estudiante

  -- Archivo PDF del artículo (Supabase Storage)
  url_pdf         TEXT,
  file_path       TEXT,

  -- Fuente: 'manual' (cargado por el estudiante) o 'scholar' (sugerido por fallback API)
  source          TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'scholar')),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- TABLA: methodology
-- Diseño metodológico (Épica 5).
-- Se crea después de definir objetivos y literatura.
-- -------------------------------------------------------
CREATE TABLE methodology (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Resultado del cuestionario socrático
  enfoque             research_approach,
  alcance             TEXT CHECK (alcance IN ('exploratorio', 'descriptivo', 'correlacional', 'explicativo')),

  -- Datos para ruta cuantitativa (HU-5.3)
  poblacion_size      INTEGER,
  muestra_size        INTEGER,    -- Calculado automáticamente (fórmula estadística)
  tipo_muestreo       TEXT,       -- 'probabilistico', 'no_probabilistico', etc.
  nivel_confianza     NUMERIC(5,2) DEFAULT 95.00,
  margen_error        NUMERIC(5,2) DEFAULT 5.00,

  -- Instrumentos sugeridos por la IA
  -- Formato: [{ "tipo": "encuesta|entrevista", "preguntas": ["..."] }]
  instrumentos        JSONB,

  -- Índice del Marco Teórico generado por IA
  -- Formato: { "capitulos": [{ "titulo": "...", "subtemas": [...] }] }
  marco_teorico_indice JSONB,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER methodology_updated_at
  BEFORE UPDATE ON methodology
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Un solo registro de metodología por proyecto
CREATE UNIQUE INDEX idx_one_methodology_per_project
  ON methodology(project_id);

-- -------------------------------------------------------
-- TABLA: consistency_matrix (vista materializada en realidad,
-- pero la representamos como tabla para auditoría)
-- Rastrea la coherencia Problema ↔ Objetivo ↔ Variable
-- -------------------------------------------------------
CREATE TABLE consistency_alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  objective_id    UUID REFERENCES objectives(id) ON DELETE CASCADE,

  tipo_alerta     TEXT NOT NULL,  -- 'objetivo_modificado', 'variable_sin_instrumento', etc.
  descripcion     TEXT NOT NULL,
  resuelta        BOOLEAN NOT NULL DEFAULT FALSE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
