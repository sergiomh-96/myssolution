'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface GeneratePdfButtonProps {
  offerId: string
  offerNumber: number
}

export function GeneratePdfButton({ offerId, offerNumber }: GeneratePdfButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleGeneratePdf = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/offers/${offerId}/pdf`)

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Error generando el PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const year = new Date().getFullYear()
      a.href = url
      a.download = `oferta-${year}-${String(offerNumber).padStart(4, '0')}.pdf`
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
    <Button
      onClick={handleGeneratePdf}
      variant="outline"
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      {loading ? 'Generando...' : 'Generar PDF'}
    </Button>
  )
}
