import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { OfferForm } from '@/components/offers/offer-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewOfferPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Create New Offer</h1>
        <p className="text-muted-foreground mt-1">
          Prepare a new sales proposal
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Offer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <OfferForm
            currentUserId={profile.id}
            currentUserRole={profile.role}
            customers={customers || []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
