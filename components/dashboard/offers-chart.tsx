import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Offers by Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem'
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
