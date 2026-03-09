'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calculator, Plus } from 'lucide-react'

interface OfferItem {
  product_id: string
  quantity: number
}

interface LargueroRow {
  productId: string
  referencia: string       // e.g. "MA45 1000"
  descripcion: string
  tipo: 'largo' | 'alto'
  unidadesNecesarias: number
  multiplo12: number
  pvp: number
}

interface LogEntry {
  msg: string
  type: 'info' | 'warn' | 'ok'
}

interface Props {
  items: OfferItem[]
  onAddItem: (productId: string, quantity: number) => void
}

export function CalcularLarguerosDialog({ items, onAddItem }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<LargueroRow[]>([])
  const [log, setLog] = useState<LogEntry[]>([])

  const calcular = async () => {
    setLoading(true)
    const logEntries: LogEntry[] = []
    const addLog = (msg: string, type: LogEntry['type'] = 'info') => logEntries.push({ msg, type })

    try {
      const supabase = createClient()

      const productIds = items.filter(i => i.product_id).map(i => i.product_id)
      addLog(`Artículos en oferta: ${items.length} | Con producto asignado: ${productIds.length}`)

      if (productIds.length === 0) {
        addLog('No hay artículos con producto asignado.', 'warn')
        setLog(logEntries); setRows([]); setLoading(false); return
      }

      // Load products from DB — larguero_largo/larguero_alto are strings like "MA45 1000"
      const { data: productData, error } = await supabase
        .from('products')
        .select('id, referencia, larguero_largo, larguero_alto')
        .in('id', productIds)

      if (error) {
        addLog(`Error cargando productos: ${error.message}`, 'warn')
        setLog(logEntries); setLoading(false); return
      }

      addLog(`Productos cargados: ${productData?.length ?? 0}`)

      const prodMap: Record<string, { referencia: string; larguero_largo: string | null; larguero_alto: string | null }> = {}
      productData?.forEach(p => { prodMap[p.id] = p })

      // Accumulate totals keyed by larguero referencia string
      const totals: Record<string, { referencia: string; tipo: 'largo' | 'alto'; unidades: number }> = {}

      for (const item of items) {
        if (!item.product_id) continue
        const prod = prodMap[item.product_id]
        if (!prod) { addLog(`  Producto id=${item.product_id} no encontrado`, 'warn'); continue }

        const qty = item.quantity || 1
        addLog(`  ${prod.referencia} × ${qty} ud(s)`)

        if (prod.larguero_largo) {
          const key = `largo_${prod.larguero_largo}`
          if (!totals[key]) totals[key] = { referencia: prod.larguero_largo, tipo: 'largo', unidades: 0 }
          totals[key].unidades += qty * 2
          addLog(`    larguero_largo = "${prod.larguero_largo}" → +${qty * 2} uds (total: ${totals[key].unidades})`, 'ok')
        } else {
          addLog(`    Sin larguero_largo`, 'warn')
        }

        if (prod.larguero_alto) {
          const key = `alto_${prod.larguero_alto}`
          if (!totals[key]) totals[key] = { referencia: prod.larguero_alto, tipo: 'alto', unidades: 0 }
          totals[key].unidades += qty * 2
          addLog(`    larguero_alto = "${prod.larguero_alto}" → +${qty * 2} uds (total: ${totals[key].unidades})`, 'ok')
        } else {
          addLog(`    Sin larguero_alto`, 'warn')
        }
      }

      const totalEntries = Object.values(totals)
      addLog(`Tipos de larguero acumulados: ${totalEntries.length}`)

      if (totalEntries.length === 0) {
        addLog('Ningún producto tiene larguero_largo o larguero_alto definido.', 'warn')
        setLog(logEntries); setRows([]); setLoading(false); return
      }

      // Fetch the MA45 products by exact referencia string
      const largueroRefs = totalEntries.map(e => e.referencia)
      addLog(`Buscando en BD: ${largueroRefs.join(', ')}`)

      const { data: largueroProds } = await supabase
        .from('products')
        .select('id, referencia, descripcion, pvp')
        .in('referencia', largueroRefs)

      addLog(`Productos MA45 encontrados en BD: ${largueroProds?.length ?? 0}`)

      const result: LargueroRow[] = []
      for (const entry of totalEntries) {
        const lp = largueroProds?.find(p => p.referencia === entry.referencia)
        if (!lp) { addLog(`  "${entry.referencia}" no encontrado en productos`, 'warn'); continue }
        const multiplo12 = Math.ceil(entry.unidades / 12) * 12
        result.push({
          productId: lp.id,
          referencia: lp.referencia,
          descripcion: lp.descripcion || '',
          tipo: entry.tipo,
          unidadesNecesarias: entry.unidades,
          multiplo12,
          pvp: lp.pvp || 0,
        })
        addLog(`  ${lp.referencia} (${entry.tipo}): ${entry.unidades} uds → múltiplo 12: ${multiplo12}`, 'ok')
      }

      setRows(result)
    } catch (e: any) {
      addLog(`Error inesperado: ${e?.message}`, 'warn')
    } finally {
      setLog(logEntries)
      setLoading(false)
    }
  }

  const handleOpen = (val: boolean) => {
    setOpen(val)
    if (val) { setRows([]); setLog([]); calcular() }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1"
        onClick={() => handleOpen(true)}>
        <Calculator className="w-3.5 h-3.5" />
        Calcular Largueros
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cálculo de Largueros MA45</DialogTitle>
            <DialogDescription>
              2 largueros largo + 2 largueros alto por unidad de artículo.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="text-sm text-muted-foreground py-6 text-center">Calculando...</div>
          )}

          {/* Process log */}
          {!loading && log.length > 0 && (
            <div className="bg-muted rounded-md p-3 text-[11px] font-mono space-y-0.5 max-h-44 overflow-y-auto">
              {log.map((entry, i) => (
                <div key={i} className={
                  entry.type === 'ok' ? 'text-green-700 dark:text-green-400' :
                  entry.type === 'warn' ? 'text-orange-600 dark:text-orange-400' :
                  'text-muted-foreground'
                }>
                  {entry.type === 'ok' ? '✓' : entry.type === 'warn' ? '⚠' : '·'} {entry.msg}
                </div>
              ))}
            </div>
          )}

          {/* Results table */}
          {!loading && rows.length > 0 && (
            <table className="w-full text-xs mt-1 border-collapse">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="px-3 py-2 font-semibold">Referencia</th>
                  <th className="px-3 py-2 font-semibold">Tipo</th>
                  <th className="px-3 py-2 font-semibold text-center">Necesarias</th>
                  <th className="px-3 py-2 font-semibold text-center">Múltiplo ×12</th>
                  <th className="px-3 py-2 font-semibold text-center">Añadir</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/40">
                    <td className="px-3 py-2 font-medium">{row.referencia}</td>
                    <td className="px-3 py-2 text-muted-foreground capitalize">{row.tipo}</td>
                    <td className="px-3 py-2 text-center font-semibold">{row.unidadesNecesarias}</td>
                    <td className="px-3 py-2 text-center font-semibold text-primary">{row.multiplo12}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-center">
                        <Button type="button" size="sm" variant="outline"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => onAddItem(row.productId, row.unidadesNecesarias)}>
                          <Plus className="w-2.5 h-2.5 mr-0.5" />{row.unidadesNecesarias} uds
                        </Button>
                        {row.multiplo12 !== row.unidadesNecesarias && (
                          <Button type="button" size="sm" variant="default"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => onAddItem(row.productId, row.multiplo12)}>
                            <Plus className="w-2.5 h-2.5 mr-0.5" />{row.multiplo12} ×12
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && rows.length === 0 && log.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No se encontraron largueros para los artículos de esta oferta.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}


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
