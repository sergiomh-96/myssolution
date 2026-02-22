'use client'

import { useState, useEffect } from 'react'
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
import { Search, Edit } from 'lucide-react'
import type { Offer, UserRole } from '@/lib/types/database'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatOfferNumber } from '@/lib/utils/offer'

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
  const [mounted, setMounted] = useState(false)
  const [formattedDates, setFormattedDates] = useState<Record<string | number, string>>({})

  // Format dates only on client side
  useEffect(() => {
    setMounted(true)
    const dates: Record<string | number, string> = {}
    
    offers.forEach((offer) => {
      try {
        dates[offer.id] = formatDistanceToNow(new Date(offer.created_at), {
          addSuffix: true,
          locale: es,
        })
      } catch (error) {
        dates[offer.id] = 'hace poco'
      }
    })
    
    setFormattedDates(dates)
  }, [offers])

  const filteredOffers = offers.filter((offer) => {
    const search = searchQuery.toLowerCase()
    const matchesSearch = 
      offer.title.toLowerCase().includes(search) ||
      offer.customer?.company_name.toLowerCase().includes(search)

    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (!mounted) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            Cargando...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ofertas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue />
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
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery || statusFilter !== 'all'
              ? 'No se encontraron ofertas'
              : 'No hay ofertas todavía'}
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Oferta</TableHead>
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
                      <span className="font-medium text-foreground">
                        {formatOfferNumber(offer.offer_number, new Date(offer.created_at).getFullYear())}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{offer.title}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">
                        {offer.customer?.company_name || 'Desconocido'}
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
                          {offer.created_by_profile?.full_name || 'Desconocido'}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formattedDates[offer.id] || 'hace poco'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/offers/${offer.id}`}>Ver</Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/dashboard/offers/${offer.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
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
