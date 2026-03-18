'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Send, Hash, User, Users } from 'lucide-react'
import type { ChatChannel, ChatMessage, Profile } from '@/lib/types/database'
import { formatDistanceToNow } from 'date-fns'

interface ChatWindowProps {
  channel: ChatChannel
  currentUser: Profile
}

interface MessageWithSender extends ChatMessage {
  sender: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export function ChatWindow({ channel, currentUser }: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    // Fetch messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(id, full_name, avatar_url)
        `)
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: true })

      if (data) {
        setMessages(data as any)
      }
    }

    fetchMessages()

    // Subscribe to new messages
    const subscription = supabase
      .channel(`messages:${channel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        async (payload) => {
          const { data: newMsg } = await supabase
            .from('chat_messages')
            .select(`
              *,
              sender:profiles!chat_messages_sender_id_fkey(id, full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single()

          if (newMsg) {
            setMessages(prev => [...prev, newMsg as any])
          }
        }
      )
      .subscribe()

    // Update last_read_at
    supabase
      .from('chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('channel_id', channel.id)
      .eq('user_id', currentUser.id)
      .then()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [channel.id, currentUser.id])

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || sending) return

    setSending(true)

    try {
      await supabase.from('chat_messages').insert({
        channel_id: channel.id,
        sender_id: currentUser.id,
        content: newMessage.trim(),
      })

      setNewMessage('')
    } catch (error) {
      console.error('[v0] Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const getChannelIcon = () => {
    switch (channel.type) {
      case 'direct':
        return User
      case 'group':
        return Users
      default:
        return Hash
    }
  }

  const Icon = getChannelIcon()

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">{channel.name}</h3>
            {channel.description && (
              <p className="text-sm text-muted-foreground">{channel.description}</p>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUser.id
            const initials = message.sender.full_name
              ?.split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase() || '?'

            return (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  isOwnMessage && 'flex-row-reverse'
                )}
              >
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>

                <div className={cn('flex flex-col', isOwnMessage && 'items-end')}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {isOwnMessage ? 'You' : message.sender.full_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  <div
                    className={cn(
                      'max-w-md px-4 py-2 rounded-lg',
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
