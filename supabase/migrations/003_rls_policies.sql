-- ============================================================
-- MIGRACIÓN 003: Row Level Security (RLS) + Policies
-- OWASP: Aislamiento de datos por user_id
-- ============================================================

-- Activar RLS en todas las tablas
ALTER TABLE projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence           ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives         ENABLE ROW LEVEL SECURITY;
ALTER TABLE literature_review  ENABLE ROW LEVEL SECURITY;
ALTER TABLE methodology        ENABLE ROW LEVEL SECURITY;
ALTER TABLE consistency_alerts ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- POLICIES: projects
-- El estudiante solo ve/edita SUS proyectos
-- -------------------------------------------------------
CREATE POLICY "projects: owner full access"
  ON projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------------------
-- POLICIES: evidence
-- Solo accesible si el project_id pertenece al usuario
-- -------------------------------------------------------
CREATE POLICY "evidence: owner via project"
  ON evidence FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- POLICIES: objectives
-- -------------------------------------------------------
CREATE POLICY "objectives: owner via project"
  ON objectives FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- POLICIES: literature_review
-- -------------------------------------------------------
CREATE POLICY "literature: owner via project"
  ON literature_review FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- POLICIES: methodology
-- -------------------------------------------------------
CREATE POLICY "methodology: owner via project"
  ON methodology FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- POLICIES: consistency_alerts
-- -------------------------------------------------------
CREATE POLICY "alerts: owner via project"
  ON consistency_alerts FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
