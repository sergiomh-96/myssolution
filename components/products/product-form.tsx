'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle } from 'lucide-react'

const FAMILIAS = ['Cortinas', 'Persianas', 'Paneles', 'Ventilación', 'Climatización', 'Control', 'Accesorios']
const SUBFAMILIAS: Record<string, string[]> = {
  'Cortinas': ['Motorizadas', 'Manuales'],
  'Persianas': ['Enrollables', 'Láminas'],
  'Paneles': ['Solares', 'Térmicos'],
  'Ventilación': ['Industriales', 'Residenciales'],
  'Climatización': ['Humidificadores', 'Deshumidificadores'],
  'Control': ['Inteligentes', 'Manuales'],
  'Accesorios': ['Marcos', 'Difusores'],
}

interface ProductFormProps {
  productId?: number
}

interface TarifaPrice {
  id_tarifa: number
  nombre: string
  precio: number | null
}

export function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const isEditMode = !!productId
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFamilia, setSelectedFamilia] = useState('')
  const [tarifas, setTarifas] = useState<TarifaPrice[]>([])
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    referencia: '',
    descripcion: '',
    texto_prescripcion: '',
    largo: '',
    alto: '',
    ancho: '',
    volumen: '',
    larguero_largo: '',
    larguero_alto: '',
    familia: '',
    subfamilia: '',
    motorizada: false,
    modelo_nombre: '',
    tipo_deflexion: '',
    fijacion: '',
    acabado: '',
    compuerta: '',
    regulacion_compuerta: '',
    ficha_tecnica: '',
    area_efectiva: '',
    art_personalizado: false,
    brand_id: '',
    status: 'active',
  })

  // Load product data if editing
  useEffect(() => {
    if (!isEditMode) return

    const loadProduct = async () => {
      try {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single()

        if (productError) throw productError

        setFormData({
          referencia: product.referencia || '',
          descripcion: product.descripcion || '',
          texto_prescripcion: product.texto_prescripcion || '',
          largo: product.largo || '',
          alto: product.alto || '',
          ancho: product.ancho || '',
          volumen: product.volumen || '',
          larguero_largo: product.larguero_largo || '',
          larguero_alto: product.larguero_alto || '',
          familia: product.familia || '',
          subfamilia: product.subfamilia || '',
          motorizada: product.motorizada || false,
          modelo_nombre: product.modelo_nombre || '',
          tipo_deflexion: product.tipo_deflexion || '',
          fijacion: product.fijacion || '',
          acabado: product.acabado || '',
          compuerta: product.compuerta || '',
          regulacion_compuerta: product.regulacion_compuerta || '',
          ficha_tecnica: product.ficha_tecnica || '',
          area_efectiva: product.area_efectiva || '',
          art_personalizado: product.art_personalizado || false,
          brand_id: product.brand_id || '',
          status: product.status || 'active',
        })
        setSelectedFamilia(product.familia || '')

        // Load tarifas with prices for this product
        const { data: tarifasData, error: tarifasError } = await supabase
          .from('tarifas')
          .select('id_tarifa, nombre')
          .order('nombre')

        if (tarifasError) throw tarifasError

        // Get existing precios for this product
        const { data: preciosData } = await supabase
          .from('precios_producto')
          .select('id_tarifa, precio')
          .eq('id_producto', productId)

        const preciosMap = new Map((preciosData || []).map(p => [p.id_tarifa, p.precio]))

        setTarifas((tarifasData || []).map(t => ({
          id_tarifa: t.id_tarifa,
          nombre: t.nombre,
          precio: preciosMap.get(t.id_tarifa) || null,
        })))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando el producto')
      }
    }

    loadProduct()
  }, [productId, isEditMode, supabase])

  // Load tarifas for new product
  useEffect(() => {
    if (isEditMode) return

    const loadTarifas = async () => {
      try {
        const { data, error: err } = await supabase
          .from('tarifas')
          .select('id_tarifa, nombre')
          .order('nombre')

        if (err) throw err
        setTarifas((data || []).map(t => ({
          id_tarifa: t.id_tarifa,
          nombre: t.nombre,
          precio: null,
        })))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando tarifas')
      }
    }

    loadTarifas()
  }, [isEditMode, supabase])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTarifaPriceChange = (tarifaId: number, precio: string) => {
    setTarifas(prev => prev.map(t =>
      t.id_tarifa === tarifaId ? { ...t, precio: precio ? parseFloat(precio) : null } : t
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (isEditMode) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update(formData)
          .eq('id', productId)

        if (updateError) throw updateError

        // Update precios
        for (const tarifa of tarifas) {
          if (tarifa.precio !== null) {
            const { data: existing } = await supabase
              .from('precios_producto')
              .select('id_precio')
              .eq('id_producto', productId)
              .eq('id_tarifa', tarifa.id_tarifa)
              .maybeSingle()

            if (existing) {
              await supabase
                .from('precios_producto')
                .update({ precio: tarifa.precio })
                .eq('id_precio', existing.id_precio)
            } else {
              await supabase
                .from('precios_producto')
                .insert({
                  id_producto: productId,
                  id_tarifa: tarifa.id_tarifa,
                  precio: tarifa.precio,
                })
            }
          } else if (tarifa.precio === null) {
            // Delete if price is cleared
            await supabase
              .from('precios_producto')
              .delete()
              .eq('id_producto', productId)
              .eq('id_tarifa', tarifa.id_tarifa)
          }
        }
      } else {
        // Create new product
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([formData])
          .select('id')
          .single()

        if (insertError) throw insertError

        // Insert precios if any
        const preciosToInsert = tarifas
          .filter(t => t.precio !== null)
          .map(t => ({
            id_producto: newProduct.id,
            id_tarifa: t.id_tarifa,
            precio: t.precio,
          }))

        if (preciosToInsert.length > 0) {
          const { error: preciosError } = await supabase
            .from('precios_producto')
            .insert(preciosToInsert)

          if (preciosError) throw preciosError
        }
      }

      router.push('/dashboard/products')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el producto')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive rounded-lg p-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Información General</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Marca</Label>
            <Select value={formData.brand_id} onValueChange={(value) => handleChange('brand_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">AGFRI</SelectItem>
                <SelectItem value="2">MYSAIR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Referencia</Label>
            <Input value={formData.referencia} onChange={(e) => handleChange('referencia', e.target.value)} required />
          </div>
        </div>

        <div>
          <Label>Nombre del Modelo</Label>
          <Input value={formData.modelo_nombre} onChange={(e) => handleChange('modelo_nombre', e.target.value)} />
        </div>

        <div>
          <Label>Descripción</Label>
          <Textarea value={formData.descripcion} onChange={(e) => handleChange('descripcion', e.target.value)} />
        </div>

        <div>
          <Label>Texto de Prescripción</Label>
          <Textarea value={formData.texto_prescripcion} onChange={(e) => handleChange('texto_prescripcion', e.target.value)} />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Precios por Tarifa</h2>
        <div className="space-y-3">
          {tarifas.length === 0 ? (
            <p className="text-muted-foreground text-sm">Cargando tarifas...</p>
          ) : (
            tarifas.map(tarifa => (
              <div key={tarifa.id_tarifa} className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-sm">{tarifa.nombre}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={tarifa.precio !== null ? tarifa.precio : ''}
                    onChange={(e) => handleTarifaPriceChange(tarifa.id_tarifa, e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Dimensiones</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Largo</Label>
            <Input type="number" value={formData.largo} onChange={(e) => handleChange('largo', e.target.value)} />
          </div>
          <div>
            <Label>Alto</Label>
            <Input type="number" value={formData.alto} onChange={(e) => handleChange('alto', e.target.value)} />
          </div>
          <div>
            <Label>Ancho</Label>
            <Input type="number" value={formData.ancho} onChange={(e) => handleChange('ancho', e.target.value)} />
          </div>
          <div>
            <Label>Volumen</Label>
            <Input type="number" value={formData.volumen} onChange={(e) => handleChange('volumen', e.target.value)} />
          </div>
          <div>
            <Label>Larguero Largo</Label>
            <Input type="number" value={formData.larguero_largo} onChange={(e) => handleChange('larguero_largo', e.target.value)} />
          </div>
          <div>
            <Label>Larguero Alto</Label>
            <Input type="number" value={formData.larguero_alto} onChange={(e) => handleChange('larguero_alto', e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Clasificación</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Familia</Label>
            <Select value={formData.familia} onValueChange={(value) => {
              handleChange('familia', value)
              setSelectedFamilia(value)
              handleChange('subfamilia', '')
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FAMILIAS.map(familia => (
                  <SelectItem key={familia} value={familia}>{familia}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subfamilia</Label>
            <Select value={formData.subfamilia} onValueChange={(value) => handleChange('subfamilia', value)} disabled={!selectedFamilia}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBFAMILIAS[selectedFamilia]?.map(subfamilia => (
                  <SelectItem key={subfamilia} value={subfamilia}>{subfamilia}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Especificaciones Técnicas</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tipo de Deflexión</Label>
            <Input value={formData.tipo_deflexion} onChange={(e) => handleChange('tipo_deflexion', e.target.value)} />
          </div>
          <div>
            <Label>Fijación</Label>
            <Input value={formData.fijacion} onChange={(e) => handleChange('fijacion', e.target.value)} />
          </div>
          <div>
            <Label>Acabado</Label>
            <Input value={formData.acabado} onChange={(e) => handleChange('acabado', e.target.value)} />
          </div>
          <div>
            <Label>Compuerta</Label>
            <Input value={formData.compuerta} onChange={(e) => handleChange('compuerta', e.target.value)} />
          </div>
          <div>
            <Label>Regulación de Compuerta</Label>
            <Input value={formData.regulacion_compuerta} onChange={(e) => handleChange('regulacion_compuerta', e.target.value)} />
          </div>
          <div>
            <Label>Área Efectiva</Label>
            <Input value={formData.area_efectiva} onChange={(e) => handleChange('area_efectiva', e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Ficha Técnica (URL)</Label>
          <Input value={formData.ficha_tecnica} onChange={(e) => handleChange('ficha_tecnica', e.target.value)} />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Estado</h2>
        <div>
          <Label>Estado del Producto</Label>
          <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Crear Producto'}
        </Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
