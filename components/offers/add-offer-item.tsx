'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type Product = Database['public']['Tables']['products']['Row']

interface AddOfferItemProps {
  offerId: string
  onItemAdded?: () => void
}

export function AddOfferItem({ offerId, onItemAdded }: AddOfferItemProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [pvp, setPvp] = useState('')
  const [discount1, setDiscount1] = useState('')
  const [discount2, setDiscount2] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [customerDiscounts, setCustomerDiscounts] = useState({ sistemas: 0, difusion: 0, agfri: 0 })

  // Load all products on mount - only columns that exist in the table
  useEffect(() => {
    const loadProductsAndCustomer = async () => {
      try {
        const supabase = createClient()
        
        // Load products with familia column
        const { data, error } = await supabase
          .from('products')
          .select('id, referencia, descripcion, modelo_nombre, familia')
          .order('referencia')

        if (error) throw error
        setProducts(data || [])
        
        // Load current offer to get customer discounts
        const { data: offerData } = await supabase
          .from('offers')
          .select('customer_id')
          .eq('id', offerId)
          .single()
        
        if (offerData?.customer_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('descuento_sistemas, descuento_difusion, descuento_agfri')
            .eq('id', offerData.customer_id)
            .single()
          
          if (customerData) {
            const discounts = {
              sistemas: customerData.descuento_sistemas || 0,
              difusion: customerData.descuento_difusion || 0,
              agfri: customerData.descuento_agfri || 0,
            }
            console.log('[v0] Customer discounts loaded:', discounts)
            setCustomerDiscounts(discounts)
          }
        }
      } catch (error) {
        console.error('Error loading products:', error)
      }
    }

    loadProductsAndCustomer()
  }, [offerId])

  // Filter products based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts([])
      setShowDropdown(false)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = products.filter(
      (product) =>
        product.referencia?.toLowerCase().includes(query) ||
        product.descripcion?.toLowerCase().includes(query) ||
        product.modelo_nombre?.toLowerCase().includes(query)
    )

    setFilteredProducts(filtered.slice(0, 10))
    setShowDropdown(true)
  }, [searchQuery, products])

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setSearchQuery(`${product.referencia} - ${product.descripcion}`)
    setPvp(product.pvp?.toString() || '')
    
    // Calculate discount1 based on product family and customer discounts
    let calculatedDiscount = 0
    console.log('[v0] Product selected:', { familia: product.familia, customerDiscounts })
    
    if (product.familia === 'SISTEMAS') {
      calculatedDiscount = customerDiscounts.sistemas
      console.log('[v0] Applying SISTEMAS discount:', calculatedDiscount)
    } else if (product.familia === 'DIFUSIÓN') {
      calculatedDiscount = customerDiscounts.difusion
      console.log('[v0] Applying DIFUSIÓN discount:', calculatedDiscount)
    } else if (product.familia === 'MYSAir') {
      calculatedDiscount = customerDiscounts.agfri
      console.log('[v0] Applying MYSAir (agfri) discount:', calculatedDiscount)
    }
    
    console.log('[v0] Final calculated discount:', calculatedDiscount)
    setDiscount1(calculatedDiscount.toString())
    setFilteredProducts([])
    setShowDropdown(false)
  }

  const handleAddItem = async () => {
    if (!selectedProduct || !quantity || !pvp) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      
      // Calculate totals
      const qtyNum = parseFloat(quantity)
      const pvpNum = parseFloat(pvp)
      const disc1 = parseFloat(discount1 || '0')
      const disc2 = parseFloat(discount2 || '0')

      const subtotal = qtyNum * pvpNum
      const neto1 = subtotal * (1 - disc1 / 100)
      const neto2 = neto1 * (1 - disc2 / 100)

      const { error } = await supabase.from('offer_items').insert({
        offer_id: offerId,
        product_id: selectedProduct.id,
        quantity: qtyNum,
        pvp: pvpNum,
        discount1: disc1 || null,
        discount2: disc2 || null,
        neto_total1: neto1,
        neto_total2: neto2,
        description: selectedProduct.descripcion,
      })

      if (error) throw error

      // Reset form
      setSelectedProduct(null)
      setSearchQuery('')
      setQuantity('1')
      setPvp('')
      setDiscount1('')
      setDiscount2('')

      onItemAdded?.()
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Error al agregar el item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agregar Producto / Item</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Product Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Articulo *</label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por referencia o descripción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setShowDropdown(true)}
                  className="pl-10"
                />
              </div>

              {/* Dropdown with search results */}
              {showDropdown && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b border-border last:border-0"
                    >
                      <div className="font-medium text-foreground">{product.referencia}</div>
                      <div className="text-xs text-muted-foreground truncate">{product.descripcion}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedProduct && (
              <div className="mt-2 p-2 bg-muted rounded text-sm">
                <p className="font-medium text-foreground">{selectedProduct.referencia}</p>
                <p className="text-xs text-muted-foreground">{selectedProduct.descripcion}</p>
              </div>
            )}
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cantidad *</label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">PVP *</label>
              <Input
                type="number"
                step="0.01"
                value={pvp}
                onChange={(e) => setPvp(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Dto 1 %</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={discount1}
                onChange={(e) => setDiscount1(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Dto 2 %</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={discount2}
                onChange={(e) => setDiscount2(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-2 flex items-end">
              <Button
                onClick={handleAddItem}
                disabled={loading || !selectedProduct}
                className="w-full h-8"
              >
                {loading ? 'Agregando...' : 'Agregar Item'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
