import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { OffersTable } from '@/components/offers/offers-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function OffersPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  let query = supabase
    .from('offers')
    .select(`
      *,
      customer:customers!customer_id(id, company_name),
      created_by_profile:profiles!created_by(full_name),
      approved_by_profile:profiles!approved_by(full_name)
    `)
    .order('created_at', { ascending: false })

  // Sales reps only see their own offers
  if (profile.role === 'sales_rep') {
    query = query.eq('created_by', profile.id)
  }

  const { data: offers, error } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Ofertas</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona propuestas comerciales y presupuestos
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/offers/new">
            <Plus className="w-4 h-4 mr-2" />
            Crear Oferta
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="text-destructive">Error cargando ofertas: {error.message}</div>
      ) : (
        <OffersTable offers={offers || []} userRole={profile.role} userId={profile.id} />
      )}
    </div>
  )
}
