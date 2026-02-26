import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit } from 'lucide-react'
import Link from 'next/link'
import { GeneratePdfButton } from '@/components/offers/generate-pdf-button'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OfferDetailPage({ params }: PageProps) {
  const profile = await requireProfile()
  const { id } = await params
  const supabase = await createClient()

  // Fetch offer with related data
  const { data: offer, error } = await supabase
    .from('offers')
    .select(`
      *,
      customer:customers!customer_id(id, company_name),
      contact:clients_contacts!contact_id(id, nombre, apellidos, email, telefono),
      tarifa:tarifas!tarifa_id(id_tarifa, nombre),
      created_by_profile:profiles!created_by(full_name, email),
      approved_by_profile:profiles!approved_by(full_name, email)
    `)
    .eq('id', id)
    .single()

  if (error || !offer) {
    notFound()
  }

  // Fetch offer items
  const { data: items } = await supabase
    .from('offer_items')
    .select(`
      *,
      product:products!product_id(id, referencia, modelo_nombre, descripcion)
    `)
    .eq('offer_id', id)
    .order('id')

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Oferta #{offer.offer_number}</h1>
            <p className="text-muted-foreground mt-1">{offer.title}</p>
          </div>
          <div className="flex gap-2">
            <GeneratePdfButton offerId={id} offerNumber={offer.offer_number} />
            <Button asChild>
              <Link href={`/dashboard/offers/${offer.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          </div>
        </div>

        {/* Professional Offer View */}
        <div id="offer-print-content" className="print:bg-white">
          <Card className="border-2">
          <CardContent className="p-8">
          {/* Header with Info */}
          <div className="grid grid-cols-2 gap-0 mb-3 pb-3 border-b">
            {/* Left Column */}
            <div className="border-r pr-8 space-y-1">
              <div className="border-b pb-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Nº Oferta</label>
                <p className="text-base font-bold text-foreground">
                  {new Date(offer.created_at).getFullYear()}-{String(offer.offer_number).padStart(4, '0')}
                </p>
              </div>
              <div className="border-b pb-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Referencia</label>
                <p className="text-xs text-foreground">{offer.title || '-'}</p>
              </div>
              <div className="border-b pb-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Cliente</label>
                <p className="text-xs text-foreground">{offer.customer?.company_name || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Contacto</label>
                <p className="text-xs text-foreground">
                  {offer.contact ? `${offer.contact.nombre} ${offer.contact.apellidos}` : '-'}
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="pl-8 space-y-1">
              <div className="border-b pb-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Fecha</label>
                <p className="text-base font-bold text-foreground">
                  {new Date(offer.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
              <div className="border-b pb-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Realiza por</label>
                <p className="text-xs text-foreground">{offer.created_by_profile?.full_name || '-'}</p>
              </div>
              <div className="border-b pb-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Plazo de Entrega</label>
                <p className="text-xs text-foreground">A consultar</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Precio</label>
                <p className="text-base font-bold text-foreground">NETO</p>
              </div>
            </div>
          </div>

            {/* Items Table */}
            {items && items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-blue-100 border-b-2 border-blue-300">
                      <th className="px-4 py-2 text-left text-xs font-bold text-foreground">Referencia</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-foreground">Descripción</th>
                      <th className="px-4 py-2 text-center text-xs font-bold text-foreground">Cantidad</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-foreground">Neto</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-foreground">Neto Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-xs text-foreground font-medium">
                          {item.product?.referencia || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground">
                          {item.description || item.product?.descripcion || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-center text-foreground">{item.quantity}</td>
                        <td className="px-4 py-3 text-xs text-right text-foreground">
                          €{(item.pvp || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-xs text-right font-bold text-foreground">
                          €{(item.neto_total2 || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                      <td colSpan={4} className="px-4 py-3 text-right text-sm text-foreground">
                        TOTAL:
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-foreground">
                        €{(items.reduce((sum, item) => sum + Number(item.neto_total2 || 0), 0)).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay artículos en esta oferta</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-8 border-t text-xs text-muted-foreground text-center">
              <p>Página 1 de 1</p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </main>
  )
}
