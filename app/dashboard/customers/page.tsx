import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { CustomersTable } from '@/components/customers/customers-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function CustomersPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  // For sales_rep: get IDs of customers assigned via customer_profile_assignments
  let assignedCustomerIds: string[] = []
  if (profile.role === 'sales_rep') {
    const { data: assigned } = await supabase
      .from('customer_profile_assignments')
      .select('customer_id')
      .eq('profile_id', profile.id)
    assignedCustomerIds = (assigned || []).map((a) => a.customer_id)
  }

  let query = supabase
    .from('customers')
    .select(`
      *,
      assigned_user:profiles!customers_assigned_to_fkey(full_name),
      created_by_user:profiles!customers_created_by_fkey(full_name),
      customer_profile_assignments(
        profile_id,
        profile:profiles!customer_profile_assignments_profile_id_fkey(id, full_name, role)
      )
    `)
    .order('created_at', { ascending: false })
    .range(0, 2999)

  // Sales reps see customers assigned directly OR via customer_profile_assignments
  if (profile.role === 'sales_rep') {
    if (assignedCustomerIds.length > 0) {
      // Include both: directly assigned + assigned via profile assignments
      query = query.or(`assigned_to.eq.${profile.id},id.in.(${assignedCustomerIds.join(',')})`)
    } else {
      // Only directly assigned
      query = query.eq('assigned_to', profile.id)
    }
  }
  // admins and managers see all customers — no filter applied

  const { data: customers, error } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer relationships
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/customers/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="text-destructive">Error loading customers: {error.message}</div>
      ) : (
        <CustomersTable customers={customers || []} userRole={profile.role} />
      )}
    </div>
  )
}
