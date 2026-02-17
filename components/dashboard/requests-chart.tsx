import { createClient } from '@/lib/supabase/server'
import { RequestsChartClient } from './requests-chart-client'

interface RequestsChartProps {
  userId?: string
}

export async function RequestsChart({ userId }: RequestsChartProps) {
  const supabase = await createClient()

  let query = supabase.from('technical_requests').select('priority')
  
  if (userId) {
    query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
  }

  const { data: requests } = await query

  const priorityCounts = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  }

  requests?.forEach((request) => {
    if (request.priority in priorityCounts) {
      priorityCounts[request.priority as keyof typeof priorityCounts]++
    }
  })

  const chartData = [
    { name: 'Low', value: priorityCounts.low },
    { name: 'Medium', value: priorityCounts.medium },
    { name: 'High', value: priorityCounts.high },
    { name: 'Urgent', value: priorityCounts.urgent },
  ].filter(item => item.value > 0)

  return <RequestsChartClient data={chartData} />
}
