import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit } from 'lucide-react'
import Link from 'next/link'
import { AddOfferItem } from '@/components/offers/add-offer-item'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-warning/10 text-warning-foreground border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  sent: 'bg-info/10 text-info border-info/20',
  accepted: 'bg-success/10 text-success border-success/20',
  declined: 'bg-destructive/10 text-destructive border-destructive/20',
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
          <Button asChild>
            <Link href={`/dashboard/offers/${offer.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
        </div>

        {/* Professional Offer View */}
        <Card className="border-2">
          <CardContent className="p-8">
            {/* Header with Info */}
            <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Nº Oferta</label>
                  <p className="text-lg font-bold text-foreground">{offer.offer_number}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Referencia</label>
                  <p className="text-sm text-foreground">{offer.title || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Cliente</label>
                  <p className="text-sm text-foreground">{offer.customer?.company_name || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Contacto</label>
                  <p className="text-sm text-foreground">
                    {offer.contact ? `${offer.contact.nombre} ${offer.contact.apellidos}` : '-'}
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4 text-right">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Fecha</label>
                  <p className="text-lg font-bold text-foreground">
                    {new Date(offer.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Realiza por</label>
                  <p className="text-sm text-foreground">{offer.created_by_profile?.full_name || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Plazo de Entrega</label>
                  <p className="text-sm text-foreground">A consultar</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Precio</label>
                  <p className="text-lg font-bold text-foreground">NETO</p>
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

        {/* Add Item Section */}
        <div>
          <AddOfferItem offerId={id} onItemAdded={() => window.location.reload()} />
        </div>

        {/* Offer Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Estado</label>
                <div className="mt-2">
                  <Badge variant="outline" className={statusColors[offer.status] || ''}>
                    {offer.status}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Monto Total</label>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  €{(offer.amount || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Creado por</label>
                <p className="mt-2 text-foreground">{offer.created_by_profile?.full_name || 'Desconocido'}</p>
                <p className="text-sm text-muted-foreground">{offer.created_by_profile?.email}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Fecha de creación</label>
                <p className="mt-2 text-foreground">
                  {new Date(offer.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {offer.valid_until && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Válida hasta</label>
                  <p className="mt-2 text-foreground">
                    {new Date(offer.valid_until).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })}
                  </p>
                </div>
              )}

              {offer.approved_by && offer.approved_by_profile && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Aprobado por</label>
                  <p className="mt-2 text-foreground">{offer.approved_by_profile.full_name}</p>
                  {offer.approved_at && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(offer.approved_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>

            {offer.description && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                <p className="mt-2 text-foreground text-sm">{offer.description}</p>
              </div>
            )}

            {offer.notas_internas && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <label className="text-sm font-medium text-muted-foreground">Notas Internas</label>
                <p className="mt-2 text-foreground text-sm">{offer.notas_internas}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
