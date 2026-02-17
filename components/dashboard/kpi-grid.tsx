import { Card, CardContent } from '@/components/ui/card'
import { Users, FileText, Headphones, TrendingUp } from 'lucide-react'
import type { UserRole } from '@/lib/types/database'

interface KPIGridProps {
  customersCount: number
  offersCount: number
  requestsCount: number
  role: UserRole
}

export function KPIGrid({ customersCount, offersCount, requestsCount, role }: KPIGridProps) {
  const kpis = []

  if (['admin', 'manager', 'sales_rep'].includes(role)) {
    kpis.push({
      label: 'Total Customers',
      value: customersCount,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    })
    kpis.push({
      label: role === 'sales_rep' ? 'My Offers' : 'Total Offers',
      value: offersCount,
      icon: FileText,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    })
  }

  if (['admin', 'manager', 'support_agent'].includes(role)) {
    kpis.push({
      label: role === 'support_agent' ? 'My Requests' : 'Support Requests',
      value: requestsCount,
      icon: Headphones,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <Card key={kpi.label} className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="text-3xl font-semibold text-foreground">
                    {kpi.value.toLocaleString()}
                  </p>
                </div>
                <div className={`flex items-center justify-center w-14 h-14 rounded-xl ${kpi.bgColor}`}>
                  <Icon className={`w-7 h-7 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
