'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface GeneratePdfButtonProps {
  offerId: string
  offerNumber: number
}

type Company = 'mysair' | 'agfri'
type PriceType = 'pvp' | 'neto' | 'all'

const PDF_OPTIONS: Array<{ label: string; company: Company; priceType: PriceType }> = [
  { label: 'Oferta PVP (MYSAIR)', company: 'mysair', priceType: 'pvp' },
  { label: 'Oferta NETO (MYSAIR)', company: 'mysair', priceType: 'neto' },
  { label: 'Oferta PVP+DESCUENTO+NETO (MYSAIR)', company: 'mysair', priceType: 'all' },
  { label: 'Oferta PVP (AGFRI)', company: 'agfri', priceType: 'pvp' },
  { label: 'Oferta NETO (AGFRI)', company: 'agfri', priceType: 'neto' },
]

export function GeneratePdfButton({ offerId, offerNumber }: GeneratePdfButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleGeneratePdf = async (company: Company, priceType: PriceType) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/offers/${offerId}/pdf?company=${company}&priceType=${priceType}`)

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Error generando el PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      // Crear enlace pero sin descarga automática para mostrar diálogo de guardado
      const year = new Date().getFullYear()
      const suffix = company === 'agfri' ? '_AGFRI' : ''
      const type = priceType === 'neto' ? '_NETO' : priceType === 'all' ? '_COMPLETO' : '_PVP'
      const filename = `oferta-${year}-${String(offerNumber).padStart(4, '0')}${suffix}${type}.pdf`
      
      // Abrir en nueva pestaña para que el navegador muestre diálogo "Guardar como"
      const link = window.open(url, '_blank')
      
      // Si no se puede abrir en nueva pestaña, descargar directamente
      if (!link) {
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
      
      // Limpiar URL después de 30 segundos
      setTimeout(() => URL.revokeObjectURL(url), 30000)

      toast.success('PDF generado correctamente')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error generando el PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={loading}
          className="h-8 text-xs"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
          ) : (
            <FileDown className="h-3 w-3 mr-2" />
          )}
          {loading ? 'Generando...' : 'Generar PDF'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Selecciona formato</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PDF_OPTIONS.map((option) => {
          const color = option.company === 'mysair' ? '#2980b9' : '#dc1414'
          return (
            <DropdownMenuItem
              key={`${option.company}-${option.priceType}`}
              onClick={() => handleGeneratePdf(option.company, option.priceType)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <div 
                className="w-2.5 h-2.5 flex-shrink-0 rounded-sm" 
                style={{ backgroundColor: color }}
              />
              {option.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
