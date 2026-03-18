'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Hash, User, Users } from 'lucide-react'
import type { ChatChannel } from '@/lib/types/database'

interface ChannelListProps {
  channels: ChatChannel[]
  selectedChannelId: string | null
  onSelectChannel: (channelId: string) => void
  currentUserId: string
}

export function ChannelList({ channels, selectedChannelId, onSelectChannel, currentUserId }: ChannelListProps) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const supabase = createClient()

    // Fetch unread message counts for each channel
    const fetchUnreadCounts = async () => {
      const counts: Record<string, number> = {}

      for (const channel of channels) {
        const { data: member } = await supabase
          .from('chat_members')
          .select('last_read_at')
          .eq('channel_id', channel.id)
          .eq('user_id', currentUserId)
          .single()

        if (member?.last_read_at) {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', channel.id)
            .gt('created_at', member.last_read_at)
            .neq('sender_id', currentUserId)

          counts[channel.id] = count || 0
        }
      }

      setUnreadCounts(counts)
    }

    fetchUnreadCounts()

    // Subscribe to new messages
    const subscription = supabase
      .channel('channel-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          fetchUnreadCounts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [channels, currentUserId])

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'direct':
        return User
      case 'group':
        return Users
      default:
        return Hash
    }
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {channels.map((channel) => {
          const Icon = getChannelIcon(channel.type)
          const isSelected = channel.id === selectedChannelId
          const unreadCount = unreadCounts[channel.id] || 0

          return (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{channel.name}</p>
                {channel.description && (
                  <p className={cn(
                    'text-xs truncate',
                    isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    {channel.description}
                  </p>
                )}
              </div>
              {unreadCount > 0 && (
                <Badge
                  variant={isSelected ? 'secondary' : 'default'}
                  className="h-5 min-w-5 px-1.5 text-xs"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </button>
          )
        })}
      </div>
    </ScrollArea>
  )
}
