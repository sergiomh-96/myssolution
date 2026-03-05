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
} from '@/components/ui/dropdown-menu'

interface GeneratePdfButtonProps {
  offerId: string
  offerNumber: number
}

type Company = 'mysair' | 'agfri'
type PriceType = 'pvp' | 'neto'

const PDF_OPTIONS: Array<{ label: string; company: Company; priceType: PriceType }> = [
  { label: 'Oferta PVP (MYSAIR)', company: 'mysair', priceType: 'pvp' },
  { label: 'Oferta NETO (MYSAIR)', company: 'mysair', priceType: 'neto' },
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
      const a = document.createElement('a')
      const year = new Date().getFullYear()
      const suffix = company === 'agfri' ? '_AGFRI' : ''
      const type = priceType === 'neto' ? '_NETO' : '_PVP'
      a.href = url
      a.download = `oferta-${year}-${String(offerNumber).padStart(4, '0')}${suffix}${type}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast.success('PDF generado correctamente')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error generando el PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <Button
        variant="outline"
        disabled={loading}
        asChild
      >
        <div className="cursor-pointer">
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Generando...' : 'Generar PDF'}
        </div>
      </Button>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Selecciona formato</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PDF_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={`${option.company}-${option.priceType}`}
            onClick={() => handleGeneratePdf(option.company, option.priceType)}
            disabled={loading}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
