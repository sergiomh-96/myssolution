import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default async function AnalyticsPage() {
  await requireRole(['admin', 'manager', 'viewer'])
  
  const supabase = await createClient()

  // Fetch aggregated data
  const [customers, offers, requests] = await Promise.all([
    supabase.from('customers').select('status, created_at'),
    supabase.from('offers').select('status, total_amount, created_at'),
    supabase.from('technical_requests').select('priority, status, created_at'),
  ])

  // Customer status breakdown
  const customerByStatus = {
    lead: 0,
    prospect: 0,
    active: 0,
    inactive: 0,
    churned: 0,
  }
  customers.data?.forEach(c => {
    if (c.status in customerByStatus) {
      customerByStatus[c.status as keyof typeof customerByStatus]++
    }
  })

  const customerData = Object.entries(customerByStatus).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    customers: value,
  }))

  // Offer revenue by status
  const offerRevenue = {
    accepted: 0,
    sent: 0,
    approved: 0,
    pending: 0,
  }
  offers.data?.forEach(o => {
    if (o.status in offerRevenue) {
      offerRevenue[o.status as keyof typeof offerRevenue] += o.total_amount
    }
  })

  const revenueData = Object.entries(offerRevenue).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    revenue: value,
  }))

  // Request resolution stats
  const requestStats = {
    open: 0,
    in_progress: 0,
    pending_customer: 0,
    resolved: 0,
    closed: 0,
  }
  requests.data?.forEach(r => {
    if (r.status in requestStats) {
      requestStats[r.status as keyof typeof requestStats]++
    }
  })

  const requestData = Object.entries(requestStats).map(([name, value]) => ({
    name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    requests: value,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Business insights and performance metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{customers.data?.length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{offers.data?.length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Support Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{requests.data?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customers by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={customerData}>
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
                <Bar dataKey="customers" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Offer Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
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
                <Bar dataKey="revenue" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Support Request Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={requestData}>
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
                <Bar dataKey="requests" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
