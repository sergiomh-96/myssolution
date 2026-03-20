import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { OffersTable } from '@/components/offers/offers-table'
import { OffersPageHeader } from '@/components/offers/offers-page-header'
import { ExportExcelButton } from '@/components/offers/export-excel-button'

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
      assignments:offer_assignments(user_id),
      items:offer_items(pvp_total, neto_total2)
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

  // Calculate totals for each offer (rounded to 2 decimals)
  const offersWithTotals = (offers || []).map(offer => {
    const items = (offer.items as any[] | undefined) || []
    const pvpTotal = Math.round(items.reduce((sum, item) => sum + (Number(item.pvp_total) || 0), 0) * 100) / 100
    const netoTotal = Math.round(items.reduce((sum, item) => sum + (Number(item.neto_total2) || 0), 0) * 100) / 100
    return {
      ...offer,
      pvp_total: pvpTotal,
      neto_total: netoTotal
    }
  })

  return (
    <div className="space-y-6">
      <OffersPageHeader 
        onExportClick={<ExportExcelButton offers={offersWithTotals} />} 
        userRole={profile.role}
      />

      {error ? (
        <div className="text-destructive">Error cargando ofertas: {error.message}</div>
      ) : (
        <OffersTable offers={offersWithTotals} userRole={profile.role} userId={profile.id} />
      )}
    </div>
  )
}
