import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface ActivityItem {
  id: string
  title: string
  subtitle: string
  status: string
  date: string
  link: string
  isAssigned?: boolean
}

interface RecentActivityProps {
  isSensitiveVisible: boolean
  title: string
  initialOffers: any[]
}

const statusColors: Record<string, string> = {
  borrador: 'bg-muted text-muted-foreground',
  enviada: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  aceptada: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rechazada: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const statusLabels: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
}

export function RecentActivity({ 
  isSensitiveVisible, 
  title, 
  initialOffers,
}: RecentActivityProps) {
  
  const items: ActivityItem[] = initialOffers.map(offer => ({
    id: offer.id.toString(),
    title: offer.title || `Oferta #${offer.id}`,
    subtitle: offer.customer?.company_name || 'Sin cliente',
    status: offer.status,
    date: offer.created_at,
    link: `/dashboard/offers/${offer.id}`,
    isAssigned: offer.is_assigned
  }))

  return (
    <Card className="h-full border-border/50 shadow-sm transition-all duration-300">
      <CardHeader className="py-2 px-4 border-b border-border/50">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground opacity-80">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-xs italic">No hay actividad reciente</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30 max-h-[350px] overflow-y-auto custom-scrollbar">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.link}
                className="block py-2 px-4 hover:bg-accent/50 transition-all group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-semibold text-xs text-foreground truncate group-hover:text-primary transition-all duration-300",
                      !isSensitiveVisible && "blur-md select-none pointer-events-none opacity-40"
                    )}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={cn(
                        "text-[10px] text-muted-foreground truncate transition-all duration-300",
                        !isSensitiveVisible && "blur-sm opacity-40 select-none"
                      )}>
                        {item.subtitle}
                      </p>
                      <span className="text-[10px] text-muted-foreground/40">•</span>
                      <p className="text-[10px] text-muted-foreground italic">
                        {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant="secondary"
                      className={`text-[9px] px-1.5 py-0 h-4 font-bold uppercase tracking-wider border-none ${statusColors[item.status] || 'bg-muted'}`}
                    >
                      {statusLabels[item.status] || item.status.replace('_', ' ')}
                    </Badge>
                    {item.isAssigned && (
                      <span className="text-[8px] font-bold text-primary-foreground bg-primary/80 px-1 rounded-sm uppercase tracking-tighter">
                        Asignada
                      </span>
                    )}
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
