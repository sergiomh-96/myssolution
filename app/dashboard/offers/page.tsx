import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { OffersTable } from '@/components/offers/offers-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function OffersPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  // For sales_rep: get IDs of offers assigned to them via offer_assignments
  let assignedOfferIds: string[] = []
  if (profile.role === 'sales_rep') {
    const { data: assigned } = await supabase
      .from('offer_assignments')
      .select('offer_id')
      .eq('user_id', profile.id)
    assignedOfferIds = (assigned || []).map((a) => a.offer_id)
  }

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

  // Sales reps see offers they created OR that are assigned to them
  if (profile.role === 'sales_rep') {
    const offerIdsToShow = [...new Set([...assignedOfferIds])]
    if (offerIdsToShow.length > 0) {
      query = query.or(`created_by.eq.${profile.id},id.in.(${offerIdsToShow.join(',')})`)
    } else {
      query = query.eq('created_by', profile.id)
    }
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
