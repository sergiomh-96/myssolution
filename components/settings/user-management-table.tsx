'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Profile } from '@/lib/types/database'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle, XCircle } from 'lucide-react'

interface UserManagementTableProps {
  users: Profile[]
}

const roleColors = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  manager: 'bg-warning/10 text-warning-foreground border-warning/20',
  sales_rep: 'bg-primary/10 text-primary border-primary/20',
  support_agent: 'bg-info/10 text-info border-info/20',
  viewer: 'bg-muted text-muted-foreground border-border',
}

export function UserManagementTable({ users }: UserManagementTableProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <span className="font-medium">{user.full_name || 'Unnamed User'}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={roleColors[user.role]}>
                  {user.role.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {user.department || '-'}
                </span>
              </TableCell>
              <TableCell>
                {user.is_active ? (
                  <div className="flex items-center gap-1.5 text-success">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm">Inactive</span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(user.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
