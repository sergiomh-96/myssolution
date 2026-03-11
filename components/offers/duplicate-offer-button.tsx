'use client'

import { Button } from '@/components/ui/button'
import { Copy, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DuplicateOfferButtonProps {
  offerId: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
  disabled?: boolean
}

export function DuplicateOfferButton({ offerId, variant = 'outline', size = 'default', showLabel = true, disabled = false }: DuplicateOfferButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    setShowConfirm(false)
    setIsLoading(true)
    try {
      const response = await fetch(`/api/offers/duplicate?id=${offerId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate offer')
      }

      const data = await response.json()

      if (data.success) {
        router.push(`/dashboard/offers/${data.newOfferId}/edit`)
      }
    } catch (error) {
      alert('Error duplicando la oferta')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isLoading || disabled}
        variant={variant}
        size={size}
        title={disabled ? 'Guarda la oferta primero para poder duplicarla' : 'Duplicar oferta'}
        className="h-8 text-xs"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {showLabel && <span className="ml-2">Duplicando...</span>}
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            {showLabel && <span className="ml-2">Duplicar</span>}
          </>
        )}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicar oferta</AlertDialogTitle>
            <AlertDialogDescription>
              Se creará una copia exacta de esta oferta con un nuevo número. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Duplicar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
