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
      // Get the printable element
      const element = document.getElementById('offer-print-content')
      if (!element) {
        console.error('Elemento de impresión no encontrado')
        return
      }

      // Import html2pdf dynamically
      const html2pdf = (await import('html2pdf.js')).default

      // Configure PDF options for A4 format
      const opt = {
        margin: 10, // mm
        filename: `Oferta-${offerNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      }

      // Generate and download PDF
      html2pdf().set(opt).from(element).save()
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
