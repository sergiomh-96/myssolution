import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { OffersTable } from '@/components/offers/offers-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function OffersPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  let query = supabase
    .from('offers')
    .select('*')
    .order('created_at', { ascending: false })

  // Sales reps only see their own offers
  if (profile.role === 'sales_rep') {
    query = query.eq('created_by', profile.id)
  }

  const { data: offers, error } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Offers</h1>
          <p className="text-muted-foreground mt-1">
            Manage sales proposals and quotations
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/offers/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Offer
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="text-destructive">Error loading offers: {error.message}</div>
      ) : (
        <OffersTable offers={offers || []} userRole={profile.role} userId={profile.id} />
      )}
    </div>
  )
}
