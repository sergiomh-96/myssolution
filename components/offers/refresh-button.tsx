'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface RefreshButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function RefreshButton({ variant = 'outline', size = 'icon', className }: RefreshButtonProps) {
  const [spinning, setSpinning] = useState(false)
  const router = useRouter()

  const handleRefresh = () => {
    setSpinning(true)
    router.refresh()
    // Stop spin after 800ms
    setTimeout(() => setSpinning(false), 800)
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleRefresh}
      title="Actualizar datos de la oferta"
    >
      <RefreshCw className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} />
    </Button>
  )
}
