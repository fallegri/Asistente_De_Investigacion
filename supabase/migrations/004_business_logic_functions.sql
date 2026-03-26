-- ============================================================
-- MIGRACIÓN 004: Funciones de Lógica de Negocio
-- Reglas de negocio críticas implementadas en la DB
-- ============================================================

-- -------------------------------------------------------
-- FUNCIÓN: validar_avance_estado
-- Bloquea la transición de estado si las condiciones
-- del estado anterior no se cumplen (State Machine).
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_avance_estado(
  p_project_id UUID,
  p_nuevo_estado project_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_proyecto         projects%ROWTYPE;
  v_evidence_count   INTEGER;
  v_evidence_ok      BOOLEAN;
  v_obj_general      INTEGER;
  v_obj_especificos  INTEGER;
  v_literatura_count INTEGER;
BEGIN
  SELECT * INTO v_proyecto FROM projects WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Proyecto no encontrado');
  END IF;

  -- Verificar que el usuario es el dueño (seguridad extra)
  IF v_proyecto.user_id != auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Acceso denegado');
  END IF;

  -- ---- Transición: init -> diagnosis ----
  IF p_nuevo_estado = 'diagnosis' THEN
    IF NOT v_proyecto.carga_horaria_confirmada THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Debes confirmar la carga horaria de 400 horas antes de continuar.'
      );
    END IF;
  END IF;

  -- ---- Transición: diagnosis -> objectives ----
  IF p_nuevo_estado = 'objectives' THEN
    SELECT COUNT(*) INTO v_evidence_count
    FROM evidence
    WHERE project_id = p_project_id AND problema_confirmado = TRUE;

    IF v_evidence_count = 0 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Debes cargar evidencia y confirmar al menos 1 problema central antes de formular objetivos.'
      );
    END IF;

    -- Verificar word count mínimo si es texto
    SELECT COUNT(*) INTO v_evidence_count
    FROM evidence
    WHERE project_id = p_project_id
      AND (problema_confirmado = TRUE)
      AND (file_path IS NOT NULL OR word_count >= 300);

    IF v_evidence_count = 0 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'La evidencia de texto debe tener al menos 300 palabras, o cargar un archivo.'
      );
    END IF;
  END IF;

  -- ---- Transición: objectives -> literature ----
  IF p_nuevo_estado = 'literature' THEN
    SELECT COUNT(*) INTO v_obj_general
    FROM objectives
    WHERE project_id = p_project_id AND tipo = 'general' AND bloom_validado = TRUE;

    SELECT COUNT(*) INTO v_obj_especificos
    FROM objectives
    WHERE project_id = p_project_id AND tipo = 'specific' AND bloom_validado = TRUE;

    IF v_obj_general < 1 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Debes formular y validar 1 objetivo general antes de continuar.'
      );
    END IF;

    IF v_obj_especificos < 3 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Debes formular y validar al menos 3 objetivos específicos.',
        'actual', v_obj_especificos,
        'requerido', 3
      );
    END IF;
  END IF;

  -- ---- Transición: literature -> methodology ----
  IF p_nuevo_estado = 'methodology' THEN
    SELECT COUNT(*) INTO v_literatura_count
    FROM literature_review
    WHERE project_id = p_project_id;

    IF v_literatura_count < 6 AND NOT v_proyecto.is_exploratory_exception THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'El Estado de la Cuestión requiere mínimo 6 artículos científicos.',
        'actual', v_literatura_count,
        'requerido', 6
      );
    END IF;

    IF v_literatura_count > 15 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'El Estado de la Cuestión no puede superar 15 artículos científicos.',
        'actual', v_literatura_count,
        'maximo', 15
      );
    END IF;
  END IF;

  -- Todas las validaciones pasaron: actualizar estado
  UPDATE projects SET status = p_nuevo_estado WHERE id = p_project_id;

  RETURN jsonb_build_object('ok', true, 'nuevo_estado', p_nuevo_estado);
END;
$$;

