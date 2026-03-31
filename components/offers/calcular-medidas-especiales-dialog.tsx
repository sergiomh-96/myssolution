'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator, Plus, Loader2, Info, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Allowable models for special measurements
const ALLOWED_MODELS = [
  'MA16', 'MA16E', 'MA17', 'MA17E',
  'MA35', 'MA35E', 'MA35O',
  'MA48', 'MA48O'
]

// Configuration for models
const MODEL_CONFIG: Record<string, any> = {
  'MA16': { dimensions: ['ancho', 'alto'], requiresAcabado: true, requiresFijacion: true, requiresVias: false, requiresAislamiento: false, hasVariantes: true },
  'MA16E': { dimensions: ['ancho', 'alto'], requiresAcabado: true, requiresFijacion: true, requiresVias: false, requiresAislamiento: false, hasVariantes: true },
  'MA17': { dimensions: ['ancho', 'alto'], requiresAcabado: true, requiresFijacion: true, requiresVias: false, requiresAislamiento: false, hasVariantes: true },
  'MA17E': { dimensions: ['ancho', 'alto'], requiresAcabado: true, requiresFijacion: true, requiresVias: false, requiresAislamiento: false, hasVariantes: true },
  'MA35': { dimensions: ['ancho'], requiresAcabado: true, requiresFijacion: false, requiresVias: true, requiresAislamiento: false },
  'MA35E': { dimensions: ['ancho'], requiresAcabado: true, requiresFijacion: false, requiresVias: true, requiresAislamiento: false },
  'MA35O': { dimensions: ['ancho'], requiresAcabado: true, requiresFijacion: false, requiresVias: true, requiresAislamiento: false },
  'MA48': { dimensions: ['ancho'], requiresAcabado: false, requiresFijacion: false, requiresVias: true, requiresAislamiento: true },
  'MA48O': { dimensions: ['ancho'], requiresAcabado: false, requiresFijacion: false, requiresVias: true, requiresAislamiento: true },
}

interface Props {
  tarifaId: number | null
  onAddItem: (productId: string, quantity: number, customDescription?: string, customPrice?: number) => void
}

interface CalcResult {
  product: any
  precio: number
  isMain?: boolean
  pieceLen: number
}

