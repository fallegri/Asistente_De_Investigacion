# ESPECIFICACIONES TÉCNICAS — Asistente de Investigación Académica
## Versión 1.1 — Documento vivo actualizado al estado actual del proyecto

---

## 1. VISIÓN GENERAL

### 1.1 Descripción del proyecto

Sistema web open source para guiar a estudiantes universitarios en la formulación de perfiles de investigación académica. Implementa un flujo de 5 fases secuenciales con validación metodológica basada en la Taxonomía de Bloom, retroalimentación socrática con IA, y exportación del perfil completo en formato APA 7.

### 1.2 Origen y contexto

Desarrollado originalmente como caso de uso para docencia universitaria en la Escuela de Informática y Telecomunicaciones (EIT) de la Universidad para el Desarrollo y la Innovación (UDI), La Paz, Bolivia. Publicado como proyecto open source bajo licencia MIT para que la comunidad pueda adaptarlo y mejorarlo.

### 1.3 Repositorio

- **GitHub:** `https://github.com/TU-USUARIO/Asistente_De_Investigacion`
- **Licencia:** MIT
- **Deploy:** Vercel (producción)
- **Estado actual:** v1.0 desplegada, bug activo en hidratación de React (botones sin respuesta)

---

## 2. STACK TECNOLÓGICO

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Next.js App Router | 14+ |
| Lenguaje | TypeScript | 5+ |
| Estilos | Tailwind CSS | 3+ |
| Backend/DB | Supabase (PostgreSQL) | - |
| Auth | Supabase Auth | - |
| Storage | Supabase Storage | - |
| IA | Google Gemini 2.0 Flash vía Vercel AI SDK | - |
| Estado global | Zustand | - |
| Validación | Zod + React Hook Form | - |
| Generación .docx | docx (npm) | - |
| Deploy | Vercel | - |
| Búsqueda bibliográfica | Semantic Scholar API (gratuita) + Serp API (opcional) | - |

---

## 3. MODELO DE DATOS (SUPABASE)

### 3.1 Tablas

#### `projects`
Registro principal de cada perfil de investigación.

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID PK | Generado automáticamente |
| user_id | UUID FK | Referencia a auth.users |
| escuela | TEXT NOT NULL | Nombre de la institución académica (libre, no hardcodeado) |
| carrera | career_type ENUM | `ingenieria_sistemas`, `diseno_grafico`, `otra` |
| area_estudio | TEXT NOT NULL | Área/empresa/contexto del estudio |
| titulo_tentativo | TEXT | Opcional, puede definirse después |
| carga_horaria_confirmada | BOOLEAN | Compromiso académico confirmado |
| status | project_status ENUM | Estado de la máquina de estados |
| is_exploratory_exception | BOOLEAN | Habilitada cuando no hay literatura suficiente |
| created_at | TIMESTAMPTZ | - |
| updated_at | TIMESTAMPTZ | Auto-actualizado por trigger |

**Nota v1.1:** El campo `escuela` ya no es `DEFAULT 'EIT'`. Ahora recibe el nombre de institución ingresado libremente por el usuario al crear el proyecto.

#### `evidence`
Evidencia empírica del problema de investigación.

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID PK | - |
| project_id | UUID FK | - |
| tipo_evidencia | evidence_type ENUM | `file`, `text`, `interview` |
| contenido_raw | TEXT | Texto redactado por el estudiante |
| word_count | INTEGER GENERATED | Conteo automático, mínimo 300 |
| file_path | TEXT | URL en Supabase Storage |
| ai_extracted_problems | JSONB | Lista de problemas extraídos por IA |
| problema_central | TEXT | Problema seleccionado/confirmado por el estudiante |
| problema_confirmado | BOOLEAN | - |

