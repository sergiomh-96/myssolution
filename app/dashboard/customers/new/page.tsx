import { requireProfile } from '@/lib/auth'
import { CustomerForm } from '@/components/customers/customer-form'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewCustomerPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  // Get list of users for profile assignment
  // admins, managers, and sales_rep can assign users when creating a customer
  let users: { id: string; full_name: string | null; role: string }[] = []
  
  if (profile.role === 'admin' || profile.role === 'manager' || profile.role === 'sales_rep') {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .order('full_name')
    
    users = data || []
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Add New Customer</h1>
        <p className="text-muted-foreground mt-1">
          Create a new customer record
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            currentUserId={profile.id}
            currentUserRole={profile.role}
            availableUsers={users}
          />
        </CardContent>
      </Card>
    </div>
  )
}
