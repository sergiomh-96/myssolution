'use client'

import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'

interface GeneratePdfButtonProps {
  offerId: string
  offerNumber: number
}

export function GeneratePdfButton({ offerId, offerNumber }: GeneratePdfButtonProps) {
  const handlePrint = () => {
    // Trigger browser print dialog which can save as PDF
    window.print()
  }

  return (
    <Button 
      onClick={handlePrint} 
      variant="outline"
    >
      <FileDown className="h-4 w-4 mr-2" />
      Generar PDF
    </Button>
  )
}