#### `objectives`
Objetivos de investigación validados con Taxonomía de Bloom.

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID PK | - |
| project_id | UUID FK | - |
| tipo | objective_type ENUM | `general`, `specific` |
| verbo | TEXT NOT NULL | Verbo en infinitivo validado contra lista Bloom |
| descripcion | TEXT NOT NULL | Descripción completa del objetivo |
| variables | JSONB | Variables extraídas para el Marco Teórico |
| bloom_validado | BOOLEAN | Confirmado por el filtro Bloom + IA |
| requiere_revision | BOOLEAN | Activo si el objetivo fue modificado tras validación |
| orden | INTEGER | Para ordenar los específicos |

**Restricción:** Solo 1 objetivo general por proyecto (índice único).

#### `literature_review`
Estado de la Cuestión — artículos científicos.

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID PK | - |
| project_id | UUID FK | - |
| anio | INTEGER | Año de publicación |
| pais | TEXT | País de origen |
| autor | TEXT NOT NULL | Apellido, N. formato APA |
| titulo | TEXT NOT NULL | Título completo |
| aportaciones | TEXT | Aportaciones a la cuestión del problema |
| vacios | TEXT | Problemas o vacíos que no resuelve |
| diferencias | TEXT | Diferencias con el tema del estudiante |
| similitudes | TEXT | Similitudes con el tema del estudiante |
| url_pdf | TEXT | DOI o URL del artículo |
| source | TEXT | `manual` o `scholar` (fallback automático) |

**Regla de negocio:** Mínimo 6 artículos, máximo 15.

#### `methodology`
Diseño metodológico derivado del cuestionario socrático.

| Campo | Tipo | Descripción |
|---|---|---|
| enfoque | research_approach ENUM | `qualitative`, `quantitative`, `mixed` |
| alcance | TEXT | `exploratorio`, `descriptivo`, `correlacional`, `explicativo` |
| poblacion_size | INTEGER | Tamaño de la población |
| muestra_size | INTEGER | Calculado con fórmula de Cochran |
| nivel_confianza | NUMERIC | Default 95% |
| margen_error | NUMERIC | Default 5% |
| instrumentos | JSONB | Preguntas generadas por IA |
| marco_teorico_indice | JSONB | Índice generado por IA |

#### `consistency_alerts`
Alertas de consistencia metodológica.

| Campo | Tipo | Descripción |
|---|---|---|
| project_id | UUID FK | - |
| objective_id | UUID FK | Objetivo que generó la alerta |
| tipo_alerta | TEXT | `objetivo_modificado`, etc. |
| descripcion | TEXT | Mensaje para el estudiante |
| resuelta | BOOLEAN | El estudiante la marcó como resuelta |

#### `bloom_verbs`
Lista de verbos permitidos y bloqueados (datos semilla).

**Permitidos (18):** Analizar, Determinar, Identificar, Evaluar, Describir, Proponer, Establecer, Comparar, Examinar, Interpretar, Explicar, Clasificar, Relacionar, Caracterizar, Contrastar, Valorar, Estimar, Diagnosticar.

**Bloqueados (7):** Diseñar, Crear, Desarrollar, Implementar, Construir, Programar, Elaborar.

### 3.2 Seguridad — Row Level Security (RLS)

Habilitado en todas las tablas. Política: cada usuario solo accede a sus propios datos vía `auth.uid() = user_id`. Las tablas relacionadas usan subqueries para verificar ownership transitivo.

### 3.3 Funciones PostgreSQL

| Función | Descripción |
|---|---|
| `validar_avance_estado(project_id, nuevo_estado)` | Valida las condiciones de cada transición y actualiza el status |
| `calcular_muestra(poblacion, confianza, margen_error)` | Fórmula de Cochran con corrección finita |
| `validar_verbo_bloom(verbo)` | Verifica si un verbo está en la lista permitida |
| `obtener_matriz_consistencia(project_id)` | Retorna la vista completa para la UI de exportación |

### 3.4 Storage Buckets

| Bucket | Contenido | Acceso |
|---|---|---|
| `evidence-files` | Archivos de campo del estudiante | Privado |
| `literature-pdfs` | PDFs de artículos científicos | Privado |
| `exports` | Documentos .docx generados | Privado |

---

## 4. MÁQUINA DE ESTADOS

```
init → diagnosis → objectives → literature → methodology → complete
```

