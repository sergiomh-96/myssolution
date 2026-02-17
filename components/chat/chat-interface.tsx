'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { ChannelList } from './channel-list'
import { ChatWindow } from './chat-window'
import { CreateChannelDialog } from './create-channel-dialog'
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

  const selectedChannel = channels.find(c => c.id === selectedChannelId)

  const handleChannelCreated = (newChannel: ChatChannel) => {
    setChannels(prev => [newChannel, ...prev])
    setSelectedChannelId(newChannel.id)
    setShowCreateDialog(false)
  }

  return (
    <div className="flex h-full gap-6">
      <Card className="w-80 flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-lg">Messages</h2>
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
              <p className="text-sm">Select a channel to start messaging</p>
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
