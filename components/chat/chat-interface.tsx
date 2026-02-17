'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { ChannelList } from './channel-list'
import { ChatWindow } from './chat-window'
import { CreateChannelDialog } from './create-channel-dialog'
import { UsersList } from './users-list'
import { createClient } from '@/lib/supabase/client'
import type { Profile, ChatChannel } from '@/lib/types/database'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInterfaceProps {
  currentUser: Profile
  initialChannels: ChatChannel[]
  availableUsers: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'>[]
}

export function ChatInterface({ currentUser, initialChannels, availableUsers }: ChatInterfaceProps) {
  const [channels, setChannels] = useState(initialChannels)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    initialChannels[0]?.id || null
  )
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isLoadingDm, setIsLoadingDm] = useState(false)

  const selectedChannel = channels.find(c => c.id === selectedChannelId)

  const handleChannelCreated = (newChannel: ChatChannel) => {
    setChannels(prev => [newChannel, ...prev])
    setSelectedChannelId(newChannel.id)
    setShowCreateDialog(false)
  }

  const handleSelectUser = async (user: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'>) => {
    setIsLoadingDm(true)
    try {
      const supabase = createClient()
      
      // Check if DM channel already exists
      const { data: existingChannel } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('type', 'direct')
        .eq('created_by', currentUser.id)
        .or(`name.eq.${user.id},name.eq.${currentUser.id}`)
        .single()

      if (existingChannel) {
        setSelectedChannelId(existingChannel.id)
        setIsLoadingDm(false)
        return
      }

      // Create new DM channel
      const channelName = `${currentUser.id}|${user.id}`
      const { data: newChannel } = await supabase
        .from('chat_channels')
        .insert({
          name: channelName,
          description: `Direct message with ${user.full_name}`,
          type: 'direct',
          created_by: currentUser.id,
        })
        .select()
        .single()

      if (newChannel) {
        // Add current user and target user to the channel
        await supabase
          .from('chat_members')
          .insert([
            {
              channel_id: newChannel.id,
              user_id: currentUser.id,
            },
            {
              channel_id: newChannel.id,
              user_id: user.id,
            },
          ])

        setChannels(prev => [newChannel, ...prev])
        setSelectedChannelId(newChannel.id)
      }
    } catch (error) {
      console.error('Error creating DM:', error)
    } finally {
      setIsLoadingDm(false)
    }
  }

  return (
    <div className="flex h-full gap-4">
      {/* Users List Sidebar */}
      <Card className="w-72 flex flex-col">
        <UsersList users={availableUsers} onSelectUser={handleSelectUser} />
      </Card>

      {/* Channels Sidebar */}
      <Card className="w-80 flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-lg">Mensajes</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        <ChannelList
          channels={channels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={setSelectedChannelId}
          currentUserId={currentUser.id}
        />
      </Card>

      {/* Chat Window */}
      <Card className="flex-1 flex flex-col">
        {selectedChannel ? (
          <ChatWindow
            channel={selectedChannel}
            currentUser={currentUser}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">No channel selected</p>
              <p className="text-sm">Select a user or channel to start messaging</p>
            </div>
          </div>
        )}
      </Card>

      <CreateChannelDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        currentUserId={currentUser.id}
        availableUsers={availableUsers}
        onChannelCreated={handleChannelCreated}
      />
    </div>
  )
}