export function CalcularMedidasEspecialesDialog({ tarifaId, onAddItem }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [modelo, setModelo] = useState<string>('')
  const [variante, setVariante] = useState<string>(' ') // Space by default for standard
  const [ancho, setAncho] = useState<string>('')
  const [alto, setAlto] = useState<string>('')
  const [vias, setVias] = useState<string>('V1')
  const [acabado, setAcabado] = useState<string>('B') // B: Blanco, A: Anodizado
  const [fijacion, setFijacion] = useState<string>('C') // C: Clip, P: Pestillo, T: Tornillo
  const [aislamiento, setAislamiento] = useState<string>('N') // S: Si, N: No
  const [incremento, setIncremento] = useState<number>(0) // 0, 5, 10
  
  // Results
  const [results, setResults] = useState<CalcResult[]>([])
  const [totalPrice, setTotalPrice] = useState<number>(0)
  const [generatedRef, setGeneratedRef] = useState<string>('')
  const [hasCalculated, setHasCalculated] = useState<boolean>(false)

  // Update default increment when model changes
  useEffect(() => {
    if (modelo) {
      if (['MA35', 'MA35O'].includes(modelo)) {
        setIncremento(5)
      } else {
        setIncremento(10)
      }
    }
  }, [modelo])

  // Auto-calculate on changes (only after first manual calculation)
  useEffect(() => {
    const config = modelo ? MODEL_CONFIG[modelo] : null
    const hasAncho = parseDimension(ancho) > 0
    const needsAlto = config?.dimensions.includes('alto')
    const hasAlto = !needsAlto || parseDimension(alto) > 0

    if (hasCalculated && modelo && hasAncho && hasAlto) {
      const timer = setTimeout(() => {
        calculate()
      }, 400)
      return () => clearTimeout(timer)
    } else if (!hasCalculated) {
      // Do nothing before first calculation
    } else {
      setResults([])
      setTotalPrice(0)
      setGeneratedRef('')
      setError(null)
    }
  }, [modelo, variante, ancho, alto, vias, acabado, fijacion, aislamiento, hasCalculated])

  const handleOpen = (val: boolean) => {
    setOpen(val)
    if (val) {
      resetForm()
    }
  }

  const resetForm = () => {
    setModelo('')
    setVariante(' ')
    setAncho('')
    setAlto('')
    setVias('V1')
    setAcabado('B')
    setFijacion('C')
    setAislamiento('N')
    setIncremento(0)
    setResults([])
    setTotalPrice(0)
    setGeneratedRef('')
    setHasCalculated(false)
    setError(null)
  }

  const parseDimension = (val: string) => {
    const num = parseInt(val, 10)
    return isNaN(num) ? 0 : num
  }

  const calculate = async () => {
    if (!tarifaId) {
      setError('No hay tarifa seleccionada para la oferta.')
      return
    }

    if (!modelo) {
      setError('Selecciona un modelo.')
      return
    }

    const config = MODEL_CONFIG[modelo]
    if (!config) return

    const nAncho = parseDimension(ancho)
    if (nAncho <= 0) {
      setError('El ancho debe ser mayor a 0.')
      return
    }

    let nAlto = 0
    if (config.dimensions.includes('alto')) {
      nAlto = parseDimension(alto)
      if (nAlto <= 0) {
        setError('El alto debe ser mayor a 0.')
        return
      }
    }

    setLoading(true)
    setError(null)
    setResults([])
    setTotalPrice(0)
    setHasCalculated(true)

    try {
      const supabase = createClient()
      const fullModel = `${modelo}${variante}`
      
      let refPattern = `${fullModel}%`
      if (config.requiresVias) {
        refPattern = `${modelo} %${vias}%`
      }
      
      const { data: baseProducts, error: dbError } = await supabase
        .from('products')
        .select('id, referencia, descripcion, largo, alto, ancho')
        .ilike('referencia', refPattern)
        .order('largo', { ascending: false })

      if (dbError) throw dbError

      if (!baseProducts || baseProducts.length === 0) {
        setError(`No se encontraron artículos en el catálogo para el modelo ${fullModel.trim()}.`)
        setLoading(false)
        return
      }

      let genRef = ''
      let piecesNeeded : number[] = []

      if (config.dimensions.includes('alto')) {
        const optionSuffix = `${fijacion}${acabado}`
        genRef = `${fullModel}${nAncho}X${nAlto}${optionSuffix}`
        
        const catalogItems = baseProducts.filter(p => {
          const ref = p.referencia.trim()
          const prefix = `${modelo}${variante}`
          
          const matchesAlto = p.alto === nAlto || ref.includes(`X${nAlto}`) || ref.includes(`x${nAlto}`)
          const matchesOptions = ref.endsWith(optionSuffix) || ref.endsWith(` ${optionSuffix}`)
          return ref.startsWith(prefix) && matchesAlto && matchesOptions
        })

        if (catalogItems.length === 0) {
          setError(`No hay artículos en catálogo con alto ${nAlto} y opciones seleccionadas para ${fullModel.trim()}.`)
          setLoading(false)
          return
        }

        const availableLengths = catalogItems.map(p => p.largo || 0).filter(l => l > 0).sort((a, b) => b - a)

        if (availableLengths.length === 0) {
           setError(`No se pudieron determinar las longitudes estándar del catálogo.`)
           setLoading(false)
           return
        }

        const maxCatalogLen = availableLengths[0]

        let remainingAncho = nAncho
        while (remainingAncho > 0) {
          if (remainingAncho >= maxCatalogLen) {
            piecesNeeded.push(maxCatalogLen)
            remainingAncho -= maxCatalogLen
          } else {
            const coveringLen = availableLengths.slice().reverse().find(l => l >= remainingAncho) || maxCatalogLen
            piecesNeeded.push(coveringLen)
            remainingAncho = 0
          }
        }

        const finalResults : CalcResult[] = []
        let total = 0

        for (const pieceLen of piecesNeeded) {
          let item = catalogItems.find(p => p.largo === pieceLen)
          if (!item) {
             item = catalogItems.slice().reverse().find(p => (p.largo || 0) >= pieceLen) || catalogItems[0]
          }

          const { data: priceData } = await supabase
            .from('precios_producto')
            .select('precio')
            .eq('id_producto', item.id)
            .eq('id_tarifa', tarifaId)
            .maybeSingle()
          
          const precio = priceData?.precio || 0
          total += precio
          finalResults.push({ product: item, precio, pieceLen })
        }

        setGeneratedRef(genRef)
        setResults(finalResults)
        setTotalPrice(total)

      } else {
        // MA35 / MA48 type logic - only Ancho
        let suffix = vias
        if (modelo.startsWith('MA35')) {
          suffix += acabado
        } else if (modelo.startsWith('MA48')) {
           if (aislamiento === 'S') suffix += ' AISLADO' 
        }

        genRef = `${modelo} ${nAncho}${suffix}`

        const catalogItems = baseProducts.filter(p => 
          p.referencia.trim().endsWith(suffix) && 
          p.referencia.startsWith(`${modelo} `)
        )

        if (catalogItems.length === 0) {
          setError(`No hay artículos en catálogo para las opciones seleccionadas.`)
          setLoading(false)
          return
        }

        const availableLengths = catalogItems.map(p => p.largo || 0).filter(l => l > 0).sort((a, b) => b - a)

        if (availableLengths.length === 0) {
           setError(`No se pudieron determinar las longitudes estándar del catálogo.`)
           setLoading(false)
           return
        }

        const maxCatalogLen = availableLengths[0]

        let remainingAncho = nAncho
        while (remainingAncho > 0) {
          if (remainingAncho >= maxCatalogLen) {
            piecesNeeded.push(maxCatalogLen)
            remainingAncho -= maxCatalogLen
          } else {
            const coveringLen = availableLengths.slice().reverse().find(l => l >= remainingAncho) || maxCatalogLen
            piecesNeeded.push(coveringLen)
            remainingAncho = 0
          }
        }

        const finalResults : CalcResult[] = []
        let total = 0

        for (const pieceLen of piecesNeeded) {
          let item = catalogItems.find(p => p.largo === pieceLen)
          if (!item) {
             item = catalogItems.slice().reverse().find(p => (p.largo || 0) >= pieceLen) || catalogItems[0]
          }

          const { data: priceData } = await supabase
            .from('precios_producto')
            .select('precio')
            .eq('id_producto', item.id)
            .eq('id_tarifa', tarifaId)
            .maybeSingle()
          
          const precio = priceData?.precio || 0
          total += precio
          finalResults.push({ product: item, precio, pieceLen })
        }

        setGeneratedRef(genRef)
        setResults(finalResults)
        setTotalPrice(total)
      }

    } catch (err: any) {
      console.error(err)
      setError(`Error inesperado: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (results.length === 0) return

    // Calculate final price with increment
    const finalPrice = totalPrice * (1 + incremento / 100)
    
    // We use the first product ID to keep category/discount properties, 
    // but override the description and price
    const mainProductId = results[0].product.id
    onAddItem(mainProductId.toString(), 1, generatedRef, finalPrice)
    
    setOpen(false)
  }

  const currentConfig = modelo ? MODEL_CONFIG[modelo] : null
  const totalWithIncrement = totalPrice * (1 + incremento / 100)

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-all font-medium"
        onClick={() => handleOpen(true)}>
        <Calculator className="w-3.5 h-3.5 mr-1.5" />
        Medidas Especiales
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[1240px] border-none shadow-2xl bg-white/95 backdrop-blur-xl dark:bg-slate-900/95 overflow-visible">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          <DialogHeader className="pt-2">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-500" />
              Calculador de Referencias Especiales
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Desglose automático de medidas fuera de catálogo en tramos comerciales.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 overflow-visible">
            <div className="flex flex-wrap lg:flex-nowrap gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800 items-end">
              
              <div className="flex-1 space-y-1.5">
                <Label className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">Modelo</Label>
                <Select value={modelo} onValueChange={val => { setModelo(val); setVariante(' '); }}>
                  <SelectTrigger className="bg-background h-11 !h-11 w-full text-sm">
                    <SelectValue placeholder="Modelo" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {ALLOWED_MODELS.map(m => (
                      <SelectItem key={m} value={m} className="font-medium">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={cn("flex-1 space-y-1.5 transition-all duration-300", 
                !currentConfig?.hasVariantes ? "opacity-30 pointer-events-none grayscale" : "opacity-100")}>
                <Label className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">Variante</Label>
                <Select value={variante} onValueChange={setVariante} disabled={!currentConfig?.hasVariantes}>
                  <SelectTrigger className="bg-background h-11 !h-11 w-full text-sm">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">Estándar</SelectItem>
                    <SelectItem value="X">Tornillo (X)</SelectItem>
                    <SelectItem value="Q">Palanca (Q)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-1.5">
                <Label className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">Ancho (Largo)</Label>
                <Input 
                  type="number" 
                  placeholder="mm" 
                  disabled={!currentConfig}
                  value={ancho} 
                  className="bg-background h-11 !h-11 w-full font-mono text-sm text-center"
                  onChange={e => setAncho(e.target.value)} 
                />
              </div>

              <div className="flex-1 space-y-1.5">
                <Label className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  {currentConfig?.requiresVias ? 'Nº Vías' : 'Alto (mm)'}
                </Label>
                
                {currentConfig?.requiresVias ? (
                  <Select value={vias} onValueChange={setVias}>
                    <SelectTrigger className="bg-background h-11 !h-11 w-full text-sm text-center">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="V1">1 Vía (V1)</SelectItem>
                      <SelectItem value="V2">2 Vías (V2)</SelectItem>
                      <SelectItem value="V3">3 Vías (V3)</SelectItem>
                      <SelectItem value="V4">4 Vías (V4)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select 
                    value={alto} 
                    onValueChange={setAlto} 
                    disabled={!currentConfig?.dimensions.includes('alto')}
                  >
                    <SelectTrigger className="bg-background h-11 !h-11 w-full text-sm text-center">
                      <SelectValue placeholder="Alto" />
                    </SelectTrigger>
                    <SelectContent>
                      {[50, 75, 100, 150, 200, 250, 300, 350].map(h => (
                        <SelectItem key={h} value={h.toString()}>{h} mm</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className={cn("flex-1 space-y-1.5 transition-all duration-300", 
                 !currentConfig?.requiresFijacion ? "opacity-30 pointer-events-none grayscale" : "opacity-100")}>
                <Label className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">Fijación</Label>
                <Select 
                  value={fijacion} 
                  onValueChange={setFijacion}
                  disabled={!currentConfig?.requiresFijacion}
                >
                  <SelectTrigger className="bg-background h-11 !h-11 w-full text-sm text-center">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C">Clip (C)</SelectItem>
                    <SelectItem value="P">Pestillo (P)</SelectItem>
                    <SelectItem value="T">Tornillo (T)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={cn("flex-1 space-y-1.5 transition-all duration-300", 
                 !currentConfig?.requiresAcabado && !currentConfig?.requiresAislamiento ? "opacity-30 pointer-events-none grayscale" : "opacity-100")}>
                <Label className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  {currentConfig?.requiresAislamiento ? 'Aislamiento' : 'Acabado'}
                </Label>
                
                {currentConfig?.requiresAislamiento ? (
                  <Select value={aislamiento} onValueChange={setAislamiento}>
                    <SelectTrigger className="bg-background h-11 !h-11 w-full text-sm text-center">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S">SÍ</SelectItem>
                      <SelectItem value="N">NO</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select 
                    value={acabado} 
                    onValueChange={setAcabado}
                    disabled={!currentConfig?.requiresAcabado}
                  >
                    <SelectTrigger className="bg-background h-11 !h-11 w-full text-sm text-center">
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B">Blanco (B)</SelectItem>
                      <SelectItem value="A">Anodizado (A)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="w-[120px] flex-shrink-0">
                <Button 
                  onClick={calculate} 
                  disabled={loading || !modelo || !ancho}
                  className="h-11 !h-11 w-full bg-slate-900 border-none hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-lg font-bold text-xs tracking-widest"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CALCULAR'}
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-4 text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-900 flex gap-2 items-center">
                <Info className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {results.length > 0 && (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-4 px-1">
                   <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                     <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                     REFERENCIA GENERADA: <span className="text-blue-600 dark:text-blue-400 font-mono text-lg ml-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-800 tracking-tight">{generatedRef}</span>
                   </h4>
                   <div className="text-right text-[10px] text-slate-400 uppercase font-semibold">Tramos comerciales de tarifa</div>
                </div>
                
                {(() => {
                  const groupedResults = results.reduce((acc: any[], current) => {
                    const existing = acc.find(a => a.product.id === current.product.id)
                    if (existing) {
                      existing.quantity += 1
                      existing.totalPrecio += current.precio
                    } else {
                      acc.push({ ...current, quantity: 1, totalPrecio: current.precio })
                    }
                    return acc
                  }, [])

                  return (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100/70 dark:bg-slate-800/70">
                          <tr>
                            <th className="text-left px-3 py-1.5 font-bold text-slate-600 dark:text-slate-400 text-[9px] uppercase tracking-widest">Desglose de Componentes</th>
                            <th className="text-center px-2 py-1.5 font-bold text-slate-600 dark:text-slate-400 text-[9px] uppercase tracking-widest">Cant.</th>
                            <th className="text-right px-3 py-1.5 font-bold text-slate-600 dark:text-slate-400 text-[9px] uppercase tracking-widest">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {groupedResults.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-3 py-1.5 font-medium">
                                <div className="flex flex-col gap-0">
                                  <span className="text-slate-900 dark:text-slate-100 text-xs">{r.product.referencia}</span>
                                  <span className="text-[9px] text-slate-500 font-normal leading-tight">{r.product.descripcion}</span>
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-center font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                                {r.quantity}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                                {r.totalPrecio.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 dark:bg-slate-800/50">
                            <td colSpan={2} className="px-3 py-1.5 text-slate-600 dark:text-slate-400 font-bold uppercase text-[9px] tracking-widest text-left border-t border-slate-200 dark:border-slate-700">SUBTOTAL PIEZAS CATÁLOGO</td>
                            <td className="px-3 py-1.5 text-right text-slate-800 dark:text-slate-200 text-base font-mono font-bold border-t border-slate-200 dark:border-slate-700">
                              {totalPrice.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                            </td>
                          </tr>
                          <tr className="bg-blue-50/80 dark:bg-blue-900/20">
                            <td colSpan={2} className="px-3 py-1.5 text-blue-900 dark:text-blue-300 font-black uppercase text-[10px] tracking-widest text-left">
                              <div className="flex items-center gap-4">
                                <span>PRECIO FINAL ESPECIAL</span>
                                <Select value={incremento.toString()} onValueChange={(v) => setIncremento(parseInt(v))}>
                                  <SelectTrigger className="h-7 w-28 bg-white/80 dark:bg-slate-800/80 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 font-bold text-[10px] !h-7">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0" className="text-[10px]">0%</SelectItem>
                                    <SelectItem value="5" className="text-[10px]">+5%</SelectItem>
                                    <SelectItem value="10" className="text-[10px]">+10%</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-right text-blue-900 dark:text-blue-300 text-lg font-mono font-black">
                              {totalWithIncrement.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-6 flex flex-row items-center justify-end gap-3 pb-2">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="hover:bg-slate-100 dark:hover:bg-slate-800 font-medium px-3 h-8 text-[10px]">
                Cerrar
              </Button>
              <Button 
                onClick={handleApply} 
                disabled={results.length === 0}
                className="px-4 h-8 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-200/50 dark:shadow-none font-semibold uppercase tracking-wider text-[10px]"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                Insertar en la Oferta
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
