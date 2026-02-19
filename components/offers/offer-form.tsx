'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, X } from 'lucide-react'
import type { Offer, OfferStatus, UserRole } from '@/lib/types/database'

interface OfferFormProps {
  offer?: Offer
  currentUserId: string
  currentUserRole: UserRole
  customers: { id: string; company_name: string; status: string }[]
}

interface OfferItem {
  id: string
  product_id: string | null
  description: string
  quantity: number
  pvp: number
  pvp_total: number
  discount1: number
  discount2: number
  neto_total1: number
  neto_total2: number
}

export function OfferForm({ offer, currentUserId, currentUserRole, customers }: OfferFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [tarifas, setTarifas] = useState<any[]>([])
  const [precios, setPrecios] = useState<any[]>([])
  const [defaultTarifa, setDefaultTarifa] = useState<number | null>(null)
  
  const existingItems = offer?.items as OfferItem[] || []
  
  const [formData, setFormData] = useState({
    title: offer?.title || '',
    description: offer?.description || '',
    customer_id: offer?.customer_id || '',
    tarifa_id: offer?.tarifa_id || null,
    default_tarifa_id: offer?.default_tarifa_id || null,
    status: (offer?.status || 'draft') as OfferStatus,
    valid_until: offer?.valid_until ? offer.valid_until.split('T')[0] : '',
    notes: offer?.notes || '',
  })

  const createEmptyItem = (): OfferItem => ({
    id: crypto.randomUUID(),
    product_id: null,
    description: '',
    quantity: 1,
    pvp: 0,
    pvp_total: 0,
    discount1: 0,
    discount2: 0,
    neto_total1: 0,
    neto_total2: 0,
  })

  const [items, setItems] = useState<OfferItem[]>(
    existingItems.length > 0 
      ? existingItems 
      : Array.from({ length: 15 }, () => createEmptyItem())
  )

  // Load active products and tarifas
  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()
      
      // Load products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, referencia, descripcion, modelo_nombre')
        .eq('status', 'active')
        .order('referencia')
      
      if (productsData) {
        setProducts(productsData)
      }

      // Load tarifas
      const { data: tarifasData } = await supabase
        .from('tarifas')
        .select('id_tarifa, nombre')
        .order('id_tarifa')
      
      if (tarifasData) {
        setTarifas(tarifasData)
        if (tarifasData.length > 0) {
          setDefaultTarifa(tarifasData[0].id_tarifa)
          if (!formData.tarifa_id) {
            setFormData(prev => ({ ...prev, tarifa_id: tarifasData[0].id_tarifa }))
          }
        }
      }
    }
    loadData()
  }, [])

  // Load precios when tarifa changes
  useEffect(() => {
    if (!formData.tarifa_id) return

    const loadPrecios = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('precios_producto')
        .select('id_producto, id_tarifa, precio')
        .eq('id_tarifa', formData.tarifa_id)
      
      if (data) {
        setPrecios(data)
      }
    }
    loadPrecios()
  }, [formData.tarifa_id])

  const getPrecioForProduct = (productId: number): number => {
    const precio = precios.find(p => p.id_producto === productId)
    return precio ? precio.precio : 0
  }

  const calculateItemTotals = (item: OfferItem): OfferItem => {
    const quantity = Number(item.quantity) || 0
    const pvp = Number(item.pvp) || 0
    const discount1 = Number(item.discount1) || 0
    const discount2 = Number(item.discount2) || 0

    // PVP Total = Cantidad * PVP
    const pvp_total = quantity * pvp

    // Neto Total 1 = PVP Total - (PVP Total * Descuento1 / 100)
    const neto_total1 = pvp_total - (pvp_total * discount1 / 100)

    // Neto Total 2 = Neto Total 1 - (Neto Total 1 * Descuento2 / 100)
    const neto_total2 = neto_total1 - (neto_total1 * discount2 / 100)

    return {
      ...item,
      pvp_total,
      neto_total1,
      neto_total2,
    }
  }

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    const newItems = [...items]
    const precioFromTarifa = getPrecioForProduct(product.id)
    
    newItems[index] = {
      ...newItems[index],
      product_id: productId,
      description: `${product.referencia} - ${product.modelo_nombre || product.descripcion || ''}`,
      pvp: precioFromTarifa || 0,
    }
    newItems[index] = calculateItemTotals(newItems[index])
    setItems(newItems)
  }

  const handleItemChange = (index: number, field: keyof OfferItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Recalcular totales cuando cambian campos relevantes
    if (['quantity', 'pvp', 'discount1', 'discount2'].includes(field)) {
      newItems[index] = calculateItemTotals(newItems[index])
    }
    
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, createEmptyItem()])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.neto_total2 || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      const offerData = {
        ...formData,
        total_amount: totalAmount,
        items: items,
        valid_until: formData.valid_until || null,
      }

      if (offer) {
        // Update existing offer
        const { error: updateError } = await supabase
          .from('offers')
          .update({
            ...offerData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', offer.id)

        if (updateError) throw updateError
      } else {
        // Create new offer
        const { error: insertError } = await supabase
          .from('offers')
          .insert({
            ...offerData,
            created_by: currentUserId,
          })

        if (insertError) throw insertError
      }

      router.push('/dashboard/offers')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="title">Offer Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer_id">Customer *</Label>
          <Select 
            value={formData.customer_id} 
            onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
            disabled={loading}
          >
            <SelectTrigger id="customer_id">
              <SelectValue placeholder="Select a customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tarifa_id">Tarifa (Pricing) *</Label>
          <Select 
            value={formData.tarifa_id?.toString() || ''} 
            onValueChange={(value) => setFormData({ ...formData, tarifa_id: parseInt(value) })}
            disabled={loading}
          >
            <SelectTrigger id="tarifa_id">
              <SelectValue placeholder="Select a pricing tier" />
            </SelectTrigger>
            <SelectContent>
              {tarifas.map((tarifa) => (
                <SelectItem key={tarifa.id_tarifa} value={tarifa.id_tarifa.toString()}>
                  {tarifa.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select 
            value={formData.status} 
            onValueChange={(value) => setFormData({ ...formData, status: value as OfferStatus })}
            disabled={loading}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
              {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
                <>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </>
              )}
              <SelectItem value="sent">Sent to Customer</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default_tarifa_id">Default Tarifa (for new items)</Label>
          <Select 
            value={formData.default_tarifa_id?.toString() || ''} 
            onValueChange={(value) => setFormData({ ...formData, default_tarifa_id: value ? parseInt(value) : null })}
            disabled={loading}
          >
            <SelectTrigger id="default_tarifa_id">
              <SelectValue placeholder="Same as above" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Same as current</SelectItem>
              {tarifas.map((tarifa) => (
                <SelectItem key={tarifa.id_tarifa} value={tarifa.id_tarifa.toString()}>
                  {tarifa.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="valid_until">Valid Until</Label>
          <Input
            id="valid_until"
            type="date"
            value={formData.valid_until}
            onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Offer Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={loading}>
            <Plus className="w-4 h-4 mr-1" />
            Add Item
          </Button>
        </div>

        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-[15%]">Artículo</th>
                <th className="px-3 py-2 text-left font-medium w-[25%]">Descripción</th>
                <th className="px-3 py-2 text-right font-medium w-28">Cantidad</th>
                <th className="px-3 py-2 text-right font-medium w-32">PVP</th>
                <th className="px-3 py-2 text-right font-medium w-32">PVP Total</th>
                <th className="px-3 py-2 text-right font-medium w-32">Desc. 1 (%)</th>
                <th className="px-3 py-2 text-right font-medium w-32">Desc. 2 (%)</th>
                <th className="px-3 py-2 text-right font-medium w-36">Neto Total 1</th>
                <th className="px-3 py-2 text-right font-medium w-36">Neto Total 2</th>
                <th className="px-3 py-2 text-center font-medium w-14"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <Select
                      value={item.product_id || ''}
                      onValueChange={(value) => handleProductSelect(index, value)}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.marca} - {product.referencia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Descripción del artículo"
                      className="h-8 text-sm"
                      disabled={loading}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={item.quantity || ''}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="h-8 text-sm text-right"
                      disabled={loading}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.pvp || ''}
                      onChange={(e) => handleItemChange(index, 'pvp', Number(e.target.value))}
                      className="h-8 text-sm text-right"
                      disabled={loading}
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {item.pvp_total.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.discount1 || ''}
                      onChange={(e) => handleItemChange(index, 'discount1', Number(e.target.value))}
                      className="h-8 text-sm text-right"
                      disabled={loading}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.discount2 || ''}
                      onChange={(e) => handleItemChange(index, 'discount2', Number(e.target.value))}
                      className="h-8 text-sm text-right"
                      disabled={loading}
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {item.neto_total1.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-primary">
                    {item.neto_total2.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={loading}
                        className="h-7 w-7 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-muted/30">
              <tr>
                <td colSpan={8} className="px-3 py-3 text-right font-semibold">
                  Total Oferta:
                </td>
                <td className="px-3 py-3 text-right font-bold text-lg text-primary">
                  EUR {totalAmount.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          disabled={loading}
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            offer ? 'Update Offer' : 'Create Offer'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
