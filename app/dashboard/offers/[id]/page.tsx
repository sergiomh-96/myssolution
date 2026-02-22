import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AddOfferItem } from '@/components/offers/add-offer-item'

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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/offers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{offer.title}</h1>
          <p className="text-sm text-muted-foreground">
            Oferta #{offer.id}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Offer Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Oferta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <div className="mt-1">
                <Badge variant="outline" className={statusColors[offer.status]}>
                  {offer.status}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Cliente</label>
              <p className="mt-1 text-foreground">{offer.customer?.company_name || 'N/A'}</p>
            </div>

            {offer.contact && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contacto</label>
                <div className="mt-1">
                  <p className="text-foreground">{offer.contact.nombre} {offer.contact.apellidos}</p>
                  {offer.contact.email && (
                    <p className="text-sm text-muted-foreground">{offer.contact.email}</p>
                  )}
                  {offer.contact.telefono && (
                    <p className="text-sm text-muted-foreground">{offer.contact.telefono}</p>
                  )}
                </div>
              </div>
            )}

            {offer.tarifa && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tarifa</label>
                <p className="mt-1 text-foreground">{offer.tarifa.nombre}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Descripción</label>
              <p className="mt-1 text-foreground">{offer.description || 'Sin descripción'}</p>
            </div>

            {offer.notes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Notas</label>
                <p className="mt-1 text-foreground">{offer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Monto Total</label>
              <p className="mt-1 text-2xl font-bold text-foreground">
                €{(offer.amount || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Creado por</label>
              <p className="mt-1 text-foreground">{offer.created_by_profile?.full_name || 'Desconocido'}</p>
              <p className="text-sm text-muted-foreground">{offer.created_by_profile?.email}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha de creación</label>
              <p className="mt-1 text-foreground">
                {format(new Date(offer.created_at), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>

            {offer.valid_until && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Válida hasta</label>
                <p className="mt-1 text-foreground">
                  {format(new Date(offer.valid_until), 'dd/MM/yyyy')}
                </p>
              </div>
            )}

            {offer.approved_by && offer.approved_by_profile && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Aprobado por</label>
                <p className="mt-1 text-foreground">{offer.approved_by_profile.full_name}</p>
                {offer.approved_at && (
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(offer.approved_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Item Section */}
      <AddOfferItem offerId={params.id} onItemAdded={() => window.location.reload()} />

      {/* Offer Items */}
      {items && items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Productos / Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-1 text-xs font-medium text-muted-foreground" style={{ width: '40px' }}>Producto</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground" style={{ width: '300px' }}>Descripción</th>
                    <th className="text-right py-2 px-1 text-xs font-medium text-muted-foreground" style={{ width: '40px' }}>Cantidad</th>
                    <th className="text-right py-2 px-1 text-xs font-medium text-muted-foreground" style={{ width: '40px' }}>PVP</th>
                    <th className="text-right py-2 px-1 text-xs font-medium text-muted-foreground" style={{ width: '35px' }}>Dto 1 %</th>
                    <th className="text-right py-2 px-1 text-xs font-medium text-muted-foreground" style={{ width: '35px' }}>Dto 2 %</th>
                    <th className="text-right py-2 px-1 text-xs font-medium text-muted-foreground" style={{ width: '50px' }}>Neto 1</th>
                    <th className="text-right py-2 px-1 text-xs font-medium text-muted-foreground" style={{ width: '50px' }}>Neto 2</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="py-2 px-2 text-xs">
                        <div>
                          <p className="font-medium text-foreground truncate">
                            {item.product?.referencia || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.product?.modelo_nombre}
                          </p>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-xs text-foreground break-words">
                        {item.description || item.product?.descripcion || '-'}
                      </td>
                      <td className="py-2 px-1 text-right text-xs font-medium text-foreground">{item.quantity}</td>
                      <td className="py-2 px-1 text-right text-xs text-foreground">
                        €{item.pvp.toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-right text-xs text-muted-foreground">
                        {item.discount1 ? `${item.discount1}%` : '-'}
                      </td>
                      <td className="py-2 px-1 text-right text-xs text-muted-foreground">
                        {item.discount2 ? `${item.discount2}%` : '-'}
                      </td>
                      <td className="py-2 px-1 text-right text-xs text-foreground">
                        €{item.neto_total1.toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-right text-xs font-medium text-foreground">
                        €{item.neto_total2.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/50 border-t-2 border-border">
                    <td colSpan={7} className="py-2 px-2 text-right text-xs font-bold text-foreground">
                      Total:
                    </td>
                    <td className="py-2 px-1 text-right text-xs font-bold text-foreground">
                      €{items.reduce((sum, item) => sum + Number(item.neto_total2), 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
