import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ValidationsList } from '@/components/validations/validations-list'

export default async function ValidationsPage() {
  const profile = await requireProfile()

  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  // No joinamos validated_by_profile / rejected_by_profile directamente
  // porque esos campos referencian auth.users, no profiles.
  // Los nombres los resolveremos a posteriori.
  const SELECT_FIELDS = `
    *,
    customer:customers!customer_id(id, company_name, descuento_sistemas, descuento_difusion, descuento_agfri),
    created_by_profile:profiles!created_by(full_name, email),
    items:offer_items(
      type, discount1, discount2, pvp_total, neto_total2, product_id,
      product:products!product_id(id, familia)
    )
  `

  // Helper to check if an offer actually needs/needed validation
  const offerNeedsValidation = (offer: any): boolean => {
    const items = offer.items || []
    return items.some((item: any) => {
      if (item.type !== 'article' || !item.product?.familia) return false
      let maxDiscount = 0
      if (item.product.familia === 'SISTEMAS') maxDiscount = offer.customer?.descuento_sistemas || 0
      else if (item.product.familia === 'DIFUSIÓN') maxDiscount = offer.customer?.descuento_difusion || 0
      else if (['HERRAMIENTA', 'MYSAir', 'AGFRI'].includes(item.product.familia)) maxDiscount = offer.customer?.descuento_agfri || 0
      if (maxDiscount === 0) return false
      const total = (1 - (1 - (item.discount1 || 0) / 100) * (1 - (item.discount2 || 0) / 100)) * 100
      return total > maxDiscount + 0.01
    })
  }

  // --- Pending ---
  const { data: pendingRaw, error: pendingError } = await supabase
    .from('offers')
    .select(SELECT_FIELDS)
    .eq('is_validated', false)
    .in('status', ['borrador', 'enviada'])
    .order('created_at', { ascending: false })

  // --- History: validated or rejected ---
  const { data: historyRaw, error: historyError } = await supabase
    .from('offers')
    .select(SELECT_FIELDS)
    .or('validated_at.not.is.null,rejected_at.not.is.null')
    .order('created_at', { ascending: false })
    .limit(100)

  if (pendingError || historyError) {
    const msg = pendingError?.message || historyError?.message
    return <div className="p-6 text-destructive">Error cargando validaciones: {msg}</div>
  }

  const pendingOffers = (pendingRaw || []).filter(offerNeedsValidation)
  const historyOffers = (historyRaw || []).filter(offerNeedsValidation)

  // Resolve profile names for validated_by / rejected_by (UUIDs from auth.users)
  const allUserIds = [
    ...new Set([
      ...historyOffers.map((o: any) => o.validated_by).filter(Boolean),
      ...historyOffers.map((o: any) => o.rejected_by).filter(Boolean),
    ])
  ]

  let profileMap: Record<string, string> = {}
  if (allUserIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', allUserIds)

    for (const p of profilesData || []) {
      profileMap[p.id] = p.full_name || p.id
    }
  }

  // Annotate history offers with resolved names
  const historyOffersAnnotated = historyOffers.map((o: any) => ({
    ...o,
    validated_by_name: o.validated_by ? (profileMap[o.validated_by] || o.validated_by) : null,
    rejected_by_name: o.rejected_by ? (profileMap[o.rejected_by] || o.rejected_by) : null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Validaciones</h1>
      </div>
      <ValidationsList pendingOffers={pendingOffers} historyOffers={historyOffersAnnotated} />
    </div>
  )
}
