'use client'

import { useState, useMemo } from 'react'
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
import { Search, ExternalLink, Edit, ChevronLeft, ChevronRight } from 'lucide-react'
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

const PAGE_SIZE = 500

export function CustomersTable({ customers, userRole }: CustomersTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) =>
      (a.company_name || '').toLowerCase().localeCompare((b.company_name || '').toLowerCase())
    )
  }, [customers])

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return sortedCustomers
    const search = searchQuery.toLowerCase()
    return sortedCustomers.filter((c) =>
      c.company_name?.toLowerCase().includes(search) ||
      c.contact_name?.toLowerCase().includes(search) ||
      c.contact_email?.toLowerCase().includes(search) ||
      c.industry?.toLowerCase().includes(search)
    )
  }, [sortedCustomers, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const pageCustomers = filteredCustomers.slice(pageStart, pageStart + PAGE_SIZE)

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <span className="text-sm text-muted-foreground shrink-0">
            {filteredCustomers.length} clientes
          </span>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? 'No se encontraron clientes' : 'No hay clientes'}
          </div>
        ) : (
          <>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
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
                  {pageCustomers.map((customer, index) => (
                    <TableRow key={customer.id}>
                      <TableCell className="text-muted-foreground font-medium w-12">
                        {pageStart + index + 1}
                      </TableCell>
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
                        <Badge variant="outline" className={statusColors[customer.status as keyof typeof statusColors] ?? ''}>
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
                                <Badge key={a.profile_id} variant="secondary" className="text-xs">
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
                          {formatDistanceToNow(new Date(customer.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/dashboard/customers/${customer.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/dashboard/customers/${customer.id}`}>View</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Mostrando {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredCustomers.length)} de {filteredCustomers.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={safePage === page ? 'default' : 'outline'}
                      size="sm"
                      className="w-9"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
