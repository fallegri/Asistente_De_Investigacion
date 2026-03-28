// app/(dashboard)/dashboard/page.tsx
// SERVER COMPONENT — obtiene proyectos desde Supabase en el servidor.
// Pasa todo como props al Client Component. Sin useState aquí.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'
import type { Project } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <DashboardClient
      initialProjects={(projects as Project[]) ?? []}
      userId={user.id}
    />
  )
}
