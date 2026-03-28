// app/(dashboard)/layout.tsx
// Layout del grupo dashboard.
// Protección de rutas: middleware.ts
// Este layout solo obtiene datos del usuario para el header.

import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/layout/DashboardHeader'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const nombre = user?.user_metadata?.nombre_completo ?? user?.email ?? ''
  const email  = user?.email ?? ''

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <DashboardHeader nombre={nombre} email={email} />
      {children}
    </div>
  )
}
