import { createClient } from '@/lib/supabase/server'
import { OffersChartClient } from './offers-chart-client'

interface OffersChartProps {
  userId?: string
}

export async function OffersChart({ userId }: OffersChartProps) {
  const supabase = await createClient()

  let query = supabase.from('offers').select('status')
  
  if (userId) {
    query = query.eq('created_by', userId)
  }

  const { data: offers } = await query

  const statusCounts = {
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    sent: 0,
    accepted: 0,
    declined: 0,
  }

  offers?.forEach((offer) => {
    if (offer.status in statusCounts) {
      statusCounts[offer.status as keyof typeof statusCounts]++
    }
  })

  const chartData = [
    { name: 'Draft', value: statusCounts.draft },
    { name: 'Pending', value: statusCounts.pending },
    { name: 'Approved', value: statusCounts.approved },
    { name: 'Sent', value: statusCounts.sent },
    { name: 'Accepted', value: statusCounts.accepted },
    { name: 'Rejected', value: statusCounts.rejected },
    { name: 'Declined', value: statusCounts.declined },
  ]

  return <OffersChartClient data={chartData} />
}
