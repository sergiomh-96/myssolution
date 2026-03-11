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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Search, Edit, Forward, Trash2, Copy } from 'lucide-react'
import type { Offer, UserRole } from '@/lib/types/database'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatOfferNumber } from '@/lib/utils/offer'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DuplicateOfferButton } from './duplicate-offer-button'

interface OffersTableProps {
  offers: (Omit<Offer, 'total_amount' | 'currency'> & {
    amount: number
    pvp_total?: number
    neto_total?: number
    customer: { id: number; company_name: string } | null
    created_by_profile: { full_name: string | null; email: string | null } | null
    approved_by_profile: { full_name: string | null } | null
    assignments?: { user_id: string }[] | null
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

export function OffersTable({ offers: initialOffers, userRole, userId }: OffersTableProps) {
  const router = useRouter()
  const [offersList, setOffersList] = useState(initialOffers)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [mounted, setMounted] = useState(false)
  const [formattedDates, setFormattedDates] = useState<Record<string | number, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string | number; title: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const supabase = createClient()
      
      // Mark offer as hidden (soft delete) instead of hard delete
      const { error: updateError } = await supabase
        .from('offers')
        .update({ visible: false })
        .eq('id', deleteTarget.id)
      
      if (updateError) throw updateError
      
      // Remove from local state immediately for instant UI feedback
      setOffersList(prev => prev.filter(o => o.id !== deleteTarget.id))
      setDeleteTarget(null)
      router.refresh()
    } catch (err) {
      console.error('Error hiding offer:', err)
    } finally {
      setDeleting(false)
    }
  }

  // Format dates only on client side
  useEffect(() => {
    setMounted(true)
    const dates: Record<string | number, string> = {}
    
    offersList.forEach((offer) => {
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
  }, [offersList])

  const filteredOffers = offersList.filter((offer) => {
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
          <div className="border border-border rounded-lg overflow-hidden flex flex-col max-h-[calc(100vh-300px)]">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[100px] sticky left-0 bg-background z-20">Acciones</TableHead>
                    <TableHead className="min-w-[120px]">Nº Oferta</TableHead>
                    <TableHead className="min-w-[150px]">Título</TableHead>
                    <TableHead className="min-w-[140px]">Cliente</TableHead>
                    <TableHead className="min-w-[120px]">PVP Total</TableHead>
                    <TableHead className="min-w-[120px]">Neto Total</TableHead>
                    <TableHead className="min-w-[100px]">Estado</TableHead>
                    {userRole !== 'sales_rep' && <TableHead className="min-w-[140px]">Creado por</TableHead>}
                    <TableHead className="min-w-[130px]">Fecha</TableHead>
                    <TableHead className="min-w-[140px] sticky right-0 bg-background z-20">Más</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="sticky left-0 bg-background z-5">
                        <div className="flex items-center gap-1">
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                            <Link href={`/dashboard/offers/${offer.id}`}>Ver</Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                            <Link href={`/dashboard/offers/${offer.id}/edit`}>
                              <Edit className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground text-sm">
                            {formatOfferNumber(offer.offer_number, new Date(offer.created_at).getFullYear())}
                          </span>
                          {(offer.assignments || []).some((a: any) => a.user_id === userId) && (
                            <Forward className="h-4 w-4 text-info flex-shrink-0" title="Oferta asignada a ti" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <p className="font-medium text-foreground text-sm">{offer.title}</p>
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <span className="text-sm text-foreground">
                          {offer.customer?.company_name || 'Desconocido'}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <span className="font-medium text-foreground text-sm">
                          €{(offer.pvp_total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <span className="font-medium text-foreground text-sm">
                          €{(offer.neto_total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[100px]">
                        <Badge variant="outline" className={statusColors[offer.status]}>
                          {offer.status}
                        </Badge>
                      </TableCell>
                      {userRole !== 'sales_rep' && (
                        <TableCell className="min-w-[140px]">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {offer.created_by_profile?.full_name || 'Desconocido'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {offer.created_by_profile?.email || ''}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="min-w-[130px]">
                        <span className="text-sm text-muted-foreground">
                          {formattedDates[offer.id] || 'hace poco'}
                        </span>
                      </TableCell>
                      <TableCell className="sticky right-0 bg-background z-5 min-w-[140px]">
                        <div className="flex items-center justify-end gap-1">
                          <DuplicateOfferButton offerId={offer.id as string} size="sm" variant="ghost" showLabel={false} />
                          {(userRole === 'admin' || userRole === 'manager' || offer.created_by === userId) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
                              onClick={() => setDeleteTarget({ id: offer.id, title: offer.title })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar oferta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente la oferta <strong>&ldquo;{deleteTarget?.title}&rdquo;</strong> y todas sus líneas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  )
}
