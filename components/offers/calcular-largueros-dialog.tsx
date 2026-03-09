'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calculator, Plus } from 'lucide-react'

interface OfferItem {
  product_id: string
  quantity: number
  product?: {
    referencia: string
    descripcion: string
    larguero_largo: number | null
    larguero_alto: number | null
  }
}

interface LargueroRow {
  largueroProduct: {
    id: string
    referencia: string
    descripcion: string
    pvp: number | null
  }
  mmSize: number
  tipo: 'largo' | 'alto'
  unidadesNecesarias: number
  multiplo12: number
}

interface CalcularLarguerosDialogProps {
  items: OfferItem[]
  onAddItem: (productId: string, quantity: number) => void
}

export function CalcularLarguerosDialog({ items, onAddItem }: CalcularLarguerosDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<LargueroRow[]>([])

  const calcular = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // 1. Collect all product_ids from offer items (only articles with products)
      const productIds = items
        .filter(i => i.product_id && i.product?.larguero_largo != null || i.product?.larguero_alto != null)
        .map(i => i.product_id)

      if (productIds.length === 0) {
        // Load products fresh from DB
        const itemProductIds = items.filter(i => i.product_id).map(i => i.product_id)
        if (itemProductIds.length === 0) { setRows([]); setLoading(false); return }

        const { data: prods } = await supabase
          .from('products')
          .select('id, referencia, descripcion, larguero_largo, larguero_alto')
          .in('id', itemProductIds)

        const prodMap: Record<string, { larguero_largo: number | null, larguero_alto: number | null, referencia: string }> = {}
        for (const p of prods || []) prodMap[p.id] = p

        // Recalculate totals by mm
        const totalsByMm: Record<number, { tipo: 'largo' | 'alto', unidades: number }> = {}
        for (const item of items) {
          if (!item.product_id) continue
          const prod = prodMap[item.product_id]
          if (!prod) continue
          const qty = item.quantity || 1
          if (prod.larguero_largo) {
            const mm = prod.larguero_largo
            if (!totalsByMm[mm]) totalsByMm[mm] = { tipo: 'largo', unidades: 0 }
            totalsByMm[mm].unidades += qty * 2
          }
          if (prod.larguero_alto) {
            const mm = prod.larguero_alto
            // Use a combined key for largo vs alto
            const key = mm + 0.001 // distinguish alto from largo at same mm
            if (!totalsByMm[key]) totalsByMm[key] = { tipo: 'alto', unidades: 0 }
            totalsByMm[key].unidades += qty * 2
          }
        }

        await buildRows(supabase, totalsByMm)
      } else {
        // Recalculate using existing product data in items
        const totalsByKey: Record<string, { mm: number, tipo: 'largo' | 'alto', unidades: number }> = {}
        for (const item of items) {
          if (!item.product_id || !item.product) continue
          const qty = item.quantity || 1
          if (item.product.larguero_largo) {
            const key = `largo_${item.product.larguero_largo}`
            if (!totalsByKey[key]) totalsByKey[key] = { mm: item.product.larguero_largo, tipo: 'largo', unidades: 0 }
            totalsByKey[key].unidades += qty * 2
          }
          if (item.product.larguero_alto) {
            const key = `alto_${item.product.larguero_alto}`
            if (!totalsByKey[key]) totalsByKey[key] = { mm: item.product.larguero_alto, tipo: 'alto', unidades: 0 }
            totalsByKey[key].unidades += qty * 2
          }
        }
        await buildRowsFromKeys(supabase, totalsByKey)
      }
    } catch (e) {
      console.error('Error calculando largueros:', e)
    } finally {
      setLoading(false)
    }
  }

  const buildRows = async (supabase: ReturnType<typeof createClient>, totalsByMm: Record<number, { tipo: 'largo' | 'alto', unidades: number }>) => {
    const mmValues = Object.keys(totalsByMm).map(Number)
    if (mmValues.length === 0) { setRows([]); return }

    const { data: largueroProds } = await supabase
      .from('products')
      .select('id, referencia, descripcion, pvp')
      .ilike('referencia', 'MA45%')

    const result: LargueroRow[] = []
    for (const mmKey of mmValues) {
      const { tipo, unidades } = totalsByMm[mmKey]
      const mm = Math.round(mmKey)
      const ma45Ref = `MA45 ${mm}`
      const lp = largueroProds?.find(p => p.referencia.trim().toUpperCase() === ma45Ref.toUpperCase())
      if (!lp) continue
      const multiplo12 = Math.ceil(unidades / 12) * 12
      result.push({ largueroProduct: lp, mmSize: mm, tipo, unidadesNecesarias: unidades, multiplo12 })
    }
    setRows(result)
  }

  const buildRowsFromKeys = async (supabase: ReturnType<typeof createClient>, totalsByKey: Record<string, { mm: number, tipo: 'largo' | 'alto', unidades: number }>) => {
    const entries = Object.values(totalsByKey)
    if (entries.length === 0) { setRows([]); return }

    const { data: largueroProds } = await supabase
      .from('products')
      .select('id, referencia, descripcion, pvp')
      .ilike('referencia', 'MA45%')

    const result: LargueroRow[] = []
    for (const { mm, tipo, unidades } of entries) {
      const ma45Ref = `MA45 ${mm}`
      const lp = largueroProds?.find(p => p.referencia.trim().toUpperCase() === ma45Ref.toUpperCase())
      if (!lp) continue
      const multiplo12 = Math.ceil(unidades / 12) * 12
      result.push({ largueroProduct: lp, mmSize: mm, tipo, unidadesNecesarias: unidades, multiplo12 })
    }
    setRows(result)
  }

  const handleOpen = () => {
    setOpen(true)
    calcular()
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="h-7 text-xs"
      >
        <Calculator className="w-3 h-3 mr-1" />
        Calcular Largueros
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cálculo de Largueros MA45</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              Calculando largueros...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              No se encontraron largueros asociados a los artículos de esta oferta.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted text-muted-foreground text-xs font-semibold">
                    <th className="px-3 py-2 text-left">Referencia</th>
                    <th className="px-3 py-2 text-left">Descripción</th>
                    <th className="px-3 py-2 text-center">Tipo</th>
                    <th className="px-3 py-2 text-center">Uds. necesarias</th>
                    <th className="px-3 py-2 text-center">Múltiplo 12</th>
                    <th className="px-3 py-2 text-center">Añadir</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="px-3 py-2 font-medium text-xs">{row.largueroProduct.referencia}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{row.largueroProduct.descripcion}</td>
                      <td className="px-3 py-2 text-center text-xs capitalize">{row.tipo}</td>
                      <td className="px-3 py-2 text-center text-xs font-semibold">{row.unidadesNecesarias}</td>
                      <td className="px-3 py-2 text-center text-xs font-semibold text-primary">{row.multiplo12}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2"
                            onClick={() => {
                              onAddItem(row.largueroProduct.id, row.unidadesNecesarias)
                              setOpen(false)
                            }}
                          >
                            <Plus className="w-2.5 h-2.5 mr-0.5" />
                            {row.unidadesNecesarias} uds
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            className="h-6 text-[10px] px-2"
                            onClick={() => {
                              onAddItem(row.largueroProduct.id, row.multiplo12)
                              setOpen(false)
                            }}
                          >
                            <Plus className="w-2.5 h-2.5 mr-0.5" />
                            {row.multiplo12} uds
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
