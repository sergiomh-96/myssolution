'use client'

import { Button } from '@/components/ui/button'
import { Copy, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DuplicateOfferButtonProps {
  offerId: string
}

export function DuplicateOfferButton({ offerId }: DuplicateOfferButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleDuplicate = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/offers/${offerId}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate offer')
      }

      const data = await response.json()

      if (data.success) {
        // Redirect to the new offer
        router.push(`/dashboard/offers/${data.newOfferId}/edit`)
      }
    } catch (error) {
      console.error('[v0] Error duplicating offer:', error)
      alert('Error duplicando la oferta')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleDuplicate}
      disabled={isLoading}
      variant="outline"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Duplicando...
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-2" />
          Duplicar
        </>
      )}
    </Button>
  )
}
