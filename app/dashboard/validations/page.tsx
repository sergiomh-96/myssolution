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

  // We fetch all offers that are NOT validated and have status 'borrador' or 'enviada'.
  // Then we process them to see if they ACTUALLY need validation 
  // (since some might just have is_validated: false but no discounts)
  const { data: offers, error } = await supabase
    .from('offers')
    .select(`
      *,
      customer:customers!customer_id(id, company_name, descuento_sistemas, descuento_difusion, descuento_agfri),
      created_by_profile:profiles!created_by(full_name, email),
      items:offer_items(
        type, discount1, discount2, pvp_total, neto_total2, product_id,
        product:products!product_id(id, familia)
      )
    `)
    .eq('is_validated', false)
    .in('status', ['borrador', 'enviada'])
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="p-6 text-destructive">Error cargando validaciones: {error.message}</div>
  }

  // Filter only those that really need validation
  const pendingOffers = (offers || []).filter((offer: any) => {
    const items = offer.items || [];
    return items.some((item: any) => {
      if (item.type !== 'article' || !item.product?.familia) return false;
      
      let maxDiscount = 0;
      if (item.product.familia === 'SISTEMAS') maxDiscount = offer.customer?.descuento_sistemas || 0;
      else if (item.product.familia === 'DIFUSIÓN') maxDiscount = offer.customer?.descuento_difusion || 0;
      else if (item.product.familia === 'HERRAMIENTA' || item.product.familia === 'MYSAir' || item.product.familia === 'AGFRI') {
        maxDiscount = offer.customer?.descuento_agfri || 0;
      }

      if (maxDiscount === 0) return false;

      const totalDiscount = (1 - (1 - (item.discount1 || 0) / 100) * (1 - (item.discount2 || 0) / 100)) * 100;
      return totalDiscount > maxDiscount + 0.01;
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Validaciones Pendientes</h1>
      </div>
      <ValidationsList initialOffers={pendingOffers} />
    </div>
  )
}
