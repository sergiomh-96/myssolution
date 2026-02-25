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
      created_by_profile:profiles!created_by(full_name, email),
      approved_by_profile:profiles!approved_by(full_name),
      assignments:offer_assignments(user_id)
    `)
    .eq('visible', true)
    .order('created_at', { ascending: false })

  // Admins see all visible offers, sales reps only see their own visible, others see their own visible + assigned
  if (profile.role === 'sales_rep') {
    query = query.eq('created_by', profile.id)
  }

  const { data: offers, error } = await query

  // Filter offers: admins see all, others see created by user + assigned to user
  const filteredOffers = profile.role === 'admin' 
    ? offers || []
    : offers?.filter(offer => {
        const isCreatedByUser = offer.created_by === profile.id
        const isAssignedToUser = (offer.assignments || []).some((a: any) => a.user_id === profile.id)
        return isCreatedByUser || isAssignedToUser
      }) || []

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
        <OffersTable offers={filteredOffers} userRole={profile.role} userId={profile.id} />
      )}
    </div>
  )
}
