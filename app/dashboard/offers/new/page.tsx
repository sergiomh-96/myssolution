import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { OfferForm } from '@/components/offers/offer-form'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewOfferPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  // Get customers for the dropdown - load up to 5000 in batches of 1000
  let customers: { id: string; company_name: string; status: string }[] = []

  if (profile.role === 'sales_rep') {
    // Get customer IDs assigned directly or via customer_profile_assignments
    const { data: assignedViaProfile } = await supabase
      .from('customer_profile_assignments')
      .select('customer_id')
      .eq('profile_id', profile.id)

    const assignedCustomerIds = (assignedViaProfile || []).map(a => a.customer_id)

    // Get customers assigned directly + via profile assignments in batches
    const allCustomers: typeof customers = []
    for (let i = 0; i < 5; i++) {
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, company_name, status')
        .or(`assigned_to.eq.${profile.id},id.in.(${assignedCustomerIds.length > 0 ? assignedCustomerIds.join(',') : 'null'})`)
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
    // Admins and managers see all customers - load in batches
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

  return (
    <div className="max-w-[1800px] mx-auto space-y-6 px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/offers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Crear Nueva Oferta</h1>
          <p className="text-muted-foreground mt-1">
            Prepara una nueva propuesta comercial
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <OfferForm
            currentUserId={profile.id}
            currentUserRole={profile.role}
            customers={customers}
            createdByName={profile.full_name || undefined}
            currentUserName={profile.full_name || ''}
          />
        </CardContent>
      </Card>
    </div>
  )
}
