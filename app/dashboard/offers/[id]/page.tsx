import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'
import Link from 'next/link'
import { AddOfferItem } from '@/components/offers/add-offer-item'
import { OfferDetailView } from '@/components/offers/offer-detail-view'

interface PageProps {
  params: Promise<{ id: string }>
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

export default async function OfferDetailPage({ params }: PageProps) {
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
    <div className="space-y-6">
      {/* Professional Offer View */}
      <OfferDetailView offer={offer} items={items || []} />

      <div className="max-w-4xl mx-auto px-8">
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/offers">Volver</Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/offers/${offer.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Oferta
            </Link>
          </Button>
        </div>
      </div>

      {/* Add Item Section */}
      <div className="max-w-4xl mx-auto px-8">
        <AddOfferItem offerId={id} onItemAdded={() => window.location.reload()} />
      </div>

      {/* Offer Details Card */}
      <div className="max-w-4xl mx-auto px-8">
        <Card>
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Estado</label>
                <div className="mt-2">
                  <Badge variant="outline" className={statusColors[offer.status]}>
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

            {offer.notas_internas && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <label className="text-sm font-medium text-muted-foreground">Notas Internas</label>
                <p className="mt-2 text-foreground text-sm">{offer.notas_internas}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
