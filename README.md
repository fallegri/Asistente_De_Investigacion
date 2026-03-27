# Asistente de Investigación Académica

Herramienta open source para guiar a estudiantes en la formulación
de perfiles de investigación, basada en metodologías de Sampieri,
Iturralde y Tarrillo.

Desarrollada como caso de uso para docencia universitaria —
abierta a la comunidad para adaptación y mejora.

## ¿Qué hace?

- Guía al estudiante por 5 fases: Diagnóstico → Objetivos → Literatura → Metodología → Exportación
- Valida objetivos con la Taxonomía de Bloom en tiempo real
- Usa IA (Google Gemini) para retroalimentación socrática en cada fase
- Calcula muestras estadísticas automáticamente (fórmula de Cochran)
- Exporta el perfil completo a .docx en formato APA 7

## Stack tecnológico

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **IA:** Vercel AI SDK + Google Gemini 2.0 Flash
- **Estado global:** Zustand
- **Deploy:** Vercel

## Instalación local

### 1. Clonar y preparar

```bash
git clone https://github.com/TU-USUARIO/Asistente_De_Investigacion.git
cd Asistente_De_Investigacion
npm install
cp .env.example .env.local
```

### 2. Completar variables de entorno

Edita `.env.local` con tus credenciales de Supabase y Google AI Studio.

### 3. Ejecutar migraciones en Supabase

Desde el SQL Editor de tu proyecto Supabase, ejecuta los archivos
de `/supabase/migrations/` en orden (001 → 005).

### 4. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Servicios externos requeridos

| Servicio | Para qué | Costo |
|---|---|---|
| [Supabase](https://supabase.com) | Base de datos + Auth | Gratuito |
| [Google AI Studio](https://aistudio.google.com) | Gemini API | Gratuito con límites |
| [Vercel](https://vercel.com) | Deploy | Gratuito |

## Contribuir

Ver [CONTRIBUTING.md](./CONTRIBUTING.md)

## Licencia

MIT — libre para usar, modificar y distribuir.
