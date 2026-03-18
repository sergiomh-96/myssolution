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

  // Fetch the offer with creator profile
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('*, created_by_profile:profiles!created_by(full_name)')
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

  // Get customers for the dropdown - load up to 5000 in batches of 1000
  let customers: { id: string; company_name: string; status: string }[] = []
  
  if (profile.role === 'sales_rep') {
    const allCustomers: typeof customers = []
    for (let i = 0; i < 5; i++) {
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, company_name, status')
        .eq('assigned_to', profile.id)
        .order('company_name')
        .range(i * 1000, i * 1000 + 999)
      
      if (customersData && customersData.length > 0) {
        allCustomers.push(...customersData)
      } else {
        break
      }
    }
    customers = allCustomers
  } else {
    // Admins and managers see all customers
    const allCustomers: typeof customers = []
    for (let i = 0; i < 5; i++) {
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, company_name, status')
        .order('company_name')
        .range(i * 1000, i * 1000 + 999)
      
      if (customersData && customersData.length > 0) {
        allCustomers.push(...customersData)
      } else {
        break
      }
    }
    customers = allCustomers
  }

  // Ensure the current offer's customer is included in the list
  if (offer.customer_id && !customers.find(c => String(c.id) === String(offer.customer_id))) {
    const { data: currentCustomer } = await supabase
      .from('customers')
      .select('id, company_name, status')
      .eq('id', offer.customer_id)
      .single()
    
    if (currentCustomer) {
      customers = [currentCustomer, ...customers]
    }
  }

  return (
    <div className="max-w-[1800px] mx-auto space-y-6 px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/offers">
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
            createdByName={offer?.created_by_profile?.full_name}
          />
        </CardContent>
      </Card>
    </div>
  )
}
