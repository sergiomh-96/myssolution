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

// Product Search Input Component
function ProductSearchInput({
  value,
  products,
  onSelect,
  disabled,
}: {
  value: string
  products: Array<{ id: string; referencia: string; descripcion: string; modelo_nombre?: string }>
  onSelect: (productId: string) => void
  disabled?: boolean
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null)

  // Update selected product when value changes
  useEffect(() => {
    const product = products.find(p => p.id === value)
    setSelectedProduct(product || null)
    if (product) {
      setSearchTerm('')
    }
  }, [value, products])

  // Filter products by search term
  const filteredProducts = searchTerm.trim()
    ? products.filter(p => 
        p.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.modelo_nombre && p.modelo_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
      ).slice(0, 10)
    : []

  const handleProductSelect = (product: typeof products[0]) => {
    onSelect(product.id)
    setSelectedProduct(product)
    setSearchTerm('')
    setIsOpen(false)
  }

  const handleClear = () => {
    onSelect('')
    setSelectedProduct(null)
    setSearchTerm('')
  }

  return (
    <div className="relative">
      {selectedProduct ? (
        <div className="flex items-center gap-1">
          <div className="flex-1 h-7 px-2 py-1 border border-input rounded-md bg-background text-xs truncate">
            {selectedProduct.referencia}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleClear}
            disabled={disabled}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <>
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Buscar por referencia o descripción..."
            className="h-7 text-xs"
            disabled={disabled}
          />
          {isOpen && filteredProducts.length > 0 && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-popover border border-border rounded-md shadow-lg">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent cursor-pointer"
                    onClick={() => handleProductSelect(product)}
                  >
                    <div className="font-medium">{product.referencia}</div>
                    <div className="text-muted-foreground truncate text-[10px]">
                      {product.descripcion}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export function OfferForm({ offer, currentUserId, currentUserRole, customers }: OfferFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [tarifas, setTarifas] = useState<any[]>([])
  const [precios, setPrecios] = useState<any[]>([])
  const [defaultTarifa, setDefaultTarifa] = useState<number | null>(null)
  const [contacts, setContacts] = useState<any[]>([])

  const existingItems: OfferItem[] = []

  // Helper to add 30 days to a date
  const addDays = (dateStr: string, days: number) => {
    const date = new Date(dateStr)
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    title: offer?.title || '',
    description: offer?.description || '',
    customer_id: offer?.customer_id || null,
    contact_id: offer?.contact_id || '',
    tarifa_id: offer?.tarifa_id || null,
    status: (offer?.status || 'draft') as OfferStatus,
    valid_until: offer?.valid_until ? offer.valid_until.split('T')[0] : addDays(new Date().toISOString().split('T')[0], 30),
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
        .order('nombre')

      if (tarifasData) {
        setTarifas(tarifasData)
        // Find MYSAIR_2026 tarifa, fallback to first one
        const mysairTarifa = tarifasData.find(t => t.nombre === 'Tarifa_MYSAIR_2026')
        const defaultTarifaId = mysairTarifa ? mysairTarifa.id_tarifa : (tarifasData.length > 0 ? tarifasData[0].id_tarifa : null)

        if (defaultTarifaId) {
          setDefaultTarifa(defaultTarifaId)
          // Only set default tarifa if not already set
          setFormData(prev => {
            if (!prev.tarifa_id) {
              return { ...prev, tarifa_id: defaultTarifaId }
            }
            return prev
          })
        }
      }
    }
    loadData()
  }, [])

  // Load contacts when customer changes
  useEffect(() => {
    const loadContacts = async () => {
      if (!formData.customer_id) {
        setContacts([])
        return
      }

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('clients_contacts')
          .select('*')
          .eq('customer_id', formData.customer_id)
          .order('nombre')

        if (error) {
          console.error('Error loading contacts:', error)
          setError('Error loading contacts')
          return
        }

        setContacts(data || [])
      } catch (err) {
        console.error('Error:', err)
        setError('Error loading contacts')
      }
    }

    loadContacts()
  }, [formData.customer_id])

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

  // Update prices of existing items when tarifa changes and precios are loaded
  useEffect(() => {
    if (precios.length === 0 || items.length === 0) return

    const updatedItems = items.map((item) => {
      if (!item.product_id) return item

      const newPrecio = precios.find(p => p.id_producto === parseInt(item.product_id))

      const updatedItem = {
        ...item,
        pvp: newPrecio ? newPrecio.precio : 0,
      }
      return calculateItemTotals(updatedItem)
    })

    setItems(updatedItems)
  }, [precios])

  const getPrecioForProduct = (productId: number): number | null => {
    const precio = precios.find(p => p.id_producto === productId)
    return precio ? precio.precio : null
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
      pvp: precioFromTarifa !== null ? precioFromTarifa : 0,
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
        title: formData.title,
        description: formData.description,
        customer_id: formData.customer_id ? parseInt(String(formData.customer_id)) : null,
        contact_id: formData.contact_id,
        tarifa_id: formData.tarifa_id ? parseInt(String(formData.tarifa_id)) : null,
        status: formData.status,
        valid_until: formData.valid_until || null,
        notes: formData.notes,
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

        // Update offer items if they exist
        if (items.length > 0) {
          // Delete existing items first
          const { error: deleteError } = await supabase
            .from('offer_items')
            .delete()
            .eq('offer_id', offer.id)

          if (deleteError) throw deleteError

          // Insert new items
          const itemsToInsert = items
            .filter(item => item.product_id) // Only save items with a product
            .map(item => ({
              offer_id: offer.id,
              product_id: item.product_id,
              description: item.description,
              quantity: item.quantity,
              pvp: item.pvp,
              pvp_total: item.pvp_total,
              discount1: item.discount1,
              discount2: item.discount2,
              neto_total1: item.neto_total1,
              neto_total2: item.neto_total2,
            }))

          if (itemsToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from('offer_items')
              .insert(itemsToInsert)

            if (insertError) throw insertError
          }
        }
      } else {
        // Create new offer - generate offer_number
        const currentYear = new Date().getFullYear()
        
        // Get the next offer number for this user and year
        const { data: existingOffers, error: countError } = await supabase
          .from('offers')
          .select('offer_number')
          .eq('created_by', currentUserId)
          .gte('created_at', `${currentYear}-01-01`)
          .lte('created_at', `${currentYear}-12-31`)
          .order('offer_number', { ascending: false })
          .limit(1)

        if (countError) throw countError

        // Calculate next offer number (starts at 1)
        const nextOfferNumber = (existingOffers && existingOffers.length > 0) 
          ? (existingOffers[0].offer_number as number) + 1 
          : 1

        // Create new offer with auto-generated offer_number
        const { data: newOffer, error: insertError } = await supabase
          .from('offers')
          .insert({
            ...offerData,
            created_by: currentUserId,
            amount: totalAmount,
            offer_number: nextOfferNumber,
          })
          .select()

        if (insertError) throw insertError
        if (!newOffer || newOffer.length === 0) throw new Error('Failed to create offer')

        const offerId = newOffer[0].id

        // Insert offer items
        if (items.length > 0) {
          const itemsToInsert = items
            .filter(item => item.product_id) // Only save items with a product
            .map(item => ({
              offer_id: offerId,
              product_id: item.product_id,
              description: item.description,
              quantity: item.quantity,
              pvp: item.pvp,
              pvp_total: item.pvp_total,
              discount1: item.discount1,
              discount2: item.discount2,
              neto_total1: item.neto_total1,
              neto_total2: item.neto_total2,
            }))

          if (itemsToInsert.length > 0) {
            const { error: insertItemsError } = await supabase
              .from('offer_items')
              .insert(itemsToInsert)

            if (insertItemsError) throw insertItemsError
          }
        }
      }

      router.push('/dashboard/offers')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header with Tarifa */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Detalles de la Oferta</h3>
        <div className="w-48">
          <Label htmlFor="tarifa_id" className="text-xs">Tarifa *</Label>
          <Select
            value={formData.tarifa_id?.toString() || ''}
            onValueChange={(value) => {
              setFormData(prev => ({ ...prev, tarifa_id: parseInt(value) }))
            }}
            disabled={loading}
          >
            <SelectTrigger id="tarifa_id" className="h-8 text-sm">
              <SelectValue placeholder="Seleccionar tarifa" />
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
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Row 1: Title (3 cols), Valid Until (1 col) */}
        <div className="space-y-0.5 md:col-span-3">
          <Label htmlFor="title" className="text-xs">Título Oferta *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            disabled={loading}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-0.5">
          <Label htmlFor="valid_until" className="text-xs">Fecha Validez (+30 días)</Label>
          <Input
            id="valid_until"
            type="date"
            value={formData.valid_until}
            onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
            disabled={loading}
            className="h-9 text-sm"
          />
        </div>

        {/* Row 2: Client, Contact, Status, Notes */}
        <div className="space-y-0.5">
          <Label htmlFor="customer_id" className="text-xs">Cliente *</Label>
          <Select
            value={formData.customer_id?.toString() || ''}
            onValueChange={(value) => {
              setFormData(prev => ({ ...prev, customer_id: parseInt(value) }))
            }}
            disabled={loading}
          >
            <SelectTrigger id="customer_id" className="h-9 text-sm">
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id.toString()}>
                  {customer.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-0.5">
          <Label htmlFor="contact_id" className="text-xs">Contacto</Label>
          <Select
            value={formData.contact_id}
            onValueChange={(value) => {
              setFormData(prev => ({ ...prev, contact_id: value }))
            }}
            disabled={loading || !formData.customer_id || contacts.length === 0}
          >
            <SelectTrigger id="contact_id" className="h-9 text-sm">
              <SelectValue placeholder="Seleccionar contacto" />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id.toString()}>
                  {contact.nombre} {contact.apellidos} - {contact.puesto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-0.5">
          <Label htmlFor="status" className="text-xs">Estado</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as OfferStatus })}
            disabled={loading}
          >
            <SelectTrigger id="status" className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
                <>
                  <SelectItem value="approved">Aprobada</SelectItem>
                  <SelectItem value="rejected">Rechazada</SelectItem>
                </>
              )}
              <SelectItem value="sent">Enviada</SelectItem>
              <SelectItem value="accepted">Aceptada</SelectItem>
              <SelectItem value="declined">Declinada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-0.5">
          <Label htmlFor="notes" className="text-xs">Notas</Label>
          <Input
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            disabled={loading}
            className="h-9 text-sm"
          />
        </div>

        {/* Row 3: Description (full width, double height) */}
        <div className="space-y-0.5 md:col-span-4">
          <Label htmlFor="description" className="text-xs">Descripción</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            disabled={loading}
            className="resize-none text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Artículos de la Oferta</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={loading} className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" />
            Añadir Artículo
          </Button>
        </div>

        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-xs table-fixed">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-2 py-1 text-left font-medium text-xs w-[15%]">Artículo</th>
                <th className="px-2 py-1 text-left font-medium text-xs w-[25%]">Descripción</th>
                <th className="px-2 py-1 text-right font-medium text-xs w-24">Cantidad</th>
                <th className="px-2 py-1 text-right font-medium text-xs w-28">PVP</th>
                <th className="px-2 py-1 text-right font-medium text-xs w-28">PVP Total</th>
                <th className="px-2 py-1 text-right font-medium text-xs w-28">Desc. 1 (%)</th>
                <th className="px-2 py-1 text-right font-medium text-xs w-28">Desc. 2 (%)</th>
                <th className="px-2 py-1 text-right font-medium text-xs w-32">Neto Total 1</th>
                <th className="px-2 py-1 text-right font-medium text-xs w-32">Neto Total 2</th>
                <th className="px-2 py-1 text-center font-medium text-xs w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-2 py-1">
                    <ProductSearchInput
                      value={item.product_id || ''}
                      products={products}
                      onSelect={(productId) => handleProductSelect(index, productId)}
                      disabled={loading}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Descripción"
                      className="h-7 text-xs"
                      disabled={loading}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={item.quantity || ''}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="h-7 text-xs text-right"
                      disabled={loading}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.pvp || ''}
                      onChange={(e) => handleItemChange(index, 'pvp', Number(e.target.value))}
                      className="h-7 text-xs text-right"
                      disabled={loading}
                      placeholder="-"
                    />
                  </td>
                  <td className="px-2 py-1 text-right font-medium text-xs">
                    {item.pvp > 0 ? item.pvp_total.toFixed(2) : '-'}
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.discount1 || ''}
                      onChange={(e) => handleItemChange(index, 'discount1', Number(e.target.value))}
                      className="h-7 text-xs text-right"
                      disabled={loading}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.discount2 || ''}
                      onChange={(e) => handleItemChange(index, 'discount2', Number(e.target.value))}
                      className="h-7 text-xs text-right"
                      disabled={loading}
                    />
                  </td>
                  <td className="px-2 py-1 text-right font-medium text-xs">
                    {item.pvp > 0 ? item.neto_total1.toFixed(2) : '-'}
                  </td>
                  <td className="px-2 py-1 text-right font-medium text-primary text-xs">
                    {item.pvp > 0 ? item.neto_total2.toFixed(2) : '-'}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={loading}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-muted/30">
              <tr>
                <td colSpan={8} className="px-2 py-1.5 text-right font-semibold text-xs">
                  Total Oferta:
                </td>
                <td className="px-2 py-1.5 text-right font-bold text-sm text-primary">
                  EUR {totalAmount.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes" className="text-xs">Notas Internas</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          disabled={loading}
          placeholder="Notas internas visibles solo para el equipo de ventas"
          className="text-sm"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="h-8 text-xs">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="h-8 text-xs">
          {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          {offer ? 'Actualizar Oferta' : 'Crear Oferta'}
        </Button>
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
