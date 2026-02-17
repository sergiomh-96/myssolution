'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search } from 'lucide-react'
import type { Offer, UserRole } from '@/lib/types/database'
import { formatDistanceToNow } from 'date-fns'

interface OffersTableProps {
  offers: (Offer & {
    customer: { id: string; company_name: string } | null
    created_by_profile: { full_name: string | null } | null
    approved_by_profile: { full_name: string | null } | null
  })[]
  userRole: UserRole
  userId: string
}

const statusColors = {
  draft: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-warning/10 text-warning-foreground border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  sent: 'bg-info/10 text-info border-info/20',
  accepted: 'bg-success/10 text-success border-success/20',
  declined: 'bg-destructive/10 text-destructive border-destructive/20',
}

export function OffersTable({ offers, userRole, userId }: OffersTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredOffers = offers.filter((offer) => {
    const search = searchQuery.toLowerCase()
    const matchesSearch = 
      offer.title.toLowerCase().includes(search) ||
      offer.customer?.company_name.toLowerCase().includes(search)

    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search offers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredOffers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery || statusFilter !== 'all'
              ? 'No offers found matching your filters'
              : 'No offers yet'}
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  {userRole !== 'sales_rep' && <TableHead>Created By</TableHead>}
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOffers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{offer.title}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">
                        {offer.customer?.company_name || 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {offer.currency} {offer.total_amount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[offer.status]}>
                        {offer.status}
                      </Badge>
                    </TableCell>
                    {userRole !== 'sales_rep' && (
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {offer.created_by_profile?.full_name || 'Unknown'}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(offer.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/offers/${offer.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
