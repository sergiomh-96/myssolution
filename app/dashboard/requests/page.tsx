import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { AssistanceTable } from '@/components/support/assistance-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function RequestsPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  let query = supabase
    .from('support_assistances')
    .select('*, customer:customers(company_name), employee:profiles!empleado_id(full_name), creator:profiles!created_by(full_name)')
    .order('id', { ascending: false })

  // Support agents and sales reps see only their own (assigned or created)
  if (profile.role === 'support_agent' || profile.role === 'sales_rep') {
    query = query.or(`empleado_id.eq.${profile.id},created_by.eq.${profile.id}`)
  }

  const { data: assistances, error } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Soporte Técnico</h1>
          <p className="text-muted-foreground mt-1 uppercase text-xs font-semibold tracking-wider">
            Gestión y registro de asistencias técnicas
          </p>
        </div>
        <Button asChild className="gap-2 shadow-sm font-semibold">
          <Link href="/dashboard/requests/new">
            <Plus className="w-4 h-4" />
            Nueva Asistencia
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive/20">
          Error al cargar las asistencias: {error.message}
        </div>
      ) : (
        <AssistanceTable 
          assistances={(assistances as any) || []} 
          userRole={profile.role} 
          userId={profile.id} 
        />
      )}
    </div>
  )
}
