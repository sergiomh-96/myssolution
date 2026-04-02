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
import { Search, Edit, Forward, Trash2, Copy, Check, Calendar } from 'lucide-react'
import type { Offer, UserRole } from '@/lib/types/database'
import { format } from 'date-fns'
import { formatOfferNumber } from '@/lib/utils/offer'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
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
  borrador: 'bg-muted text-muted-foreground border-border',
  enviada: 'bg-info/10 text-info border-info/20',
  aceptada: 'bg-success/10 text-success border-success/20',
  rechazada: 'bg-destructive/10 text-destructive border-destructive/20',
}

export function OffersTable({ offers: initialOffers, userRole, userId }: OffersTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [offersList, setOffersList] = useState(initialOffers)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [onlyMyOffers, setOnlyMyOffers] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [formattedDates, setFormattedDates] = useState<Record<string | number, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<{ id: string | number; title: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Initialize search query from URL if 'customer' parameter is present
  useEffect(() => {
    const customer = searchParams.get('customer')
    if (customer) {
      setSearchQuery(customer)
    }
  }, [searchParams])

  // Update local state when initialOffers prop changes (e.g. after router.refresh())
  useEffect(() => {
    setOffersList(initialOffers)
  }, [initialOffers])

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
        dates[offer.id] = format(new Date(offer.created_at), 'dd/MMM/yy')
      } catch (error) {
        dates[offer.id] = ''
      }
    })
    
    setFormattedDates(dates)
  }, [offersList])

  const filteredOffers = offersList.filter((offer) => {
    const search = searchQuery.toLowerCase()
    
    const matchesSearch = 
      offer.title.toLowerCase().includes(search) ||
      offer.customer?.company_name.toLowerCase().includes(search) ||
      offer.offer_number?.toString().includes(search) ||
      formatOfferNumber(offer.offer_number, new Date(offer.created_at).getFullYear()).toLowerCase().includes(search) ||
      (offer.created_by_profile?.full_name?.toLowerCase().includes(search) ?? false)

    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter
    const matchesUser = !onlyMyOffers || offer.created_by === userId
    
    const offerDate = new Date(offer.created_at)
    const matchesStartDate = !startDate || offerDate >= new Date(startDate)
    const matchesEndDate = !endDate || offerDate <= new Date(`${endDate}T23:59:59`)

    return matchesSearch && matchesStatus && matchesUser && matchesStartDate && matchesEndDate
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
        <div className="flex flex-col xl:flex-row items-center gap-4 mb-6 flex-wrap">
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
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="enviada">Enviada</SelectItem>
              <SelectItem value="aceptada">Aceptada</SelectItem>
              <SelectItem value="rechazada">Rechazada</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Desde:</span>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 pl-7 text-xs w-[180px]"
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Hasta:</span>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 pl-7 text-xs w-[180px]"
              />
            </div>
          </div>
          <Button
            variant={onlyMyOffers ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlyMyOffers(!onlyMyOffers)}
            className="w-full md:w-auto"
          >
            <Check className={`w-4 h-4 mr-2 ${onlyMyOffers ? 'opacity-100' : 'opacity-0'}`} />
            Ver solo mis ofertas
          </Button>
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
              <Table className="text-xs">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="h-9">
                    <TableHead className="min-w-[70px] px-2 py-1 sticky left-0 bg-background z-20 text-xs font-medium">Acciones</TableHead>
                    <TableHead className="min-w-[80px] px-2 py-1 sticky left-[70px] bg-background z-20 text-xs font-medium">Nº Oferta</TableHead>
                    <TableHead className="min-w-[100px] px-2 py-1 text-xs font-medium">Título</TableHead>
                    <TableHead className="min-w-[54px] px-2 py-1 text-xs font-medium">Cliente</TableHead>
                    <TableHead className="min-w-[85px] px-2 py-1 text-xs font-medium">PVP</TableHead>
                    <TableHead className="min-w-[85px] px-2 py-1 text-xs font-medium">Neto</TableHead>
                    <TableHead className="min-w-[70px] px-2 py-1 text-xs font-medium">Estado</TableHead>
                    <TableHead className="min-w-[100px] px-2 py-1 text-xs font-medium">Creado por</TableHead>
                    <TableHead className="min-w-[80px] px-2 py-1 text-xs font-medium">Fecha</TableHead>
                    <TableHead className="min-w-[70px] px-2 py-1 sticky right-0 bg-background z-20 text-xs font-medium">Más</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffers.map((offer) => (
                    <TableRow 
                      key={offer.id} 
                      className="h-8 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/dashboard/offers/${offer.id}/edit`)}
                    >
                      <TableCell className="px-1 py-1 sticky left-0 bg-background z-5">
                        <div className="flex items-center gap-0.5">
                          <Button asChild variant="ghost" size="sm" className="h-6 px-1 text-xs" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/dashboard/offers/${offer.id}`}>Ver</Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="h-6 px-1" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/dashboard/offers/${offer.id}/edit`}>
                              <Edit className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[80px] px-2 py-1 text-xs sticky left-[70px] bg-background z-5">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-foreground">
                            {formatOfferNumber(offer.offer_number, new Date(offer.created_at).getFullYear())}
                          </span>
                          {(offer.assignments || []).some((a: any) => a.user_id === userId) && (
                            <span title="Oferta asignada a ti">
                              <Forward className="h-3 w-3 text-info flex-shrink-0" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[100px] px-2 py-1 text-xs truncate">
                        <p className="font-medium text-foreground truncate">{offer.title}</p>
                      </TableCell>
                      <TableCell className="min-w-[54px] px-2 py-1 text-xs truncate">
                        <span className="truncate">
                          {offer.customer?.company_name || 'Desconocido'}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[85px] px-2 py-1 text-xs">
                        <span className="font-medium text-foreground">
                          €{(offer.pvp_total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[85px] px-2 py-1 text-xs">
                        <span className="font-medium text-foreground">
                          €{(offer.neto_total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[70px] px-2 py-1 text-xs">
                        <Badge variant="outline" className={`text-xs ${statusColors[offer.status]}`}>
                          {offer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[100px] px-2 py-1 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-foreground truncate">
                            {offer.created_by_profile?.full_name || 'Desconocido'}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {offer.created_by_profile?.email || ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[80px] px-2 py-1 text-xs">
                        <span className="text-muted-foreground">
                          {formattedDates[offer.id] || format(new Date(offer.created_at), 'dd/MMM/yy')}
                        </span>
                      </TableCell>
                      <TableCell className="px-1 py-1 sticky right-0 bg-background z-5 min-w-[70px]">
                        <div className="flex items-center justify-end gap-0.5">
                          {userRole !== 'viewer' && (
                            <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                              <DuplicateOfferButton offerId={offer.id.toString()} size="sm" variant="ghost" showLabel={false} />
                            </div>
                          )}
                          {(userRole === 'admin' || userRole === 'manager' || offer.created_by === userId) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 px-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteTarget({ id: offer.id, title: offer.title })
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
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
