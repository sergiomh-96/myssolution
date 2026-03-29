'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Users, FileText, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { UserRole } from '@/lib/types/database'
import { cn } from '@/lib/utils'

interface AmountBreakdown {
  borrador: number
  enviada: number
  aceptada: number
  rechazada: number
}

interface CustomersBreakdown {
  total: number
  instalador: number
  distribuidor: number
  otros: number
}

interface KPIGridProps {
  isSensitiveVisible: boolean
  customersCount?: number
  customersBreakdown: CustomersBreakdown
  offersCount: number
  offersLastMonth: {
    count: number
    amount: number
    percentageChange: number
  }
  totalOffersAmount: {
    total: number
    breakdown: AmountBreakdown
  }
  role: UserRole
}

export function KPIGrid({ 
  isSensitiveVisible,
  customersBreakdown, 
  offersCount, 
  offersLastMonth, 
  totalOffersAmount, 
  role 
}: KPIGridProps) {
  const [selectedStatus, setSelectedStatus] = useState<keyof AmountBreakdown | 'total'>('total')
  const [selectedCustomerType, setSelectedCustomerType] = useState<keyof CustomersBreakdown>('total')
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getDisplayAmount = () => {
    if (selectedStatus === 'total') return totalOffersAmount.total
    return totalOffersAmount.breakdown[selectedStatus]
  }

  const getCustomersCount = () => {
    return customersBreakdown[selectedCustomerType]
  }

  const SensitiveValue = ({ value, isCurrency = false }: { value: number | string, isCurrency?: boolean }) => {
    const display = typeof value === 'number' 
      ? (isCurrency ? formatCurrency(value) : value.toLocaleString())
      : value

    return (
      <span className={cn(
        "transition-all duration-300",
        !isSensitiveVisible && "blur-md select-none pointer-events-none opacity-40 grayscale"
      )}>
        {display}
      </span>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Clientes */}
      <Card className="border-border overflow-hidden group hover:shadow-lg transition-all duration-300">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Total Clientes
              </p>
              <p className="text-xl font-bold text-foreground leading-tight">
                <SensitiveValue value={getCustomersCount()} />
              </p>
            </div>
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 group-hover:scale-105 transition-transform">
              <Users className="w-4.5 h-4.5 text-primary" />
            </div>
          </div>
          
          <div className="mt-2.5">
            <Tabs value={selectedCustomerType} onValueChange={(v) => setSelectedCustomerType(v as any)}>
              <TabsList className="h-7 bg-muted/40 p-0.5 w-full">
                <TabsTrigger value="total" className="flex-1 text-[10px] uppercase font-medium px-1 h-6 transition-all">Todos</TabsTrigger>
                <TabsTrigger value="distribuidor" className="flex-1 text-[10px] uppercase font-medium px-1 h-6 transition-all">Distribuidor</TabsTrigger>
                <TabsTrigger value="instalador" className="flex-1 text-[10px] uppercase font-medium px-1 h-6 transition-all">Instalador</TabsTrigger>
                <TabsTrigger value="otros" className="flex-1 text-[10px] uppercase font-medium px-1 h-6 transition-all">Otros</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Total Ofertas */}
      <Card className="border-border overflow-hidden group hover:shadow-lg transition-all duration-300">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Total Ofertas
              </p>
              <p className="text-xl font-bold text-foreground leading-tight">
                <SensitiveValue value={offersCount} />
              </p>
            </div>
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/10 group-hover:scale-105 transition-transform">
              <FileText className="w-4.5 h-4.5 text-secondary" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs text-muted-foreground">
             <span className="bg-secondary/10 text-secondary px-1.5 py-0.5 rounded mr-1 font-bold">Global</span>
             <span className="font-medium opacity-80">Histórico</span>
          </div>
        </CardContent>
      </Card>

      {/* Ofertas Último Mes */}
      <Card className="border-border overflow-hidden group hover:shadow-lg transition-all duration-300">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Ofertas Mes
              </p>
              <div className="space-y-0 text-foreground">
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-bold leading-tight">
                    <SensitiveValue value={offersLastMonth.count} />
                  </p>
                  <div className={cn(
                    "flex items-center text-[10px] font-bold transition-all duration-300",
                    offersLastMonth.percentageChange >= 0 ? 'text-success' : 'text-destructive',
                    !isSensitiveVisible && "blur-sm opacity-20"
                  )}>
                    {offersLastMonth.percentageChange >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                    {Math.abs(offersLastMonth.percentageChange).toFixed(0)}%
                  </div>
                </div>
                <p className="text-xs font-bold text-accent">
                  <SensitiveValue value={offersLastMonth.amount} isCurrency />
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4.5 h-4.5 text-accent" />
            </div>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground italic font-medium opacity-80">
            Mes actual
          </p>
        </CardContent>
      </Card>

      {/* Total Ofertas € (Año en curso) */}
      <Card className="border-border overflow-hidden group hover:shadow-lg transition-all duration-300">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Total {new Date().getFullYear()}
              </p>
              <p className="text-xl font-bold text-foreground leading-tight">
                <SensitiveValue value={getDisplayAmount()} isCurrency />
              </p>
            </div>
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-success/10 group-hover:rotate-6 transition-transform">
              <Wallet className="w-4.5 h-4.5 text-success" />
            </div>
          </div>
          
          <div className="mt-2.5">
            <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
              <TabsList className="h-7 bg-muted/40 p-0.5">
                <TabsTrigger value="total" className="text-[10px] uppercase font-medium px-3 h-6 transition-all">Todas</TabsTrigger>
                <TabsTrigger value="borrador" className="text-[10px] uppercase font-medium px-3 h-6 transition-all">Borr.</TabsTrigger>
                <TabsTrigger value="enviada" className="text-[10px] uppercase font-medium px-3 h-6 transition-all">Env.</TabsTrigger>
                <TabsTrigger value="aceptada" className="text-[10px] uppercase font-medium px-3 h-6 transition-all">Acep.</TabsTrigger>
                <TabsTrigger value="rechazada" className="text-[10px] uppercase font-medium px-3 h-6 transition-all">Rech.</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
