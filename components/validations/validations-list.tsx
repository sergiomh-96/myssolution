'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X, Eye, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatOfferNumber } from '@/lib/utils/offer'

interface ValidationsListProps {
  pendingOffers: any[]
  historyOffers: any[]
}

export function ValidationsList({ pendingOffers: initialPending, historyOffers }: ValidationsListProps) {
  const [pendingOffers, setPendingOffers] = useState(initialPending)
  const [processedOffers, setProcessedOffers] = useState<any[]>([])
  const [loadingAction, setLoadingAction] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const formatAmount = (num: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(num)

  const formatDate = (iso: string | null) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const parseTotals = (items: any[]) => {
    let netoTotal = 0
    for (const item of items) {
      if (item.type !== 'summary') netoTotal += Number(item.neto_total2) || 0
    }
    return formatAmount(netoTotal)
  }

  const handleAction = async (offer: any, action: 'accept' | 'reject') => {
    setLoadingAction(offer.id)
    try {
      const { data: { user } } = await (createClient()).auth.getUser()
      const now = new Date().toISOString()

      if (action === 'accept') {
        // Try with audit fields; fall back to just is_validated if columns don't exist yet
        let error: any
        ;({ error } = await supabase.from('offers').update({
          is_validated: true,
          validated_by: user?.id ?? null,
          validated_at: now,
          rejected_by: null,
          rejected_at: null,
        }).eq('id', offer.id))

        if (error) {
          // Fallback: update only the core field
          const { error: fallbackError } = await supabase.from('offers')
            .update({ is_validated: true })
            .eq('id', offer.id)
          if (fallbackError) throw fallbackError
          console.warn('[Validations] Fallback used - audit columns may not exist yet:', error.message)
        }

        toast.success('Oferta validada y aprobada')
        setProcessedOffers(prev => [{
          ...offer,
          is_validated: true,
          validated_by: user?.id,
          validated_at: now,
          validated_by_name: 'Tú',
        }, ...prev])
      } else {
        let error: any
        ;({ error } = await supabase.from('offers').update({
          status: 'rechazada',
          rejected_by: user?.id ?? null,
          rejected_at: now,
        }).eq('id', offer.id))

        if (error) {
          const { error: fallbackError } = await supabase.from('offers')
            .update({ status: 'rechazada' })
            .eq('id', offer.id)
          if (fallbackError) throw fallbackError
          console.warn('[Validations] Fallback used - audit columns may not exist yet:', error.message)
        }

        toast.success('Oferta rechazada')
        setProcessedOffers(prev => [{
          ...offer,
          status: 'rechazada',
          rejected_by: user?.id,
          rejected_at: now,
          rejected_by_name: 'Tú',
        }, ...prev])
      }

      setPendingOffers(prev => prev.filter(o => o.id !== offer.id))
      router.refresh()
    } catch (err: any) {
      toast.error(action === 'accept' ? 'Error al validar la oferta' : 'Error al rechazar la oferta', {
        description: err.message,
      })
    } finally {
      setLoadingAction(null)
    }
  }

  // Merge history: locally processed + server-fetched history (deduplicated)
  const processedIds = new Set(processedOffers.map(o => o.id))
  const mergedHistory = [
    ...processedOffers,
    ...historyOffers.filter(o => !processedIds.has(o.id)),
  ]

  const tableHeader = (
    <thead className="[&_tr]:border-b">
      <tr className="border-b bg-muted/50">
        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[120px]">Nº Oferta</th>
        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Título</th>
        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Cliente</th>
        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Creada por</th>
        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Total Neto</th>
        <th className="h-10 px-4 text-center align-middle font-medium text-muted-foreground w-[110px]">Estado</th>
        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Gestionado por</th>
        <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[145px]">Fecha gestión</th>
        <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground w-[240px]">Acciones</th>
      </tr>
    </thead>
  )

  return (
    <div className="space-y-8">
      {/* ── PENDING SECTION ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Pendientes de validación</h2>
          {pendingOffers.length > 0 && (
            <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-100 text-orange-800 text-xs font-bold rounded-full border border-orange-200">
              {pendingOffers.length}
            </span>
          )}
        </div>

        {pendingOffers.length === 0 ? (
          <Card>
            <CardContent className="py-8 flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-green-100 p-3 mb-3">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-muted-foreground text-sm">No hay validaciones pendientes.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border bg-card">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                {tableHeader}
                <tbody className="[&_tr:last-child]:border-0">
                  {pendingOffers.map((offer) => (
                    <tr key={offer.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-3 align-middle font-semibold">
                        #{formatOfferNumber(offer.offer_number, new Date(offer.created_at).getFullYear())}
                      </td>
                      <td className="p-3 align-middle font-medium">{offer.title}</td>
                      <td className="p-3 align-middle">{offer.customer?.company_name || '-'}</td>
                      <td className="p-3 align-middle">{offer.created_by_profile?.full_name || '-'}</td>
                      <td className="p-3 align-middle font-bold text-primary">{parseTotals(offer.items || [])}</td>
                      <td className="p-3 align-middle text-center">
                        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-0.5 rounded border border-orange-200">
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      </td>
                      <td className="p-3 align-middle text-muted-foreground text-xs">—</td>
                      <td className="p-3 align-middle text-muted-foreground text-xs">—</td>
                      <td className="p-3 align-middle">
                        <div className="flex justify-end gap-1.5">
                          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                            <Link href={`/dashboard/offers/${offer.id}`}>
                              <Eye className="w-3 h-3 mr-1" />Ver
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
                            disabled={loadingAction === offer.id}
                            onClick={() => handleAction(offer, 'accept')}
                          >
                            {loadingAction === offer.id
                              ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              : <Check className="w-3 h-3 mr-1" />}
                            Aceptar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={loadingAction === offer.id}
                            onClick={() => handleAction(offer, 'reject')}
                          >
                            {loadingAction === offer.id
                              ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              : <X className="w-3 h-3 mr-1" />}
                            Rechazar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── HISTORY SECTION ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Histórico de validaciones</h2>
        </div>

        {mergedHistory.length === 0 ? (
          <Card>
            <CardContent className="py-8 flex flex-col items-center justify-center text-center">
              <p className="text-muted-foreground text-sm">Aún no hay ofertas validadas o rechazadas.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border bg-card">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                {tableHeader}
                <tbody className="[&_tr:last-child]:border-0">
                  {mergedHistory.map((offer) => {
                    const wasValidated = !!offer.validated_at && offer.status !== 'rechazada'
                    return (
                      <tr key={`hist-${offer.id}`} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-3 align-middle font-semibold">
                          #{formatOfferNumber(offer.offer_number, new Date(offer.created_at).getFullYear())}
                        </td>
                        <td className="p-3 align-middle font-medium">{offer.title}</td>
                        <td className="p-3 align-middle">{offer.customer?.company_name || '-'}</td>
                        <td className="p-3 align-middle">{offer.created_by_profile?.full_name || '-'}</td>
                        <td className="p-3 align-middle font-bold text-primary">{parseTotals(offer.items || [])}</td>
                        <td className="p-3 align-middle text-center">
                          {wasValidated ? (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded border border-green-200">
                              <CheckCircle2 className="w-3 h-3" /> Validada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded border border-red-200">
                              <XCircle className="w-3 h-3" /> Rechazada
                            </span>
                          )}
                        </td>
                        <td className="p-3 align-middle text-xs">
                          {wasValidated
                            ? (offer.validated_by_name || '-')
                            : (offer.rejected_by_name || '-')}
                        </td>
                        <td className="p-3 align-middle text-xs text-muted-foreground">
                          {wasValidated ? formatDate(offer.validated_at) : formatDate(offer.rejected_at)}
                        </td>
                        <td className="p-3 align-middle">
                          <div className="flex justify-end">
                            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                              <Link href={`/dashboard/offers/${offer.id}`}>
                                <Eye className="w-3 h-3 mr-1" />Ver
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
