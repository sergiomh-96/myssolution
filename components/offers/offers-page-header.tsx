'use client'

import { Button } from '@/components/ui/button'
import { Plus, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface OffersPageHeaderProps {
  onExportClick: React.ReactNode
}

export function OffersPageHeader({ onExportClick }: OffersPageHeaderProps) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    router.refresh()
    // Give visual feedback for a moment
    setTimeout(() => setIsRefreshing(false), 500)
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Ofertas</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona propuestas comerciales y presupuestos
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
        {onExportClick}
        <Button asChild>
          <Link href="/dashboard/offers/new">
            <Plus className="w-4 h-4 mr-2" />
            Crear Oferta
          </Link>
        </Button>
      </div>
    </div>
  )
}
