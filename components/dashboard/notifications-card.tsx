'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, Circle } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface NotificationItem {
  id: number
  title: string
  message: string | null
  link: string | null
  read: boolean
  created_at: string
  type: string
}

interface NotificationsCardProps {
  notifications: NotificationItem[]
  isSensitiveVisible?: boolean
}

export function NotificationsCard({ notifications = [], isSensitiveVisible = true }: NotificationsCardProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'read') return n.read
    return true
  })

  return (
    <Card className="h-full border-border/50 shadow-sm transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground opacity-80">Notificaciones</CardTitle>
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="h-7 bg-muted/40 p-0.5">
            <TabsTrigger value="all" className="text-[10px] px-2 h-6 transition-all">Todas</TabsTrigger>
            <TabsTrigger value="unread" className="text-[10px] px-2 h-6 transition-all">Nuevas</TabsTrigger>
            <TabsTrigger value="read" className="text-[10px] px-2 h-6 transition-all">Leídas</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="p-0">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
             <Bell className="w-8 h-8 opacity-10 mb-2" />
             <p className="text-[10px] italic">Sin notificaciones</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30 max-h-[350px] overflow-y-auto custom-scrollbar">
            {filteredNotifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.link || '#'}
                className="block py-2 px-4 hover:bg-accent/50 transition-all group relative overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {!notification.read ? (
                      <Circle className="w-2 h-2 fill-primary text-primary" />
                    ) : (
                      <Circle className="w-2 h-2 text-muted-foreground opacity-20" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-semibold truncate transition-all duration-300",
                      notification.read ? 'text-muted-foreground' : 'text-foreground',
                      !isSensitiveVisible && "blur-md select-none opacity-40"
                    )}>
                      {notification.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={cn(
                        "text-[10px] text-muted-foreground truncate flex-1 transition-all duration-300",
                        !isSensitiveVisible && "blur-sm opacity-40 select-none"
                      )}>
                        {notification.message || 'Sin descripción'}
                      </p>
                      <span className="text-[10px] text-muted-foreground italic whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </div>
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
