'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { OfferStatus } from '@/lib/types/database'
import { cn } from '@/lib/utils'

interface CustomerValueData {
  customer_name: string
  total_amount: number
  status: OfferStatus | 'all'
}

interface CustomerValueChartProps {
  isSensitiveVisible: boolean
  offers: any[]
}

export function CustomerValueChart({ isSensitiveVisible, offers }: CustomerValueChartProps) {
  const [selectedStatus, setSelectedStatus] = useState<OfferStatus | 'all'>('all')

  const chartData = useMemo(() => {
    // Process raw offers into grouped chart data
    const data: CustomerValueData[] = offers.map(o => ({
      customer_name: (o.customer as any)?.company_name || 'Sin cliente',
      total_amount: Number(o.amount) || 0,
      status: o.status,
    }))

    // Filter by status
    const filtered = selectedStatus === 'all' 
      ? data 
      : data.filter(item => item.status === selectedStatus)

    // Group by customer and sum
    const grouped = filtered.reduce((acc, item) => {
      const existing = acc.find(i => i.name === item.customer_name)
      if (existing) {
        existing.value += item.total_amount
      } else {
        acc.push({ name: item.customer_name, value: item.total_amount })
      }
      return acc
    }, [] as { name: string; value: number }[])

    // Sort by value and take top 10
    return grouped
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [offers, selectedStatus])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card className="h-full flex flex-col border-border/50 shadow-sm transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b border-border/50">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground opacity-80">Total € por cliente (Top 10)</CardTitle>
        <Select
          value={selectedStatus}
          onValueChange={(value) => setSelectedStatus(value as OfferStatus | 'all')}
        >
          <SelectTrigger className="h-7 w-[160px] text-[10px] bg-muted/30 border-none">
            <SelectValue placeholder="Seleccionar estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todos los estados</SelectItem>
            <SelectItem value="borrador" className="text-xs">Borrador</SelectItem>
            <SelectItem value="enviada" className="text-xs">Enviada</SelectItem>
            <SelectItem value="aceptada" className="text-xs">Aceptada</SelectItem>
            <SelectItem value="rechazada" className="text-xs">Rechazada</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex-1 px-1 py-1 flex flex-col justify-center relative overflow-hidden">
        <div className={cn(
          "h-[330px] w-full mt-2 transition-all duration-500",
          !isSensitiveVisible && "blur-xl grayscale opacity-30 select-none pointer-events-none"
        )}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 15, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted/30" />
              <XAxis 
                type="number" 
                tickFormatter={(value) => `${value / 1000}k€`}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={150}
                tick={(props) => {
                  const { x, y, payload } = props
                  const label = payload.value.length > 22 ? `${payload.value.substring(0, 22)}...` : payload.value
                  return (
                    <text
                      x={x - 5}
                      y={y}
                      fill="hsl(var(--foreground))"
                      fontSize={9}
                      fontWeight={500}
                      textAnchor="end"
                      dominantBaseline="middle"
                    >
                      {label}
                    </text>
                  )
                }}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Importe Total']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.4rem',
                  fontSize: '11px',
                  padding: '3px 6px'
                }}
              />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]}
                barSize={18}
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${1 - index * 0.05})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {!isSensitiveVisible && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
            <p className="text-xs font-medium text-muted-foreground/60 italic bg-background/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50 shadow-sm">
              Gráfico oculto por privacidad
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
