'use client'

import { useState, useMemo } from 'react'
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
import { es } from 'date-fns/locale'

interface OffersTableProps {
  offers: (Omit<Offer, 'total_amount' | 'currency'> & {
    amount: number
    customer: { id: number; company_name: string } | null
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

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const search = searchQuery.toLowerCase()
      const matchesSearch = 
        offer.title.toLowerCase().includes(search) ||
        offer.customer?.company_name.toLowerCase().includes(search)
      const matchesStatus = statusFilter === 'all' || offer.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [offers, searchQuery, statusFilter])

  // Format date with locale to prevent hydration mismatch
  const getFormattedDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: es,
      })
    } catch (error) {
      return 'Unknown'
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título o cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="approved">Aprobada</SelectItem>
                <SelectItem value="rejected">Rechazada</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="accepted">Aceptada</SelectItem>
                <SelectItem value="declined">Declinada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredOffers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No se encontraron ofertas</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Importe</TableHead>
                      <TableHead>Estado</TableHead>
                      {userRole !== 'sales_rep' && <TableHead>Creado por</TableHead>}
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
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
                            €{(offer.amount || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            {getFormattedDate(offer.created_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/dashboard/offers/${offer.id}`}>Ver</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="border border-border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{offer.title}</h3>
                        <p className="text-xs text-muted-foreground">{offer.customer?.company_name || 'Unknown'}</p>
                      </div>
                      <Badge variant="outline" className={statusColors[offer.status]}>
                        {offer.status}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-foreground">
                        €{(offer.amount || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getFormattedDate(offer.created_at)}
                      </span>
                    </div>

                    {userRole !== 'sales_rep' && (
                      <p className="text-xs text-muted-foreground">
                        Por: {offer.created_by_profile?.full_name || 'Unknown'}
                      </p>
                    )}

                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href={`/dashboard/offers/${offer.id}`}>Ver detalles</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
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
                        €{(offer.amount || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
