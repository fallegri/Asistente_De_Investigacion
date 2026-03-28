// app/(dashboard)/layout.tsx
// El middleware ya protege estas rutas — este layout solo renderiza.
// Sin verificación de auth aquí para evitar conflictos de hidratación.

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
