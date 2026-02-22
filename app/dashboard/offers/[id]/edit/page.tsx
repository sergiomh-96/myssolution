import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { OfferForm } from '@/components/offers/offer-form'
import { Card, CardContent } from '@/components/ui/card'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditOfferPage({ params }: PageProps) {
  const { id } = await params
  const profile = await requireProfile()
  const supabase = await createClient()

  // Fetch the offer
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('*')
    .eq('id', id)
    .single()

  if (offerError || !offer) {
    notFound()
  }

  // Fetch the offer items
  const { data: offerItems } = await supabase
    .from('offer_items')
    .select('*')
    .eq('offer_id', id)
    .order('id')

  // Get customers for the dropdown
  let customersQuery = supabase
    .from('customers')
    .select('id, company_name, status')
    .order('company_name')

  if (profile.role === 'sales_rep') {
    customersQuery = customersQuery.eq('assigned_to', profile.id)
  }

  const { data: customers } = await customersQuery

  return (
    <div className="max-w-[1800px] mx-auto space-y-6 px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/offers/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Editar Oferta</h1>
          <p className="text-muted-foreground mt-1">
            Modifica los detalles de la oferta comercial
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <OfferForm
            offer={offer}
            currentUserId={profile.id}
            currentUserRole={profile.role}
            customers={customers || []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
