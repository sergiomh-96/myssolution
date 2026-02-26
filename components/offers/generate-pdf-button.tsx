'use client'

import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface GeneratePdfButtonProps {
  offerId: string
  offerNumber: string
}

export function GeneratePdfButton({ offerId, offerNumber }: GeneratePdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGeneratePdf = async () => {
    setIsLoading(true)
    try {
      // Fetch PDF from API
      const response = await fetch(`/api/offers/${offerId}/pdf`)
      
      if (!response.ok) {
        throw new Error('Error al generar el PDF')
      }

      // Get the PDF blob
      const blob = await response.blob()
      
      // Create object URL
      const url = URL.createObjectURL(blob)
      
      // Create a temporary link and trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = `Oferta-${offerNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error('[v0] Error generating PDF:', error)
      alert('Error al generar el PDF. Por favor intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleGeneratePdf} 
      disabled={isLoading}
      variant="outline"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4 mr-2" />
          Generar PDF
        </>
      )}
    </Button>
  )
}
