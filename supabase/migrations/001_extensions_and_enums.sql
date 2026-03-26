-- ============================================================
-- MIGRACIÓN 001: Extensiones y Tipos ENUM
-- Proyecto: Asistente Digital de Investigación UDI
-- ============================================================

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsquedas de texto (futuro uso en artículos)

-- 2. Tipos ENUM para estado del flujo del proyecto
CREATE TYPE project_status AS ENUM (
  'init',           -- Creación del proyecto y datos básicos
  'diagnosis',      -- Carga de evidencia del problema
  'objectives',     -- Formulación de objetivos
  'literature',     -- Estado de la cuestión (artículos)
  'methodology',    -- Diseño metodológico
  'complete'        -- Exportado y finalizado
);

-- 3. Tipo ENUM para enfoque metodológico
CREATE TYPE research_approach AS ENUM (
  'qualitative',
  'quantitative',
  'mixed'
);

-- 4. Tipo ENUM para tipo de objetivo
CREATE TYPE objective_type AS ENUM (
  'general',
  'specific'
);

-- 5. Tipo ENUM para tipo de evidencia
CREATE TYPE evidence_type AS ENUM (
  'file',
  'text',
  'interview'
);

-- 6. Tipo ENUM para carreras
CREATE TYPE career_type AS ENUM (
  'ingenieria_sistemas',
  'diseno_grafico',
  'otra'
);
