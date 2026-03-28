// app/(dashboard)/dashboard/page.tsx
// Server Component puro — solo obtiene datos y renderiza.
// La protección de ruta la hace el middleware (middleware.ts).

import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'
import type { Project } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user?.id ?? '')
    .order('created_at', { ascending: false })

  return (
    <DashboardClient
      initialProjects={(projects as Project[]) ?? []}
      userId={user?.id ?? ''}
    />
  )
}
