'use client'

// CACHE CLEAR: Complete rebuild - contacts renamed to contactList
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, Loader2, Plus, X, CheckCircle, ChevronDown, Check, Search, Eye, FileText, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { DuplicateOfferButton } from './duplicate-offer-button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ImportItemsDialog } from './import-items'
import type { Offer, OfferStatus, UserRole } from '@/lib/types/database'
import { formatOfferNumber } from '@/lib/utils/offer'

interface OfferFormProps {
  offer?: Offer
  currentUserId: string
  currentUserRole: UserRole
  customers: { id: string; company_name: string; status: string }[]
}

interface OfferItem {
  id: string
  type: 'article' | 'section_header' | 'note'
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

// Customer Search Input Component
function CustomerSearchInput({
  value,
  customers,
  onSelect,
  disabled,
}: {
  value: string | number | null
  customers: Array<{ id: string | number; company_name: string }>
  onSelect: (customerId: string | number) => void
  disabled?: boolean
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null)

  // Update selected customer when value changes
  useEffect(() => {
    const customer = customers.find(c => String(c.id) === String(value))
    setSelectedCustomer(customer || null)
    if (customer) {
      setSearchTerm('')
    }
  }, [value, customers])

  // Filter customers by search term
  const filteredCustomers = searchTerm.trim()
    ? customers.filter(c => 
        c.company_name.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 10)
    : []

  const handleCustomerSelect = (customer: typeof customers[0]) => {
    onSelect(customer.id)
    setSelectedCustomer(customer)
    setSearchTerm('')
    setIsOpen(false)
  }

  const handleClear = () => {
    onSelect('')
    setSelectedCustomer(null)
    setSearchTerm('')
  }

  return (
    <div className="relative">
      {selectedCustomer ? (
        <div className="flex items-center gap-1">
          <div className="flex-1 h-9 px-2 py-2 border border-input rounded-md bg-background text-sm truncate">
            {selectedCustomer.company_name}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={handleClear}
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              className="pl-8 h-9 text-sm"
              disabled={disabled}
            />
          </div>
          {isOpen && searchTerm.trim() && (
            <>
              {filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-input rounded-md bg-background shadow-lg z-10">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleCustomerSelect(customer)}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                    >
                      {customer.company_name}
                    </button>
                  ))}
                </div>
              )}
              {filteredCustomers.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-input rounded-md bg-background px-3 py-2 text-xs text-muted-foreground">
                  No se encontraron clientes
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export function OfferForm({ offer, currentUserId, currentUserRole, customers }: OfferFormProps) {
  const router = useRouter()
  
  // State declarations - all in one place
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [tarifas, setTarifas] = useState<any[]>([])
  const [nextOfferNumber, setNextOfferNumber] = useState<number | null>(null)
  const [precios, setPrecios] = useState<any[]>([])
  const [defaultTarifa, setDefaultTarifa] = useState<number | null>(null)
  const [contactList, setContactList] = useState<any[]>([])
  const [currentCustomer, setCurrentCustomer] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([])

  const existingItems: OfferItem[] = []

  const createEmptyItem = (type: 'article' | 'section_header' | 'note' = 'article'): OfferItem => ({
    id: crypto.randomUUID(),
    type,
    product_id: null,
    description: '',
    quantity: type === 'article' ? 1 : 0,
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
      : Array.from({ length: 5 }, () => createEmptyItem())
  )
  const [previousOfferId, setPreviousOfferId] = useState<string | null>(null)
  const [nextOfferId, setNextOfferId] = useState<string | null>(null)

  // Format number to Spanish locale (1.000,50)
  const formatNumber = (value: number, decimals = 2) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }

  const loadAdjacentOffers = async () => {
    if (!offer?.id || !offer?.offer_number) return

    try {
      const supabase = createClient()
      
      // Get previous offer
      const { data: prevOffer } = await supabase
        .from('offers')
        .select('id')
        .eq('user_id', currentUserId)
        .lt('offer_number', offer.offer_number)
        .order('offer_number', { ascending: false })
        .limit(1)
        .single()
      
      // Get next offer
      const { data: nextOffer } = await supabase
        .from('offers')
        .select('id')
        .eq('user_id', currentUserId)
        .gt('offer_number', offer.offer_number)
        .order('offer_number', { ascending: true })
        .limit(1)
        .single()
      
      setPreviousOfferId(prevOffer?.id || null)
      setNextOfferId(nextOffer?.id || null)
    } catch (err) {
      console.error('Error loading adjacent offers:', err)
    }
  }

  // Load offer items when offer is provided
  const loadOfferItems = async () => {
    if (!offer?.id) return

    try {
      const supabase = createClient()
      const { data: offerItems, error } = await supabase
        .from('offer_items')
        .select('*')
        .eq('offer_id', offer.id)
        .order('id')

      if (error) {
        console.error('Error loading offer items:', error)
        return
      }

      if (offerItems && offerItems.length > 0) {
        // Load items and ensure at least 15 rows when editing (fill with empty articles if needed)
        const loadedItems = offerItems as OfferItem[]
        const itemsToSet = loadedItems.length >= 15 
          ? loadedItems 
          : [
              ...loadedItems,
              ...Array.from({ length: 15 - loadedItems.length }, () => createEmptyItem('article'))
            ]
        setItems(itemsToSet)
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  useEffect(() => {
    loadOfferItems()
  }, [offer?.id])

  useEffect(() => {
    loadOfferItems()
  }, [offer?.id])

  // Helper to add 30 days to a date
  const addDays = (dateStr: string, days: number) => {
    const date = new Date(dateStr)
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    title: offer?.title || '',
    description: offer?.description || '',
    notas_internas: (offer as any)?.notas_internas || '',
    customer_id: offer?.customer_id || null,
    contact_id: offer?.contact_id || null,
    tarifa_id: offer?.tarifa_id || null,
    status: (offer?.status || 'draft') as OfferStatus,
    valid_until: offer?.valid_until ? offer.valid_until.split('T')[0] : addDays(new Date().toISOString().split('T')[0], 30),
  })

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

        // Load default tarifa from app_settings
        const { data: settingsData } = await supabase
          .from('app_settings')
          .select('default_tarifa_id')
          .eq('id', 1)
          .single()

        let defaultTarifaId = null

        if (settingsData?.default_tarifa_id) {
          // Use tarifa from app_settings
          defaultTarifaId = settingsData.default_tarifa_id
        } else {
          // Fallback: try to find MYSAIR_2026 tarifa, then first one
          const mysairTarifa = tarifasData.find(t => t.nombre === 'Tarifa_MYSAIR_2026')
          defaultTarifaId = mysairTarifa ? mysairTarifa.id_tarifa : (tarifasData.length > 0 ? tarifasData[0].id_tarifa : null)
        }

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

  // Calculate next offer number for new offers
  useEffect(() => {
    const calculateNextOfferNumber = async () => {
      if (offer) return // Only for new offers
      
      try {
        const supabase = createClient()

        // Preview only: read the current sequence value without consuming it
        const { data: existingOffers, error } = await supabase
          .from('offers')
          .select('offer_number')
          .order('offer_number', { ascending: false })
          .limit(1)

        if (error) {
          console.error('Error calculating offer number:', error)
          return
        }

        const nextNumber = (existingOffers && existingOffers.length > 0)
          ? (existingOffers[0].offer_number as number) + 1
          : 1

        setNextOfferNumber(nextNumber)
      } catch (err) {
        console.error('Error:', err)
      }
    }

    calculateNextOfferNumber()
  }, [currentUserId, offer])

  // Load contacts and customer when customer changes
  useEffect(() => {
    const loadCustomerData = async () => {
      if (!formData.customer_id) {
        setContactList([])
        setCurrentCustomer(null)
        return
      }

      try {
        const supabase = createClient()
        
        // Load contacts
        const { data: contacts, error: contactsError } = await supabase
          .from('clients_contacts')
          .select('*')
          .eq('customer_id', formData.customer_id)
          .order('nombre')

        if (contactsError) {
          console.error('Error loading contacts:', contactsError)
          setError('Error loading contacts')
          return
        }

        setContactList(contacts || [])

        // Load customer data
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', formData.customer_id)
          .single()

        if (customerError) {
          console.error('Error loading customer:', customerError)
          return
        }

        setCurrentCustomer(customerData)
      } catch (err) {
        console.error('Error:', err)
        setError('Error loading data')
      }
    }

    loadCustomerData()
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

  // Load available users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name')

        if (error) {
          console.error('Error loading users:', error)
          return
        }

        setUsers(data || [])
      } catch (err) {
        console.error('[v0] Error:', err)
      }
    }

    loadUsers()
  }, [])

  // Load offer assignments if editing
  useEffect(() => {
    const loadAssignments = async () => {
      if (!offer?.id) return

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('offer_assignments')
          .select('user_id')
          .eq('offer_id', offer.id)

        if (error) {
          console.error('Error loading assignments:', error)
          return
        }

        const userIds = data?.map(a => a.user_id) || []
        setAssignedUserIds(userIds)
      } catch (err) {
        console.error('Error:', err)
      }
    }

    loadAssignments()
  }, [offer?.id])

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
    setItems([...items, createEmptyItem('article')])
  }

  const addSectionHeader = () => {
    setItems([...items, createEmptyItem('section_header')])
  }

  const addNote = () => {
    setItems([...items, createEmptyItem('note')])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.neto_total2 || 0), 0)
  const totalPVP = items.reduce((sum, item) => sum + (item.pvp_total || 0), 0)
  const totalNeto = items.reduce((sum, item) => sum + (item.neto_total2 || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      const offerData = {
        title: formData.title,
        description: formData.description,
        notas_internas: formData.notas_internas,
        customer_id: formData.customer_id ? parseInt(String(formData.customer_id)) : null,
        contact_id: formData.contact_id ? parseInt(String(formData.contact_id)) : null,
        tarifa_id: formData.tarifa_id ? parseInt(String(formData.tarifa_id)) : null,
        status: formData.status,
        valid_until: formData.valid_until || null,
      }

      let offerId: string | null = null

      if (offer) {
        // Update existing offer
        offerId = offer.id
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
            .filter(item => item.type === 'section_header' || item.type === 'note' || item.description)
            .map(item => ({
              offer_id: offer.id,
              type: item.type,
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
        // Create new offer - offer_number will be auto-generated by database trigger
        const { data: newOfferData, error: insertError } = await supabase
          .from('offers')
          .insert({
            ...offerData,
            created_by: currentUserId,
            amount: totalAmount,
          })
          .select()

        if (insertError) throw insertError
        if (!newOfferData || newOfferData.length === 0) throw new Error('Failed to create offer')

        offerId = newOfferData[0].id

        // Insert offer items
        if (items.length > 0) {
          const itemsToInsert = items
            .filter(item => item.type === 'section_header' || item.type === 'note' || item.description)
            .map(item => ({
              offer_id: offerId,
              type: item.type,
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

      // Handle user assignments
      if (offerId && assignedUserIds.length > 0) {
        // Delete existing assignments
        const { error: deleteError } = await supabase
          .from('offer_assignments')
          .delete()
          .eq('offer_id', offerId)

        if (deleteError) throw deleteError

        // Insert new assignments
        const assignmentsToInsert = assignedUserIds.map(userId => ({
          offer_id: offerId,
          user_id: userId,
        }))

        const { error: insertError } = await supabase
          .from('offer_assignments')
          .insert(assignmentsToInsert)

        if (insertError) throw insertError
      }

      // Show success message
      setSuccess(true)
      setError(null)
      setLoading(false)
      
      // Reset success message after 2 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setSuccess(false)
      setError(err instanceof Error ? err.message : 'Error al guardar la oferta')
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

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 font-medium">
            Oferta creada correctamente
          </AlertDescription>
        </Alert>
      )}

      {/* Detalles de la Oferta — 4 filas x 4 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

        {/* ── Fila 1: Nº Oferta | — | — | Tarifa ── */}
        <div className="space-y-0.5">
          <Label className="text-xs">Nº Oferta</Label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => previousOfferId && router.push(`/dashboard/offers/${previousOfferId}/edit`)}
              disabled={!previousOfferId || loading}
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 h-9 px-3 py-2 bg-muted rounded-md border border-input flex items-center text-sm font-medium justify-center">
              {offer
                ? formatOfferNumber(offer.offer_number, new Date(offer.created_at).getFullYear())
                : nextOfferNumber
                  ? formatOfferNumber(nextOfferNumber, new Date().getFullYear())
                  : 'Calculando...'}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => nextOfferId && router.push(`/dashboard/offers/${nextOfferId}/edit`)}
              disabled={!nextOfferId || loading}
              className="h-9 w-9 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* empty spacers to push Tarifa to col 4 */}
        <div className="hidden md:block" />
        <div className="hidden md:block" />

        <div className="space-y-0.5">
          <Label htmlFor="tarifa_id" className="text-xs">Tarifa *</Label>
          <Select
            value={formData.tarifa_id?.toString() || ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, tarifa_id: parseInt(value) }))}
            disabled={loading}
          >
            <SelectTrigger id="tarifa_id" className="h-9 text-sm">
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

        {/* ── Fila 2: Título (2 cols) | — | Fecha Creación ── */}
        <div className="space-y-0.5 md:col-span-2">
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

        <div className="hidden md:block" />

        <div className="space-y-0.5">
          <Label className="text-xs">Fecha Creación</Label>
          <Input
            type="text"
            value={
              offer?.created_at
                ? new Date(offer.created_at).toLocaleString('es-ES', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })
                : new Date().toLocaleString('es-ES', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })
            }
            readOnly
            disabled
            className="h-9 text-sm bg-muted"
          />
        </div>

        {/* ── Fila 3: Cliente | Contacto | Estado | Fecha Validez ── */}
        <div className="space-y-0.5">
          <Label htmlFor="customer_id" className="text-xs">Cliente *</Label>
          <CustomerSearchInput
            value={formData.customer_id}
            customers={customers}
            onSelect={(customerId) => setFormData(prev => ({ ...prev, customer_id: parseInt(String(customerId)) }))}
            disabled={loading}
          />
        </div>

        <div className="space-y-0.5">
          <Label htmlFor="contact_id" className="text-xs">Contacto</Label>
          <Select
            value={formData.contact_id?.toString() || ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, contact_id: value ? parseInt(value) : null }))}
            disabled={loading || !formData.customer_id || contactList.length === 0}
          >
            <SelectTrigger id="contact_id" className="h-9 text-sm">
              <SelectValue placeholder="Seleccionar contacto" />
            </SelectTrigger>
            <SelectContent>
              {contactList.map((contact) => (
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
          <Label htmlFor="valid_until" className="text-xs">Fecha Validez</Label>
          <Input
            id="valid_until"
            type="date"
            value={formData.valid_until}
            onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
            disabled={loading}
            className="h-9 text-sm"
          />
        </div>

        {/* ── Fila 4: Notas Cliente | Descripción | Notas Internas | Asignar Usuarios ── */}
        <div className="space-y-0.5">
          <Label className="text-xs">Notas Cliente</Label>
          <Textarea
            value={currentCustomer?.notas_cliente || ''}
            readOnly
            rows={4}
            className="resize-none text-xs bg-muted"
            placeholder="Notas del cliente (solo lectura)"
          />
        </div>

        <div className="space-y-0.5">
          <Label htmlFor="description" className="text-xs">Descripción (Visible en Oferta)</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            disabled={loading}
            className="resize-none text-xs"
            placeholder="Descripción visible en la oferta"
          />
        </div>

        <div className="space-y-0.5">
          <Label htmlFor="notas_internas" className="text-xs">Notas Internas (Invisibles)</Label>
          <Textarea
            id="notas_internas"
            value={formData.notas_internas}
            onChange={(e) => setFormData({ ...formData, notas_internas: e.target.value })}
            rows={4}
            disabled={loading}
            className="resize-none text-xs"
            placeholder="Notas internas que no se mostrarán en la oferta"
          />
        </div>

        <div className="space-y-0.5">
          <Label className="text-xs">Asignar a Usuarios</Label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={loading}
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-sm text-muted-foreground truncate">
                  {assignedUserIds.length === 0
                    ? 'Seleccionar usuarios...'
                    : assignedUserIds.length === 1
                      ? users.find(u => u.id === assignedUserIds[0])?.full_name || '1 usuario'
                      : `${assignedUserIds.length} usuarios seleccionados`}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-1" align="start">
              <div className="max-h-60 overflow-y-auto">
                {users.length > 0 ? (
                  users.map((user) => {
                    const isChecked = assignedUserIds.includes(user.id)
                    return (
                      <label
                        key={user.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-accent/60 px-2 py-1.5 rounded select-none"
                      >
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isChecked ? 'bg-primary border-primary' : 'border-input'}`}>
                          {isChecked && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignedUserIds([...assignedUserIds, user.id])
                            } else {
                              setAssignedUserIds(assignedUserIds.filter(id => id !== user.id))
                            }
                          }}
                          disabled={loading}
                          className="sr-only"
                        />
                        <span className="text-sm truncate">{user.full_name || user.email}</span>
                      </label>
                    )
                  })
                ) : (
                  <p className="text-xs text-muted-foreground px-2 py-1.5">No hay usuarios</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Artículos de la Oferta</Label>
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
              {items.map((item, index) => {
                // Section Header Row
                if (item.type === 'section_header') {
                  return (
                    <tr key={item.id} className="border-t border-border bg-muted/50">
                      <td colSpan={9} className="px-2 py-2">
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Título de sección"
                          className="h-7 text-xs font-semibold"
                          disabled={loading}
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
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
                      </td>
                    </tr>
                  )
                }

                // Note Row
                if (item.type === 'note') {
                  return (
                    <tr key={item.id} className="border-t border-border bg-yellow-50/30">
                      <td colSpan={9} className="px-2 py-2">
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Anotación"
                          className="h-7 text-xs italic"
                          disabled={loading}
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
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
                      </td>
                    </tr>
                  )
                }

                // Article Row (regular)
                return (
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
                      {item.pvp > 0 ? formatNumber(item.pvp_total) : '-'}
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
                      {item.pvp > 0 ? formatNumber(item.neto_total1) : '-'}
                    </td>
                    <td className="px-2 py-1 text-right font-medium text-primary text-xs">
                      {item.pvp > 0 ? formatNumber(item.neto_total2) : '-'}
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
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-border bg-muted/30">
              <tr>
                <td colSpan={7}></td>
                <td className="px-2 py-1 text-right font-semibold text-xs">
                  Total PVP: <span className="font-bold text-sm">EUR {formatNumber(totalPVP)}</span>
                </td>
                <td className="px-2 py-1 text-right font-semibold text-xs">
                  Total NETO: <span className="font-bold text-sm text-primary">EUR {formatNumber(totalNeto)}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex gap-1 justify-start py-3 border-b border-border">
        <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={loading} className="h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" />
          Añadir Artículo
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addSectionHeader} disabled={loading} className="h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" />
          Añadir Título
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addNote} disabled={loading} className="h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" />
          Añadir Anotación
        </Button>
        {offer?.id && (
          <ImportItemsDialog offerId={offer.id} onSuccess={() => loadOfferItems()} />
        )}
      </div>

      <div className="flex justify-between gap-2">
        <div className="flex gap-2">
          {offer?.id && (
            <>
              <Button 
                type="button" 
                variant="default"
                onClick={() => router.push('/dashboard/offers/new')} 
                disabled={loading} 
                className="h-8 text-xs"
              >
                <Plus className="mr-2 h-3 w-3" />
                Crear Oferta
              </Button>
              <DuplicateOfferButton 
                offerId={offer.id} 
                variant="outline" 
                size="sm" 
                showLabel={true}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push(`/dashboard/offers/${offer.id}`)} 
                disabled={loading} 
                className="h-8 text-xs"
              >
                <Eye className="mr-2 h-3 w-3" />
                Ver
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => window.open(`/api/offers/${offer.id}/pdf`, '_blank')} 
                disabled={loading} 
                className="h-8 text-xs"
              >
                <FileText className="mr-2 h-3 w-3" />
                Generar PDF
              </Button>
            </>
          )}
          {!offer?.id && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/dashboard/offers/new')} 
              disabled={loading} 
              className="h-8 text-xs"
            >
              <Plus className="mr-2 h-3 w-3" />
              Crear Nueva Oferta
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/dashboard/offers')} disabled={loading} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="h-8 text-xs">
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {offer ? 'Actualizar Oferta' : 'Crear Oferta'}
          </Button>
        </div>
      </div>
    </form>
  )
}
