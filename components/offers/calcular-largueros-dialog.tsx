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

      // 1. Get product_ids from items
      const itemProductIds = items.filter(i => i.product_id).map(i => i.product_id)
      if (itemProductIds.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      // 2. Load all products from DB with larguero fields
      const { data: productData } = await supabase
        .from('products')
        .select('id, referencia, descripcion, larguero_largo, larguero_alto')
        .in('id', itemProductIds)

      const prodMap: Record<string, any> = {}
      productData?.forEach(p => { prodMap[p.id] = p })

      // 3. Calculate totals by mm and tipo
      const totalsByKey: Record<string, { mm: number; tipo: 'largo' | 'alto'; unidades: number }> = {}

      for (const item of items) {
        if (!item.product_id) continue
        const prod = prodMap[item.product_id]
        if (!prod) continue

        const qty = item.quantity || 1

        // Each unit uses 2x larguero_largo and 2x larguero_alto
        if (prod.larguero_largo && prod.larguero_largo > 0) {
          const key = `largo_${prod.larguero_largo}`
          if (!totalsByKey[key]) {
            totalsByKey[key] = { mm: prod.larguero_largo, tipo: 'largo', unidades: 0 }
          }
          totalsByKey[key].unidades += qty * 2
          console.log(`[v0] Added ${qty * 2} uds of MA45 ${prod.larguero_largo} (largo)`)
        }

        if (prod.larguero_alto && prod.larguero_alto > 0) {
          const key = `alto_${prod.larguero_alto}`
          if (!totalsByKey[key]) {
            totalsByKey[key] = { mm: prod.larguero_alto, tipo: 'alto', unidades: 0 }
          }
          totalsByKey[key].unidades += qty * 2
          console.log(`[v0] Added ${qty * 2} uds of MA45 ${prod.larguero_alto} (alto)`)
        }
      }

      if (Object.keys(totalsByKey).length === 0) {
        console.log('[v0] No largueros found - no products have larguero fields')
        setRows([])
        setLoading(false)
        return
      }

      // 4. Find MA45 products for each mm
      const mmSizes = Object.values(totalsByKey).map(v => v.mm)
      const { data: largueroProds } = await supabase
        .from('products')
        .select('id, referencia, descripcion, pvp')
        .ilike('referencia', 'MA45%')

      console.log(`[v0] Found ${largueroProds?.length || 0} MA45 products`)

      const result: LargueroRow[] = []
      for (const entry of Object.values(totalsByKey)) {
        const { mm, tipo, unidades } = entry
        const ma45Ref = `MA45 ${mm}`
        const largueroProduct = largueroProds?.find(
          p => p.referencia.trim().toUpperCase() === ma45Ref.toUpperCase()
        )

        if (!largueroProduct) {
          console.log(`[v0] MA45 ${mm} not found in products`)
          continue
        }

        const multiplo12 = Math.ceil(unidades / 12) * 12
        result.push({
          largueroProduct,
          mmSize: mm,
          tipo,
          unidadesNecesarias: unidades,
          multiplo12,
        })
      }

      console.log(`[v0] Final rows count: ${result.length}`)
      setRows(result)
    } catch (e) {
      console.error('[v0] Error calculando largueros:', e)
    } finally {
      setLoading(false)
    }
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
