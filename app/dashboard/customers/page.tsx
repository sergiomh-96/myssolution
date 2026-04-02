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

  const selectQuery = `
    *,
    assigned_user:profiles!customers_assigned_to_fkey(full_name),
    created_by_user:profiles!customers_created_by_fkey(full_name),
    customer_profile_assignments(
      profile_id,
      profile:profiles!customer_profile_assignments_profile_id_fkey(id, full_name, role)
    )
  `

  // Fetch up to 5000 customers in 5 parallel batches of 1000
  const batches = await Promise.all(
    [0, 1, 2, 3, 4].map(async (i) => {
      let q = supabase
        .from('customers')
        .select(selectQuery)
        .order('company_name', { ascending: true })
        .range(i * 1000, i * 1000 + 999)

      // Apply role-based filter
      if (profile.role === 'sales_rep') {
        if (assignedCustomerIds.length > 0) {
          q = q.or(`assigned_to.eq.${profile.id},id.in.(${assignedCustomerIds.join(',')})`)
        } else {
          q = q.eq('assigned_to', profile.id)
        }
      }

      return q
    })
  )

  const customers = batches.flatMap((b) => b.data || [])
  const error = batches.find((b) => b.error)?.error || null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las relaciones con tus clientes
          </p>
        </div>
        {profile.role !== 'viewer' && (
          <Button asChild>
            <Link href="/dashboard/customers/new">
              <Plus className="w-4 h-4 mr-2" />
              Añadir Cliente
            </Link>
          </Button>
        )}
      </div>

      {error ? (
        <div className="text-destructive">Error loading customers: {error.message}</div>
      ) : (
        <CustomersTable customers={customers || []} userRole={profile.role} />
      )}
    </div>
  )
}
