import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface RequestsChartProps {
  userId?: string
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Requests by Priority</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No requests data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