### 4.1 Condiciones de transición

| Transición | Condición requerida |
|---|---|
| `init → diagnosis` | `carga_horaria_confirmada = true` |
| `diagnosis → objectives` | Evidencia guardada + `problema_confirmado = true` + mínimo 300 palabras o archivo |
| `objectives → literature` | 1 objetivo general `bloom_validado = true` + mínimo 3 específicos validados |
| `literature → methodology` | 6-15 artículos OR `is_exploratory_exception = true` |
| `methodology → complete` | Diseño metodológico guardado en DB |

La validación ocurre en la función PostgreSQL `validar_avance_estado` — la UI no puede saltarse fases.

---

## 5. ARQUITECTURA DE RUTAS

### 5.1 Páginas públicas (sin auth)

| Ruta | Descripción |
|---|---|
| `/login` | Acceso con email + contraseña |
| `/register` | Registro nuevo usuario |
| `/forgot-password` | Solicitud de reset de contraseña |
| `/reset-password` | Nueva contraseña (desde link de email) |
| `/auth/callback` | Handler de Supabase (confirmación email, OAuth) |

### 5.2 Páginas protegidas (requieren sesión)

| Ruta | Descripción |
|---|---|
| `/dashboard` | Lista de proyectos + modal de creación |
| `/proyecto/[id]/diagnostico` | Fase 2: carga de evidencia + análisis IA |
| `/proyecto/[id]/objetivos` | Fase 3: formulación con validación Bloom |
| `/proyecto/[id]/literatura` | Fase 4: estado de la cuestión + fallback Scholar |
| `/proyecto/[id]/metodologia` | Fase 5: cuestionario socrático + calculadora de muestra |
| `/proyecto/[id]/exportar` | Fase 6: matriz de consistencia + descarga .docx |

### 5.3 API Routes

| Endpoint | Método | Descripción |
|---|---|---|
| `/api/ai/validar-objetivo` | POST | Validación Bloom + coherencia Gemini |
| `/api/ai/analizar-evidencia` | POST | Extracción de problemas con Gemini |
| `/api/ai/marco-teorico` | POST | Generación de instrumentos e índice |
| `/api/projects/advance-state` | POST | Avance de estado (llama a función DB) |
| `/api/projects/export-docx` | POST | Generación del documento APA 7 |
| `/api/scholar-fallback` | POST | Búsqueda en Semantic Scholar / Serp API |

---

## 6. COMPONENTES PRINCIPALES

| Componente | Ruta | Descripción |
|---|---|---|
| `ProjectStepper` | `components/stepper/` | Stepper sticky con locks visuales por fase |
| `IAPanel` | `components/ia-panel/` | Panel lateral de retroalimentación socrática |
| `BloomVerbInput` | `components/project/` | Input con validación Bloom en tiempo real + modal de bloqueo |
| `DashboardHeader` | `components/layout/` | Header con menú de usuario y logout |

### 6.1 Zustand Store (`lib/store/project-store.ts`)

Estado global del proyecto activo. Carga todas las relaciones en paralelo al montar. Expone acciones para cada operación CRUD y el método `advanceState` que llama al API route.

---

## 7. VARIABLES DE ENTORNO

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clave pública anon |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clave de servicio (solo servidor) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ | API key de Google AI Studio |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL de producción (ej. `https://...vercel.app`) |
| `NEXT_PUBLIC_APP_NAME` | ✅ | Nombre de la app en UI |
| `SERP_API_KEY` | ❌ | Serp API para Scholar (usa Semantic Scholar si está vacía) |

---

## 8. LÓGICA DE IA (PROMPT ENGINEERING)

### 8.1 Análisis de evidencia (`/api/ai/analizar-evidencia`)

Extrae problemas reales de notas de campo, transcripciones o diagnósticos. Retorna lista estructurada con `problema`, `contexto` y `aceptado: false`. Requiere mínimo 300 palabras.

### 8.2 Validación de objetivos (`/api/ai/validar-objetivo`)

