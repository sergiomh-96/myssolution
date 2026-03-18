import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { RequestsTable } from '@/components/requests/requests-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function RequestsPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  let query = supabase
    .from('technical_requests')
    .select('*')
    .order('created_at', { ascending: false })

  // Support agents see their assigned or created requests
  if (profile.role === 'support_agent') {
    query = query.or(`assigned_to.eq.${profile.id},created_by.eq.${profile.id}`)
  }

  const { data: requests, error } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Technical Support Requests</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer support tickets
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/requests/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Request
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="text-destructive">Error loading requests: {error.message}</div>
      ) : (
        <RequestsTable requests={requests || []} userRole={profile.role} userId={profile.id} />
      )}
    </div>
  )
}