-- -------------------------------------------------------
-- FUNCIÓN: calcular_muestra
-- Fórmula estadística para ruta cuantitativa (Cochran).
-- n = (Z² * p * q) / e²  para poblaciones grandes
-- n₀ = n / (1 + (n-1)/N) para poblaciones finitas
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION calcular_muestra(
  p_poblacion     INTEGER,
  p_confianza     NUMERIC DEFAULT 95.0,  -- 90, 95 o 99
  p_margen_error  NUMERIC DEFAULT 5.0    -- en porcentaje
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_z        NUMERIC;
  v_p        NUMERIC := 0.5;  -- Máxima varianza (caso más conservador)
  v_q        NUMERIC := 0.5;
  v_e        NUMERIC;
  v_n        NUMERIC;
  v_n_finita NUMERIC;
BEGIN
  -- Valor Z según nivel de confianza
  v_z := CASE
    WHEN p_confianza = 99 THEN 2.576
    WHEN p_confianza = 90 THEN 1.645
    ELSE 1.96  -- 95% por defecto
  END;

  v_e := p_margen_error / 100.0;

  -- Fórmula de Cochran (población infinita)
  v_n := (v_z * v_z * v_p * v_q) / (v_e * v_e);

  -- Corrección para población finita
  IF p_poblacion IS NOT NULL AND p_poblacion > 0 THEN
    v_n_finita := v_n / (1 + ((v_n - 1) / p_poblacion));
  ELSE
    v_n_finita := v_n;
  END IF;

  RETURN jsonb_build_object(
    'muestra',          CEIL(v_n_finita),
    'muestra_infinita', CEIL(v_n),
    'nivel_confianza',  p_confianza,
    'margen_error',     p_margen_error,
    'z_value',          v_z,
    'formula',          'Cochran con corrección finita'
  );
END;
$$;

-- -------------------------------------------------------
-- TRIGGER: generar_alerta_consistencia
-- Si se modifica un objetivo específico, generar alerta
-- para que el estudiante revise instrumentos y marco teórico
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_alerta_objetivo_modificado()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo si el objetivo ya estaba validado y se modifica la descripción
  IF OLD.bloom_validado = TRUE AND (
    OLD.descripcion != NEW.descripcion OR
    OLD.verbo != NEW.verbo OR
    OLD.variables != NEW.variables
  ) THEN
    -- Marcar el objetivo como que requiere revisión
    NEW.requiere_revision := TRUE;
    NEW.bloom_validado := FALSE;  -- Requiere re-validación

    -- Insertar alerta en la tabla de consistencia
    INSERT INTO consistency_alerts (project_id, objective_id, tipo_alerta, descripcion)
    VALUES (
      NEW.project_id,
      NEW.id,
      'objetivo_modificado',
      'El objetivo "' || LEFT(NEW.descripcion, 80) || '..." fue modificado. ' ||
      'Revisa los instrumentos de recolección y el índice del marco teórico asociados.'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER objectives_consistency_check
  BEFORE UPDATE ON objectives
  FOR EACH ROW EXECUTE FUNCTION trigger_alerta_objetivo_modificado();

-- -------------------------------------------------------
-- FUNCIÓN: obtener_matriz_consistencia
-- Retorna la Matriz de Consistencia completa del proyecto
-- para visualización en la UI (HU-6.1)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION obtener_matriz_consistencia(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resultado JSONB;
BEGIN
  SELECT jsonb_build_object(
    'proyecto', row_to_json(p),
    'objetivo_general', (
      SELECT row_to_json(o)
      FROM objectives o
      WHERE o.project_id = p_project_id AND o.tipo = 'general'
      LIMIT 1
    ),
    'objetivos_especificos', (
      SELECT jsonb_agg(row_to_json(o) ORDER BY o.orden)
      FROM objectives o
      WHERE o.project_id = p_project_id AND o.tipo = 'specific'
    ),
    'literatura_count', (
      SELECT COUNT(*) FROM literature_review WHERE project_id = p_project_id
    ),
    'alertas_activas', (
      SELECT jsonb_agg(row_to_json(a))
      FROM consistency_alerts a
      WHERE a.project_id = p_project_id AND a.resuelta = FALSE
    ),
    'metodologia', (
      SELECT row_to_json(m)
      FROM methodology m
      WHERE m.project_id = p_project_id
      LIMIT 1
    )
  )
  INTO v_resultado
  FROM projects p
  WHERE p.id = p_project_id AND p.user_id = auth.uid();

  RETURN COALESCE(v_resultado, jsonb_build_object('error', 'Proyecto no encontrado'));
END;
$$;
