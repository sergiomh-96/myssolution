'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, X, Eye, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatOfferNumber } from '@/lib/utils/offer'

interface ValidationsListProps {
  initialOffers: any[]
}

export function ValidationsList({ initialOffers }: ValidationsListProps) {
  const [offers, setOffers] = useState(initialOffers)
  const [loadingAction, setLoadingAction] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Format currency
  const formatAmount = (num: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(num)
  }

  const parseTotals = (items: any[]) => {
    let netoTotal = 0;
    for (const item of items) {
      if (item.type !== 'summary') {
        netoTotal += Number(item.neto_total2) || 0;
      }
    }
    return formatAmount(netoTotal)
  }

  const handleAction = async (id: number, action: 'accept' | 'reject') => {
    setLoadingAction(id)
    try {
      if (action === 'accept') {
        const { error } = await supabase
          .from('offers')
          .update({ is_validated: true })
          .eq('id', id)
        if (error) throw error
        toast.success('Oferta validada y aprobada')
        
      } else if (action === 'reject') {
        const { error } = await supabase
          .from('offers')
          .update({ status: 'rechazada' })
          .eq('id', id)
        if (error) throw error
        toast.success('Oferta rechazada')
      }

      // Remove from list
      setOffers(prev => prev.filter(o => o.id !== id))
      router.refresh()
    } catch (err: any) {
      toast.error(action === 'accept' ? 'Error al validar la oferta' : 'Error al rechazar la oferta', {
        description: err.message
      })
    } finally {
      if (loadingAction === id) setLoadingAction(null)
    }
  }

  if (offers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-green-100 p-3 mb-4">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No hay validaciones pendientes</h3>
          <p className="text-muted-foreground">
            Todas las ofertas que requerían validación han sido procesadas.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="rounded-md border bg-card text-card-foreground">
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[120px]">
                Nº Oferta
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Título
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Cliente
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Creada por
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Total Neto
              </th>
              <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground w-[100px]">
                Estado
              </th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[300px]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {offers.map((offer) => (
              <tr 
                key={offer.id} 
                className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
              >
                <td className="p-4 align-middle">
                  <span className="font-semibold text-foreground">
                    #{formatOfferNumber(offer.offer_number, new Date(offer.created_at).getFullYear())}
                  </span>
                </td>
                <td className="p-4 align-middle font-medium">
                  {offer.title}
                </td>
                <td className="p-4 align-middle">
                  {offer.customer?.company_name || '-'}
                </td>
                <td className="p-4 align-middle">
                  {offer.created_by_profile?.full_name || '-'}
                </td>
                <td className="p-4 align-middle font-bold text-primary">
                  {parseTotals(offer.items || [])}
                </td>
                <td className="p-4 align-middle text-center">
                  <span className="inline-flex items-center justify-center bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-1 rounded border border-orange-200">
                    Pendiente
                  </span>
                </td>
                <td className="p-4 align-middle">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm" className="h-8">
                      <Link href={`/dashboard/offers/${offer.id}`}>
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        Ver
                      </Link>
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-8 bg-green-600 hover:bg-green-700"
                      disabled={loadingAction === offer.id}
                      onClick={() => handleAction(offer.id, 'accept')}
                    >
                      {loadingAction === offer.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Aceptar
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="h-8"
                      disabled={loadingAction === offer.id}
                      onClick={() => handleAction(offer.id, 'reject')}
                    >
                      {loadingAction === offer.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5 mr-1.5" />
                      )}
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
  )
}
