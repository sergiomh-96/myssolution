'use client'

import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface GeneratePdfButtonProps {
  offerId: string
  offerNumber: string
}

export function GeneratePdfButton({ offerId, offerNumber }: GeneratePdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGeneratePdf = async () => {
    setIsGenerating(true)
    try {
      // Get the offer content from the DOM
      const contentElement = document.getElementById('offer-print-content')
      if (!contentElement) {
        console.error('Contenido de oferta no encontrado')
        return
      }

      // Import jsPDF and html2canvas dynamically
      const { default: html2canvas } = await import('html2canvas')
      const { jsPDF } = await import('jspdf')

      // Clone the element to avoid modifying the original
      const clone = contentElement.cloneNode(true) as HTMLElement
      
      // Set fixed width for consistent rendering (A4 width)
      clone.style.width = '210mm'
      clone.style.padding = '20mm'
      clone.style.margin = '0'
      clone.style.background = 'white'

      // Temporarily add to DOM for rendering
      const temp = document.createElement('div')
      temp.style.position = 'absolute'
      temp.style.left = '-10000px'
      temp.style.top = '-10000px'
      temp.style.width = '210mm'
      temp.appendChild(clone)
      document.body.appendChild(temp)

      try {
        // Render the HTML to canvas
        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794, // A4 width in pixels at 96 DPI
          windowHeight: 1123, // A4 height in pixels at 96 DPI
        })

        // Create PDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        })

        const imgData = canvas.toDataURL('image/png')
        const pdfWidth = 210
        const pdfHeight = 297
        const imgWidth = pdfWidth - 20 // 10mm margins on each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        
        let yPosition = 10

        // Add pages if needed
        let pageCount = Math.ceil(imgHeight / (pdfHeight - 20))
        let currentImgHeight = imgHeight

        for (let i = 0; i < pageCount; i++) {
          if (i > 0) {
            pdf.addPage()
            yPosition = 10
          }

          const sourceY = i * ((canvas.height / pageCount) * (pdfWidth / imgWidth))
          const sourceHeight = canvas.height / pageCount
          const croppedCanvas = document.createElement('canvas')
          croppedCanvas.width = canvas.width
          croppedCanvas.height = sourceHeight

          const ctx = croppedCanvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight)
          }

          const croppedImgData = croppedCanvas.toDataURL('image/png')
          const pageHeight = Math.min(currentImgHeight, pdfHeight - 20)
          pdf.addImage(croppedImgData, 'PNG', 10, yPosition, imgWidth, pageHeight)
          currentImgHeight -= pageHeight
        }

        // Download the PDF
        pdf.save(`Oferta-${offerNumber}.pdf`)
      } finally {
        // Clean up
        document.body.removeChild(temp)
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error al generar el PDF. Por favor intenta de nuevo.')
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
