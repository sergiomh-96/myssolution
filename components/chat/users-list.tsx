'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types/database'

interface UsersListProps {
  users: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'>[]
  onSelectUser: (user: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'>) => void
}

export function UsersList({ users, onSelectUser }: UsersListProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'manager':
        return 'bg-blue-100 text-blue-800'
      case 'sales_rep':
        return 'bg-green-100 text-green-800'
      case 'support_agent':
        return 'bg-purple-100 text-purple-800'
      case 'viewer':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin'
      case 'manager':
        return 'Manager'
      case 'sales_rep':
        return 'Sales Rep'
      case 'support_agent':
        return 'Support Agent'
      case 'viewer':
        return 'Viewer'
      default:
        return role
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="px-4 pt-4 pb-2">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <User className="w-4 h-4" />
          Usuarios
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {users.length} usuario{users.length !== 1 ? 's' : ''} disponible{users.length !== 1 ? 's' : ''}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-2 space-y-2">
          {users.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">No hay otros usuarios disponibles</p>
            </div>
          ) : (
            users.map((user) => (
              <Button
                key={user.id}
                variant="ghost"
                className="w-full justify-start h-auto py-3 px-3 gap-3 hover:bg-accent"
                onClick={() => onSelectUser(user)}
              >
                <Avatar className="w-8 h-8 shrink-0">
                  {user.avatar_url && (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {getInitials(user.full_name || 'User')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">{user.full_name || 'Unknown User'}</p>
                  <Badge variant="outline" className={cn('mt-1 text-xs', getRoleColor(user.role))}>
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
                <MessageCircle className="w-4 h-4 shrink-0 text-muted-foreground" />
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
