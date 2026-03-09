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
  const [showLog, setShowLog] = useState(false)

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
        .in('id', productIds.map(id => Number(id)))

      if (error) {
        addLog(`Error cargando productos: ${error.message}`, 'warn')
        setLog(logEntries); setLoading(false); return
      }

      addLog(`Productos cargados: ${productData?.length ?? 0}`)

      const prodMap: Record<string, { referencia: string; larguero_largo: string | null; larguero_alto: string | null }> = {}
      productData?.forEach(p => { prodMap[String(p.id)] = p })

      // Accumulate totals keyed by larguero referencia string
      const totals: Record<string, { referencia: string; tipo: 'largo' | 'alto'; unidades: number }> = {}

      for (const item of items) {
        if (!item.product_id) continue
        const prod = prodMap[String(item.product_id)]
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

      const { data: largueroProds, error: largueroError } = await supabase
        .from('products')
        .select('id, referencia, descripcion')
        .in('referencia', largueroRefs)

      if (largueroError) addLog(`Error buscando MA45: ${largueroError.message}`, 'warn')

      addLog(`Productos MA45 encontrados en BD: ${largueroProds?.length ?? 0}`)

      const result: LargueroRow[] = []
      for (const entry of totalEntries) {
        const lp = largueroProds?.find(p => p.referencia === entry.referencia)
        if (!lp) { addLog(`  "${entry.referencia}" no encontrado en productos`, 'warn'); continue }
        const multiplo12 = Math.ceil(entry.unidades / 12) * 12
        result.push({
          productId: String(lp.id),
          referencia: lp.referencia,
          descripcion: lp.descripcion || '',
          tipo: entry.tipo,
          unidadesNecesarias: entry.unidades,
          multiplo12,
          pvp: 0,
        })
        addLog(`  ${lp.referencia} (${entry.tipo}): ${entry.unidades} uds → múltiplo 12: ${multiplo12}`, 'ok')
      }

      setRows(result.sort((a, b) => a.referencia.localeCompare(b.referencia)))
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

          {/* Process log - Hidden by default */}
          {!loading && log.length > 0 && (
            <div className="space-y-2">
              <Button type="button" variant="ghost" size="sm" className="text-xs h-7"
                onClick={() => setShowLog(!showLog)}>
                {showLog ? 'Ocultar' : 'Mostrar'} información del cálculo
              </Button>
              {showLog && (
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
            </div>
          )}

          {/* Results table */}
          {!loading && rows.length > 0 && (
            <>
              <table className="w-full text-xs mt-4 border-collapse">
                <thead>
                  <tr className="bg-muted text-left">
                    <th className="px-3 py-2 font-semibold">Referencia</th>
                    <th className="px-3 py-2 font-semibold text-center">Cantidad</th>
                    <th className="px-3 py-2 font-semibold text-center">Múltiplo ×12</th>
                    <th className="px-3 py-2 font-semibold text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/40">
                      <td className="px-3 py-2 font-medium">{row.referencia}</td>
                      <td className="px-3 py-2 text-center">{row.unidadesNecesarias}</td>
                      <td className="px-3 py-2 text-center font-semibold text-primary">{row.multiplo12}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 justify-center">
                          <Button type="button" size="sm" variant="outline"
                            className="h-6 px-2.5 text-[10px]"
                            onClick={() => onAddItem(row.productId, row.unidadesNecesarias)}>
                            <Plus className="w-2.5 h-2.5 mr-0.5" />
                            Unitario
                          </Button>
                          {row.multiplo12 !== row.unidadesNecesarias && (
                            <Button type="button" size="sm" variant="default"
                              className="h-6 px-2.5 text-[10px]"
                              onClick={() => onAddItem(row.productId, row.multiplo12)}>
                              <Plus className="w-2.5 h-2.5 mr-0.5" />
                              Múltiplo
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Add all buttons */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                <Button type="button" size="sm" variant="outline" className="flex-1 h-8 text-xs"
                  onClick={() => {
                    rows.forEach(row => onAddItem(row.productId, row.unidadesNecesarias))
                  }}>
                  <Plus className="w-3 h-3 mr-1" />
                  Añadir todo Unitario
                </Button>
                <Button type="button" size="sm" variant="default" className="flex-1 h-8 text-xs"
                  onClick={() => {
                    rows.forEach(row => onAddItem(row.productId, row.multiplo12))
                  }}>
                  <Plus className="w-3 h-3 mr-1" />
                  Añadir todo Múltiplo
                </Button>
              </div>

              {/* Close button */}
              <Button type="button" size="sm" variant="ghost" className="w-full h-8 text-xs mt-2"
                onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </>
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

