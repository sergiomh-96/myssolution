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
    borrador: 0,
    enviada: 0,
    aceptada: 0,
    rechazada: 0,
  }

  offers?.forEach((offer) => {
    if (offer.status in statusCounts) {
      statusCounts[offer.status as keyof typeof statusCounts]++
    }
  })

  const chartData = [
    { name: 'Borrador', value: statusCounts.borrador },
    { name: 'Enviada', value: statusCounts.enviada },
    { name: 'Aceptada', value: statusCounts.aceptada },
    { name: 'Rechazada', value: statusCounts.rechazada },
  ]

  return <OffersChartClient data={chartData} />
}