Dos capas:
1. **Bloom DB:** verifica el verbo contra `bloom_verbs` en PostgreSQL
2. **Coherencia Gemini:** si el verbo pasa, verifica que el objetivo busque "conocer" y no "hacer". Retorna `score` de 0.0 a 1.0. Score < 0.8 genera advertencia socrática.

### 8.3 Marco teórico e instrumentos (`/api/ai/marco-teorico`)

Recibe variables de los objetivos + enfoque metodológico. Genera:
- Instrumentos de recolección (encuesta Likert o guía de entrevista)
- Índice jerárquico del Marco Teórico (método de vertebración)

### 8.4 Fallback bibliográfico (`/api/scholar-fallback`)

Flujo:
1. Intenta Serp API (Google Scholar) si `SERP_API_KEY` está configurada
2. Fallback a Semantic Scholar API (gratuita, sin key)
3. Si no hay resultados → activa `is_exploratory_exception = true` en el proyecto

---

## 9. EXPORTACIÓN APA 7 (`/api/projects/export-docx`)

Genera un `.docx` completo usando la librería `docx` (npm). Estructura:

1. **Portada** — institución, carrera, título, nombre del estudiante, fecha
2. **Planteamiento del Problema** — descripción + pregunta de investigación
3. **Objetivos** — general y específicos numerados
4. **Estado de la Cuestión** — tabla completa con 6 columnas (los 8 campos del formulario)
5. **Diseño Metodológico** — enfoque, alcance, población/muestra, instrumentos
6. **Referencias** — formato APA 7 con sangría francesa, orden alfabético

**Formato:** Times New Roman 12pt, márgenes 2.54 cm (A4), doble espacio, header con numeración de página.

---

## 10. AUTENTICACIÓN

### 10.1 Flujos implementados

| Flujo | Descripción |
|---|---|
| Registro | Email + contraseña + nombre + institución + carrera → email de confirmación |
| Login | Email + contraseña |
| Recuperación | Email → link con token → nueva contraseña |
| Callback | `/auth/callback` maneja confirmaciones y OAuth |

### 10.2 Protección de rutas

**Capa 1 — Middleware** (`middleware.ts`): intercepta cada request, verifica sesión Supabase, redirige a `/login` si no hay sesión en rutas protegidas. Redirige a `/dashboard` si hay sesión y se intenta acceder a `/login` o `/register`.

**Capa 2 — Server Component** (`(dashboard)/layout.tsx`): verificación adicional server-side como defense in depth.

---

## 11. HISTORIAL DE CAMBIOS

### v1.0 — Release inicial
- Sistema completo de 5 fases
- Validación Bloom en tiempo real
- Exportación .docx APA 7
- Autenticación completa
- Deploy en Vercel + Supabase

### v1.1 — En progreso

**Cambios aplicados:**
- Modal de creación de proyecto rediseñado: ahora captura **Institución**, **Carrera** y **Área** como campos de texto libre (antes eran valores hardcodeados "UDI/EIT")
- Eliminadas todas las referencias institucionales hardcodeadas de la UI
- Checkbox de "400 horas UDI" reemplazado por "Confirmo mi compromiso académico" genérico
- Layout responsive: padding adaptativo `px-4 sm:px-6`, stepper collapsible en móvil
- Dashboard header collapsible en móvil
- `LICENSE` MIT agregada
- `CONTRIBUTING.md` agregado
- `README.md` orientado a comunidad open source

**Bug activo — pendiente de resolver:**
- Los botones del dashboard no abren el modal en producción
- Causa identificada: problema de hidratación de React entre Server Component (`layout.tsx`) y Client Component (`dashboard/page.tsx`)
- Intentos de solución: eliminar `onAuthStateChange`, agregar `useRef` para evitar doble ejecución — sin éxito aún
- Próximo paso: refactorizar el dashboard como Server Component puro que pase los datos iniciales como props al Client Component del modal

---

## 12. BUGS CONOCIDOS Y PENDIENTES

### 12.1 Bugs activos

