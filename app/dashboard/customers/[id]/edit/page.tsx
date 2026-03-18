import { requireProfile } from '@/lib/auth'
import { CustomerForm } from '@/components/customers/customer-form'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCustomerPage({ params }: PageProps) {
  const profile = await requireProfile()
  const supabase = await createClient()
  const { id } = await params

  // Get customer with created_by_user
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*, created_by_user:profiles!customers_created_by_fkey(full_name)')
    .eq('id', id)
    .single()

  if (customerError || !customer) {
    notFound()
  }

  // Get assigned profiles
  const { data: assignedProfiles } = await supabase
    .from('customer_profile_assignments')
    .select('profile_id, profile:profiles!customer_profile_assignments_profile_id_fkey(id, full_name, role)')
    .eq('customer_id', id)

  // Get list of all profiles for assignment
  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Edit Customer</h1>
        <p className="text-muted-foreground mt-1">
          Update customer information and assigned profiles
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            customer={customer}
            currentUserId={profile.id}
            currentUserRole={profile.role}
            availableUsers={users || []}
            assignedProfiles={assignedProfiles || []}
            customerId={id}
            createdByUser={customer.created_by_user}
          />
        </CardContent>
      </Card>
    </div>
  )
}
