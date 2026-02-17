import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { KPIGrid } from '@/components/dashboard/kpi-grid'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { OffersChart } from '@/components/dashboard/offers-chart'
import { RequestsChart } from '@/components/dashboard/requests-chart'

export default async function DashboardPage() {
  const profile = await requireProfile()
  const supabase = await createClient()

  // Fetch KPI data based on role
  const isAdmin = profile.role === 'admin'
  const isManager = profile.role === 'manager'
  const isSalesRep = profile.role === 'sales_rep'
  const isSupportAgent = profile.role === 'support_agent'

  let customersQuery = supabase.from('customers').select('*', { count: 'exact', head: true })
  let offersQuery = supabase.from('offers').select('*', { count: 'exact', head: true })
  let requestsQuery = supabase.from('technical_requests').select('*', { count: 'exact', head: true })

  if (isSalesRep) {
    customersQuery = customersQuery.eq('assigned_to', profile.id)
    offersQuery = offersQuery.eq('created_by', profile.id)
  } else if (isSupportAgent) {
    requestsQuery = requestsQuery.or(`assigned_to.eq.${profile.id},created_by.eq.${profile.id}`)
  }

  const [customersCount, offersCount, requestsCount] = await Promise.all([
    customersQuery,
    offersQuery,
    requestsQuery,
  ])

  // Fetch recent offers
  let recentOffersQuery = supabase
    .from('offers')
    .select('*, customer:customers(company_name), created_by_profile:profiles!offers_created_by_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(5)

  if (isSalesRep) {
    recentOffersQuery = recentOffersQuery.eq('created_by', profile.id)
  }

  const { data: recentOffers } = await recentOffersQuery

  // Fetch recent requests
  let recentRequestsQuery = supabase
    .from('technical_requests')
    .select('*, customer:customers(company_name), assigned_user:profiles!technical_requests_assigned_to_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(5)

  if (isSupportAgent) {
    recentRequestsQuery = recentRequestsQuery.or(`assigned_to.eq.${profile.id},created_by.eq.${profile.id}`)
  }

  const { data: recentRequests } = await recentRequestsQuery

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your business metrics
        </p>
      </div>

      <KPIGrid
        customersCount={customersCount.count || 0}
        offersCount={offersCount.count || 0}
        requestsCount={requestsCount.count || 0}
        role={profile.role}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(isAdmin || isManager || isSalesRep) && (
          <OffersChart userId={isSalesRep ? profile.id : undefined} />
        )}
        {(isAdmin || isManager || isSupportAgent) && (
          <RequestsChart userId={isSupportAgent ? profile.id : undefined} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(isAdmin || isManager || isSalesRep) && recentOffers && (
          <RecentActivity
            title="Recent Offers"
            items={recentOffers.map(offer => ({
              id: offer.id,
              title: offer.title,
              subtitle: offer.customer?.company_name || 'Unknown Customer',
              status: offer.status,
              date: offer.created_at,
              link: `/dashboard/offers/${offer.id}`,
            }))}
            emptyMessage="No offers yet"
          />
        )}
        {(isAdmin || isManager || isSupportAgent) && recentRequests && (
          <RecentActivity
            title="Recent Support Requests"
            items={recentRequests.map(request => ({
              id: request.id,
              title: request.title,
              subtitle: request.customer?.company_name || 'Internal',
              status: request.status,
              date: request.created_at,
              link: `/dashboard/requests/${request.id}`,
            }))}
            emptyMessage="No requests yet"
          />
        )}
      </div>
    </div>
  )
}
