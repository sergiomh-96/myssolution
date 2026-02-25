'use client'

import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface GeneratePdfButtonProps {
  offerId: string
  offerNumber: number
}

export function GeneratePdfButton({ offerId, offerNumber }: GeneratePdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePdf = async () => {
    setIsGenerating(true)
    try {
      // Open the print dialog with the PDF content
      const response = await fetch(`/api/offers/${offerId}/pdf`)
      if (!response.ok) {
        console.error('Error generando PDF')
        return
      }

      const html = await response.text()
      
      // Create a new window/tab with the HTML content
      const newWindow = window.open('', '_blank')
      if (!newWindow) {
        console.error('No se pudo abrir ventana')
        return
      }

      newWindow.document.write(html)
      newWindow.document.close()

      // Trigger print dialog
      setTimeout(() => {
        newWindow.print()
      }, 250)
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button 
      onClick={handleGeneratePdf} 
      disabled={isGenerating}
      variant="outline"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generando PDF...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 mr-2" />
          Generar PDF
        </>
      )}
    </Button>
  )
}
