// app/(dashboard)/layout.tsx
// Layout del grupo dashboard.
// El middleware ya protege estas rutas, pero hacemos una verificación
// extra en el servidor para mayor seguridad (defense in depth).

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/layout/DashboardHeader'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Doble verificación server-side (el middleware es la primera capa)
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <DashboardHeader />
      {children}
    </div>
  )
}
