'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, ExternalLink, Edit } from 'lucide-react'
import type { Customer, UserRole } from '@/lib/types/database'

interface AssignedProfile {
  profile_id: string
  profile: { id: string; full_name: string | null; role: string } | null
}

interface CustomersTableProps {
  customers: (Customer & {
    assigned_user?: { full_name: string | null }
    created_by_user?: { full_name: string | null }
    customer_profile_assignments?: AssignedProfile[]
  })[]
  userRole: UserRole
}

const statusColors = {
  lead: 'bg-info/10 text-info border-info/20',
  prospect: 'bg-warning/10 text-warning-foreground border-warning/20',
  active: 'bg-success/10 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-border',
  churned: 'bg-destructive/10 text-destructive border-destructive/20',
}

export function CustomersTable({ customers, userRole }: CustomersTableProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCustomers = customers.filter((customer) => {
    const search = searchQuery.toLowerCase()
    return (
      customer.company_name?.toLowerCase().includes(search) ||
      customer.contact_name?.toLowerCase().includes(search) ||
      customer.contact_email?.toLowerCase().includes(search) ||
      customer.industry?.toLowerCase().includes(search)
    )
  })

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? 'No customers found matching your search' : 'No customers yet'}
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Provincia</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Creado Por</TableHead>
                  <TableHead>Perfiles</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{customer.company_name}</p>
                        {customer.website && (
                          <a
                            href={customer.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            {customer.website}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm text-foreground">{customer.contact_name}</p>
                        <p className="text-xs text-muted-foreground">{customer.contact_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {customer.provincia || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {customer.industry || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[customer.status]}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {customer.created_by_user?.full_name || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {customer.customer_profile_assignments?.length ? (
                          customer.customer_profile_assignments.map((a) =>
                            a.profile ? (
                              <Badge
                                key={a.profile_id}
                                variant="secondary"
                                className="text-xs"
                              >
                                {a.profile.full_name || a.profile_id}
                              </Badge>
                            ) : null
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(customer.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right flex gap-2 justify-end">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/customers/${customer.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/customers/${customer.id}`}>View</Link>
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