| # | Descripción | Prioridad | Estado |
|---|---|---|---|
| B-01 | Botones del dashboard no abren el modal en producción | 🔴 Crítico | En investigación |

### 12.2 Features pendientes

| # | Descripción | Prioridad |
|---|---|---|
| F-01 | Subida de archivos a Supabase Storage en fase de diagnóstico y literatura | 🟡 Media |
| F-02 | Editor de texto enriquecido (TipTap) para justificación con sugerencias IA inline | 🟡 Media |
| F-03 | Pruebas de carga (500 usuarios concurrentes según plan QA) | 🟢 Baja |

### 12.3 Mejoras v2 planificadas

| # | Descripción |
|---|---|
| M-01 | Al registrarse, capturar institución, carrera y área — usarlos en todos los documentos generados y en el header del sistema |
| M-02 | Perfil de usuario editable (nombre, institución, carrera) |
| M-03 | Soporte multi-institución con personalización de logo y colores |
| M-04 | Soporte para más metodologías (no solo Sampieri/Bloom) |
| M-05 | Traducción a inglés y portugués |
| M-06 | Modo docente: vista de todos los proyectos de los estudiantes |
| M-07 | Notificaciones por email al avanzar de fase |

---

## 13. ESTRUCTURA DE ARCHIVOS

```
Asistente_De_Investigacion/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx              # Layout split-screen auth
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Server Component + DashboardHeader
│   │   ├── dashboard/page.tsx      # Client Component — lista + modal
│   │   └── proyecto/[id]/
│   │       ├── layout.tsx          # Carga proyecto + Stepper
│   │       ├── diagnostico/page.tsx
│   │       ├── objetivos/page.tsx
│   │       ├── literatura/page.tsx
│   │       ├── metodologia/page.tsx
│   │       └── exportar/page.tsx
│   ├── api/
│   │   ├── ai/validar-objetivo/route.ts
│   │   ├── ai/analizar-evidencia/route.ts
│   │   ├── ai/marco-teorico/route.ts
│   │   ├── projects/advance-state/route.ts
│   │   ├── projects/export-docx/route.ts
│   │   └── scholar-fallback/route.ts
│   ├── auth/callback/route.ts
│   ├── globals.css
│   └── layout.tsx                  # Root layout con fuentes
├── components/
│   ├── ia-panel/IAPanel.tsx
│   ├── layout/DashboardHeader.tsx
│   ├── project/BloomVerbInput.tsx
│   └── stepper/ProjectStepper.tsx
├── lib/
│   ├── bloom/validator.ts          # Validación local optimista
│   ├── hooks/useUser.ts            # Hook de sesión cliente
│   ├── store/project-store.ts      # Zustand store
│   ├── supabase/client.ts          # Cliente browser
│   ├── supabase/server.ts          # Cliente SSR
│   └── utils.ts                    # cn() helper
├── supabase/migrations/
│   ├── 001_extensions_and_enums.sql
│   ├── 002_core_tables.sql
│   ├── 003_rls_policies.sql
│   ├── 004_business_logic_functions.sql
│   └── 005_storage_indexes_seed.sql
├── types/index.ts                  # Tipos TypeScript centrales
├── middleware.ts                   # Protección de rutas
├── .env.example
├── LICENSE                         # MIT
├── CONTRIBUTING.md
└── README.md
```

---

## 14. GUÍA DE DEPLOY

### 14.1 Orden de configuración

1. Crear proyecto en Supabase (región São Paulo)
2. Ejecutar las 5 migraciones SQL en orden
3. Crear 3 Storage Buckets (evidence-files, literature-pdfs, exports) — acceso privado
4. Obtener API Key de Google AI Studio
5. Crear repositorio GitHub (público, MIT)
6. Importar en Vercel + configurar variables de entorno
7. Primer deploy → copiar URL de Vercel
8. Actualizar `NEXT_PUBLIC_APP_URL` en Vercel con la URL real
9. Configurar en Supabase Auth → URL Configuration → Site URL y Redirect URLs
10. Redeploy final

### 14.2 Variables mínimas para funcionar

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=Asistente de Investigación
```
