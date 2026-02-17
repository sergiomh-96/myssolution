import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight } from 'lucide-react'

interface ActivityItem {
  id: string
  title: string
  subtitle: string
  status: string
  date: string
  link: string
}

interface RecentActivityProps {
  title: string
  items: ActivityItem[]
  emptyMessage: string
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/10 text-warning-foreground',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  sent: 'bg-info/10 text-info',
  accepted: 'bg-success/10 text-success',
  declined: 'bg-destructive/10 text-destructive',
  open: 'bg-info/10 text-info',
  in_progress: 'bg-warning/10 text-warning-foreground',
  pending_customer: 'bg-muted text-muted-foreground',
  resolved: 'bg-success/10 text-success',
  closed: 'bg-muted text-muted-foreground',
}

export function RecentActivity({ title, items, emptyMessage }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.link}
                className="block p-4 rounded-lg border border-border hover:bg-accent transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {item.title}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.subtitle}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={statusColors[item.status] || 'bg-muted'}
                    >
                      {item.status.replace('_', ' ')}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
