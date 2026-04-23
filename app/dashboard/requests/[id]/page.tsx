import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AssistanceForm } from '@/components/support/assistance-form'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AssistanceDetailsPage({ params }: PageProps) {
  const { id } = await params
  const profile = await requireProfile()
  const supabase = await createClient()

  // Fetch the assistance with items
  const { data: assistance, error } = await supabase
    .from('support_assistances')
    .select('*, items:support_assistance_items(*)')
    .eq('id', id)
    .single()

  if (error || !assistance) {
    notFound()
  }

  // Get customers for the dropdown - load in batches to support > 1000 records
  const allCustomers: { id: number; company_name: string; id_erp?: number }[] = []
  for (let i = 0; i < 5; i++) {
    const { data: customersData } = await supabase
      .from('customers')
      .select('id, company_name, id_erp')
      .eq('status', 'active')
      .order('company_name')
      .range(i * 1000, (i + 1) * 1000 - 1)
    
    if (customersData && customersData.length > 0) {
      allCustomers.push(...(customersData as any))
    } else {
      break
    }
  }

  // Get employees for assignment
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['admin', 'manager', 'support_agent'])
    .eq('is_active', true)
    .order('full_name')

  return (
    <div className="max-w-[1800px] mx-auto">
      <AssistanceForm
        assistance={assistance as any}
        currentUserId={profile.id}
        currentUserRole={profile.role}
        customers={allCustomers}
        employees={employees || []}
        currentUserName={profile.full_name || 'Usuario'}
      />
    </div>
  )
}
