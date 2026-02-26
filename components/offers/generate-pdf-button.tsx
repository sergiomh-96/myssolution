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
      // Fetch HTML from API
      const response = await fetch(`/api/offers/${offerId}/pdf`)
      
      if (!response.ok) {
        throw new Error('Error al generar el PDF')
      }

      // Get the HTML content
      const htmlContent = await response.text()
      
      // Create a blob from HTML
      const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' })
      
      // Create object URL
      const url = URL.createObjectURL(blob)
      
      // Open in new window with print dialog
      const printWindow = window.open(url, '_blank')
      
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          // Trigger print dialog automatically
          setTimeout(() => {
            printWindow.print()
          }, 500)
        })
      }
      
      // Clean up after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 2000)
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
