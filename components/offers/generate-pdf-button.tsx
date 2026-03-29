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
  customerName?: string
  offerTitle?: string
  disabled?: boolean
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

export function GeneratePdfButton({ offerId, offerNumber, customerName = '', offerTitle = '', disabled = false }: GeneratePdfButtonProps) {
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
      
      // Construir nombre del archivo: 2026-nº oferta + cliente + título + tipo precio
      const year = new Date().getFullYear()
      const offerNum = String(offerNumber).padStart(4, '0')
      // Sanitizar nombres: mantener letras, números, espacios y guiones. Reemplazar espacios con guiones
      const client = customerName 
        ? customerName.replace(/[^\w\s\-ñáéíóúÑÁÉÍÓÚ]/g, '').trim().replace(/\s+/g, '-') 
        : 'Cliente'
      const title = offerTitle 
        ? offerTitle.replace(/[^\w\s\-ñáéíóúÑÁÉÍÓÚ]/g, '').trim().replace(/\s+/g, '-') 
        : 'Oferta'
      const type = priceType === 'neto' ? 'Neto' : priceType === 'all' ? 'Completo' : 'PVP'
      const filename = `${year}-${offerNum}-${client}-${title}-${type}.pdf`
      
      // Intentar usar la API de File System Access para mostrar el diálogo "Guardar como"
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'Archivo PDF',
              accept: { 'application/pdf': ['.pdf'] },
            }],
          })
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
          toast.success('PDF guardado correctamente')
        } catch (err: any) {
          // Si el usuario cancela (AbortError), no hacemos nada
          if (err.name !== 'AbortError') {
            console.error('Error saving file:', err)
            // Si falla el picker, intentamos el método tradicional como último recurso
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(() => URL.revokeObjectURL(url), 500)
            toast.success('PDF generado correctamente')
          }
        }
      } else {
        // Fallback para navegadores que no soportan showSaveFilePicker
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        
        // Limpiar URL después de 500ms
        setTimeout(() => URL.revokeObjectURL(url), 500)
        toast.success('PDF generado correctamente')
      }
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
          disabled={loading || disabled}
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
