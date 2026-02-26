import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { CustomersTable } from '@/components/customers/customers-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function CustomersPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  let query = supabase
    .from('customers')
    .select(`
      *,
      assigned_user:profiles!customers_assigned_to_fkey(full_name),
      customer_profile_assignments(
        profile_id,
        profile:profiles!customer_profile_assignments_profile_id_fkey(id, full_name, role)
      )
    `)
    .order('created_at', { ascending: false })

  // Sales reps see customers assigned directly OR via customer_profile_assignments
  if (profile.role === 'sales_rep') {
    query = query.or(`assigned_to.eq.${profile.id},customer_profile_assignments.cs.[{"profile_id":"${profile.id}"}]`)
  }

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
