'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import type { ChatChannel, ChannelType, Profile } from '@/lib/types/database'

interface CreateChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId: string
  availableUsers: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'>[]
  onChannelCreated: (channel: ChatChannel) => void
}

export function CreateChannelDialog({
  open,
  onOpenChange,
  currentUserId,
  availableUsers,
  onChannelCreated,
}: CreateChannelDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'team' as ChannelType,
  })
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      // Create channel
      const { data: channel, error: channelError } = await supabase
        .from('chat_channels')
        .insert({
          name: formData.name,
          description: formData.description || null,
          type: formData.type,
          created_by: currentUserId,
        })
        .select()
        .single()

      if (channelError) throw channelError

      // Add creator as member
      const members = [currentUserId, ...selectedUsers]
      const { error: membersError } = await supabase
        .from('chat_members')
        .insert(
          members.map(userId => ({
            channel_id: channel.id,
            user_id: userId,
          }))
        )

      if (membersError) throw membersError

      onChannelCreated(channel)
      
      // Reset form
      setFormData({ name: '', description: '', type: 'team' })
      setSelectedUsers([])
    } catch (err: any) {
      setError(err.message || 'Failed to create channel')
    } finally {
      setLoading(false)
    }
  }

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Start a new conversation with your team
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="type">Channel Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as ChannelType })}
              disabled={loading}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct Message</SelectItem>
                <SelectItem value="group">Group Chat</SelectItem>
                <SelectItem value="team">Team Channel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Channel Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sales Team, Project Alpha"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What is this channel about?"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <Label>Add Members</Label>
            <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 space-y-2">
              {availableUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`user-${user.id}`}
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => toggleUser(user.id)}
                    disabled={loading}
                  />
                  <label
                    htmlFor={`user-${user.id}`}
                    className="flex-1 text-sm cursor-pointer"
                  >
                    <span className="font-medium">{user.full_name}</span>
                    <span className="text-muted-foreground ml-2 text-xs capitalize">
                      ({user.role.replace('_', ' ')})
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Channel'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
