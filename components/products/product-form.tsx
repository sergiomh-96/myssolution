'use client'

import { useState } from 'react'
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

export function ProductForm() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFamilia, setSelectedFamilia] = useState('')
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
    status: 'active',
  })

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.from('products').insert([formData])

      if (error) throw error

      router.push('/dashboard/products')
      router.refresh()
    } catch (error) {
      console.error('Error creating product:', error)
      alert('Error al crear el producto')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Información General</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Marca</Label>
            <Select value={formData.marca} onValueChange={(value) => handleChange('marca', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AGFRI">AGFRI</SelectItem>
                <SelectItem value="MYSAIR">MYSAIR</SelectItem>
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
        <h2 className="text-lg font-semibold">Precios</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>PVP 25</Label>
            <Input type="number" step="0.01" value={formData.pvp_25} onChange={(e) => handleChange('pvp_25', e.target.value)} />
          </div>
          <div>
            <Label>PVP 26</Label>
            <Input type="number" step="0.01" value={formData.pvp_26} onChange={(e) => handleChange('pvp_26', e.target.value)} />
          </div>
          <div>
            <Label>PVP 27</Label>
            <Input type="number" step="0.01" value={formData.pvp_27} onChange={(e) => handleChange('pvp_27', e.target.value)} />
          </div>
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
          {isLoading ? 'Guardando...' : 'Crear Producto'}
        </Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
