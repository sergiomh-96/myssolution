import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { RequestForm } from '@/components/requests/request-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function NewRequestPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  // Get customers for the dropdown
  const { data: customers } = await supabase
    .from('customers')
    .select('id, company_name')
    .eq('status', 'active')
    .order('company_name')

  // Get support agents for assignment
  let agents: { id: string; full_name: string | null }[] = []
  
  if (profile.role === 'admin' || profile.role === 'manager') {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['admin', 'manager', 'support_agent'])
      .eq('is_active', true)
      .order('full_name')
    
    agents = data || []
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Create Support Request</h1>
        <p className="text-muted-foreground mt-1">
          Log a new technical support ticket
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestForm
            currentUserId={profile.id}
            currentUserRole={profile.role}
            customers={customers || []}
            agents={agents}
          />
        </CardContent>
      </Card>
    </div>
  )
}
