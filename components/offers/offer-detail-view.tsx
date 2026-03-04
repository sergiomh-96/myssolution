'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import Link from 'next/link'

interface OfferViewProps {
  offer: any
  items: any[]
  onPrint?: () => void
  onDownload?: () => void
}

export function OfferDetailView({ offer, items, onPrint, onDownload }: OfferViewProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const totalAmount = items.reduce((sum, item) => sum + Number(item.neto_total2 || 0), 0)
  const validityDays = offer.valid_until 
    ? Math.ceil((new Date(offer.valid_until).getTime() - new Date(offer.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const createdDate = new Date(offer.created_at)
  const formattedDate = createdDate.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/offers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex gap-2">
          {onDownload && (
            <Button size="sm" variant="outline" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          )}
          {onPrint && (
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - A4 Layout */}
      <div className="max-w-4xl mx-auto p-8 bg-white my-8 shadow-lg rounded-lg">
        
        {/* Header with Logo and Company Name */}
        <div className="border-b-2 border-primary pb-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                <div className="text-2xl font-bold text-primary">MYS</div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">MYS Air</h2>
                <p className="text-xs text-muted-foreground">Sistemas Zonales y Difusión</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-foreground">OFERTA</h1>
            </div>
          </div>
        </div>

        {/* Two-column header info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-3">
            {/* Nº Oferta */}
            <div className="border-b border-border pb-1">
              <p className="text-xs text-muted-foreground font-semibold">Nº Oferta</p>
              <p className="text-lg font-bold text-foreground">{offer.offer_number} - {offer.title}</p>
            </div>

            {/* Referencia */}
            <div className="border-b border-border pb-1">
              <p className="text-xs text-muted-foreground font-semibold">Referencia</p>
              <p className="text-sm text-foreground">{offer.customer?.company_name || '-'}</p>
            </div>

            {/* Cliente */}
            <div className="border-b border-border pb-1">
              <p className="text-xs text-muted-foreground font-semibold">Cliente</p>
              <p className="text-sm text-foreground">{offer.customer?.company_name || 'N/A'}</p>
            </div>

            {/* Contacto */}
            <div className="border-b border-border pb-1">
              <p className="text-xs text-muted-foreground font-semibold">Contacto</p>
              <p className="text-sm text-foreground">
                {offer.contact ? `${offer.contact.nombre} ${offer.contact.apellidos}` : '-'}
              </p>
            </div>

            {/* Email */}
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Email</p>
              <p className="text-sm text-foreground">{offer.contact?.email || '*'}</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Fecha */}
            <div className="border-b border-border pb-1">
              <p className="text-xs text-muted-foreground font-semibold">Fecha</p>
              <p className="text-lg font-bold text-foreground">{formattedDate}</p>
            </div>

            {/* Realiza por */}
            <div className="border-b border-border pb-1">
              <p className="text-xs text-muted-foreground font-semibold">Realiza por</p>
              <p className="text-sm text-foreground">{offer.created_by_profile?.full_name || 'MYSAIR'}</p>
            </div>

            {/* Validez Oferta */}
            <div className="border-b border-border pb-1">
              <p className="text-xs text-muted-foreground font-semibold">Validez Oferta</p>
              <p className="text-sm text-foreground">{validityDays} días</p>
            </div>

            {/* Plazo de Entrega */}
            <div className="border-b border-border pb-1">
              <p className="text-xs text-muted-foreground font-semibold">Plazo de Entrega</p>
              <p className="text-sm text-foreground">A consultar</p>
            </div>

            {/* Precio */}
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Precio</p>
              <p className="text-sm font-semibold text-foreground">NETO</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-primary/10">
                <th className="text-left py-3 px-3 text-xs font-bold text-primary border border-border">Referencia</th>
                <th className="text-left py-3 px-3 text-xs font-bold text-primary border border-border">Descripción</th>
                <th className="text-center py-3 px-3 text-xs font-bold text-primary border border-border">Cantidad</th>
                <th className="text-right py-3 px-3 text-xs font-bold text-primary border border-border">Neto</th>
                <th className="text-right py-3 px-3 text-xs font-bold text-primary border border-border">Neto Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                // Section header row — navy background, white text
                if (item.type === 'section_header') {
                  return (
                    <tr key={item.id} className="bg-[#1a2e4a]">
                      <td colSpan={5} className="py-2 px-3 text-[0.65rem] font-bold text-white">
                        {item.description || ''}
                      </td>
                    </tr>
                  )
                }

                // Note row — soft yellow background
                if (item.type === 'note') {
                  return (
                    <tr key={item.id} className="bg-yellow-100">
                      <td colSpan={5} className="py-2 px-3 text-[0.65rem] italic text-yellow-900">
                        {item.description || ''}
                      </td>
                    </tr>
                  )
                }

                // Summary row — dark navy background, white text, no quantity/neto
                if (item.type === 'summary') {
                  return (
                    <tr key={item.id} className="bg-[#1a2e4a]">
                      <td colSpan={2} className="py-2 px-3 text-[0.65rem] font-bold text-white">
                        {item.description || 'Resumen'}
                      </td>
                      <td className="py-2 px-3 text-[0.65rem] text-center text-white"></td>
                      <td className="py-2 px-3 text-[0.65rem] text-right text-white"></td>
                      <td className="py-2 px-3 text-[0.65rem] text-right font-bold text-white">
                        {Number(item.neto_total2).toFixed(2)} €
                      </td>
                    </tr>
                  )
                }

                // Article row — alternating background
                return (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/30'}>
                    <td className="py-2 px-3 text-[0.65rem] text-foreground border border-border font-medium">
                      {item.product?.referencia || '-'}
                    </td>
                    <td className="py-2 px-3 text-[0.65rem] text-foreground border border-border">
                      {item.description || item.product?.descripcion || '-'}
                    </td>
                    <td className="py-2 px-3 text-[0.65rem] text-center text-foreground border border-border">
                      {item.quantity}
                    </td>
                    <td className="py-2 px-3 text-[0.65rem] text-right text-foreground border border-border">
                      {Number(item.pvp).toFixed(2)} €
                    </td>
                    <td className="py-2 px-3 text-[0.65rem] text-right font-semibold text-foreground border border-border">
                      {Number(item.neto_total2).toFixed(2)} €
                    </td>
                  </tr>
                )
              })}
              <tr className="bg-primary/5 font-bold">
                <td colSpan={4} className="py-3 px-3 text-sm text-right text-foreground border border-border">
                  Total:
                </td>
                <td className="py-3 px-3 text-sm text-right text-foreground border border-border">
                  {totalAmount.toFixed(2)} €
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Conditions / Footer */}
        <div className="border-t-2 border-border pt-6 text-[0.65rem] text-muted-foreground space-y-2">
          <p><strong>Condiciones:</strong></p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Esta oferta es válida por {validityDays} días a partir de la fecha indicada</li>
            <li>Los precios mostrados son en €, IVA no incluido</li>
            <li>Forma de pago: Según condiciones comerciales</li>
          </ul>
        </div>

        {/* Page number - for print */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>Página 1 de 1</p>
        </div>
      </div>
    </div>
  )
}
