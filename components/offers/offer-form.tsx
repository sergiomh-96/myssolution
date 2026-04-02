'use client'

// CACHE CLEAR: Complete rebuild - contacts renamed to contactList
import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Copy, Loader2, Plus, X, CheckCircle, ChevronDown, Check, Search, Eye, FileText, AlertCircle, ChevronLeft, ChevronRight, GripVertical, Trash2 } from 'lucide-react'
import { DuplicateOfferButton } from './duplicate-offer-button'
import { CalcularLarguerosDialog } from './calcular-largueros-dialog'
import { CalcularMedidasEspecialesDialog } from './calcular-medidas-especiales-dialog'
import { GeneratePdfButton } from './generate-pdf-button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ExportItemsExcelButton } from './export-items-excel-button'
import { ImportItemsDialog } from './import-items'
import type { Offer, OfferStatus, UserRole } from '@/lib/types/database'
import { formatOfferNumber } from '@/lib/utils/offer'

interface OfferFormProps {
  offer?: Offer
  currentUserId: string
  currentUserRole: UserRole
  customers: { id: string; company_name: string; status: string }[]
  createdByName?: string
  currentUserName?: string
}

interface OfferItem {
  id: string
  type: 'article' | 'section_header' | 'note' | 'summary' | 'external'
  product_id: string | null
  description: string
  quantity: number
  pvp: number
  pvp_total: number
  discount1: number
  discount2: number
  neto_total1: number
  neto_total2: number
  external_ref?: string  // Free-text reference for external articles
  custom_ref?: string    // Custom reference for special measurements (article type)
  is_pvp_modified?: boolean // Track if PVP was manually changed
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

  // Update search term when value change from parent (initial load or manual sync)
  useEffect(() => {
    const product = products.find(p => String(p.id) === String(value))
    if (product) {
      setSearchTerm(product.referencia)
    } else if (!value && searchTerm === '') {
      // Keep empty if no value
    }
  }, [value, products])

  // Filter products by search term, prioritizing referencia matches
  const filteredProducts = searchTerm.trim()
    ? products.filter(p =>
      p.referencia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.modelo_nombre && p.modelo_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    )
      .sort((a, b) => {
        const aRefMatch = a.referencia?.toLowerCase().includes(searchTerm.toLowerCase())
        const bRefMatch = b.referencia?.toLowerCase().includes(searchTerm.toLowerCase())

        // Priorize referencia matches first
        if (aRefMatch && !bRefMatch) return -1
        if (!aRefMatch && bRefMatch) return 1

        // Then sort alphabetically
        return (a.referencia || '').localeCompare(b.referencia || '')
      })
      .slice(0, 10)
    : []

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)

  // Recalculate dropdown position on scroll/resize
  useEffect(() => {
    if (!isOpen) return
    const update = () => {
      if (inputRef.current) setDropdownRect(inputRef.current.getBoundingClientRect())
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [isOpen])

  // Reset highlighted index when filtered results change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [filteredProducts.length, searchTerm])

  const handleProductSelect = (product: typeof products[0]) => {
    setSearchTerm(product.referencia)
    setIsOpen(false)
    onSelect(product.id)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && filteredProducts[highlightedIndex]) {
        handleProductSelect(filteredProducts[highlightedIndex])
      } else if (filteredProducts.length > 0) {
        handleProductSelect(filteredProducts[0])
      } else if (searchTerm.trim()) {
        // Force as custom selection if no results
        onSelect(searchTerm)
        setIsOpen(false)
      }
    } else if (e.key === 'Tab') {
      if (isOpen && filteredProducts.length > 0) {
        const idx = highlightedIndex >= 0 ? highlightedIndex : 0
        handleProductSelect(filteredProducts[idx])
      } else if (searchTerm.trim() && !value) {
        // Force as custom selection if no results and no product already selected
        onSelect(searchTerm)
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setHighlightedIndex(-1)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <Input
        ref={inputRef}
        value={searchTerm}
        onChange={(e) => {
          const val = e.target.value
          setSearchTerm(val)
          setIsOpen(true)
          if (inputRef.current) setDropdownRect(inputRef.current.getBoundingClientRect())
          
          if (!val) {
            onSelect('')
          }
        }}
        onFocus={() => {
          setIsOpen(true)
          if (inputRef.current) setDropdownRect(inputRef.current.getBoundingClientRect())
        }}
        onKeyDown={handleKeyDown}
        placeholder="Referencia..."
        className="h-7 text-xs pr-6"
        disabled={disabled}
      />
      {searchTerm && (
        <button
          type="button"
          onClick={() => {
            setSearchTerm('')
            onSelect('')
            setIsOpen(false)
            inputRef.current?.focus()
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      {isOpen && filteredProducts.length > 0 && dropdownRect && typeof document !== 'undefined' && ReactDOM.createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed z-[9999] bg-popover border border-border rounded-md shadow-xl overflow-y-auto"
            style={{
              top: dropdownRect.bottom + 2,
              left: dropdownRect.left,
              width: dropdownRect.width,
              maxHeight: '240px',
            }}
          >
            {filteredProducts.map((product, idx) => (
              <button
                key={product.id}
                type="button"
                className={`w-full text-left px-2 py-1.5 text-xs cursor-pointer ${idx === highlightedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent'
                  }`}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => handleProductSelect(product)}
              >
                <div className="font-medium">{product.referencia}</div>
                <div className="text-muted-foreground truncate text-[10px]">
                  {product.modelo_nombre && `${product.modelo_nombre} - `}{product.descripcion}
                </div>
              </button>
            ))}
          </div>
        </>,
        document.body
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
    const valueStr = String(value)

    // Handle free-text customers
    if (valueStr.startsWith('free:')) {
      const customerName = valueStr.substring(5)
      setSelectedCustomer({ id: valueStr, company_name: customerName })
      setSearchTerm('')
      return
    }

    // Handle regular customers
    const customer = customers.find(c => String(c.id) === valueStr)
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

  const handleFreeText = () => {
    // Store the free text as a string with a special prefix to identify it's not a real customer ID
    onSelect(`free:${searchTerm}`)
    setSelectedCustomer({ id: `free:${searchTerm}`, company_name: searchTerm })
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
                <div className="absolute top-full left-0 right-0 mt-1 border border-input rounded-md bg-background shadow-lg z-10">
                  <button
                    type="button"
                    onClick={handleFreeText}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm text-foreground"
                  >
                    Usar "{searchTerm}" como cliente libre
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export function OfferForm({ offer, currentUserId, currentUserRole, customers, createdByName, currentUserName }: OfferFormProps) {
  const router = useRouter()
  const isViewer = currentUserRole === 'viewer'


  // State declarations - all in one place
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [savedOfferId, setSavedOfferId] = useState<string | null>(offer?.id?.toString() ?? null)
  const [savedOfferNumber, setSavedOfferNumber] = useState<number | null>(offer?.offer_number ?? null)
  const [products, setProducts] = useState<any[]>([])
  const [tarifas, setTarifas] = useState<any[]>([])
  const [nextOfferNumber, setNextOfferNumber] = useState<number | null>(null)
  const [precios, setPrecios] = useState<any[]>([])
  const [defaultTarifa, setDefaultTarifa] = useState<number | null>(null)
  const [contactList, setContactList] = useState<any[]>([])
  const callbackRef = useRef<(() => void) | null>(null)
  const [currentCustomer, setCurrentCustomer] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([])
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  // Track server-side validated state; updated when offer prop changes (e.g. after router.refresh())
  const [isValidated, setIsValidated] = useState<boolean>(offer?.is_validated ?? false)
  // Track if user has explicitly modified any discount field in this session
  const [userHasModifiedDiscounts, setUserHasModifiedDiscounts] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [initialAssignedUserIds, setInitialAssignedUserIds] = useState<string[]>([])

  const existingItems: OfferItem[] = []

  const createEmptyItem = (type: 'article' | 'section_header' | 'note' | 'summary' | 'external' = 'article'): OfferItem => ({
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

  // Format number to Spanish locale (100.024,23€)
  const formatNumber = (value: number, decimals = 2) => {
    const formatted = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
    return `${formatted}€`
  }

  const loadAdjacentOffers = async () => {
    if (!offer?.id || offer?.offer_number == null) return

    try {
      const supabase = createClient()
      const offerNum = Number(offer.offer_number)

      // Get previous offer (highest offer_number below current)
      const { data: prevOffers } = await supabase
        .from('offers')
        .select('id, offer_number')
        .lt('offer_number', offerNum)
        .order('offer_number', { ascending: false })
        .limit(1)

      // Get next offer (lowest offer_number above current)
      const { data: nextOffers } = await supabase
        .from('offers')
        .select('id, offer_number')
        .gt('offer_number', offerNum)
        .order('offer_number', { ascending: true })
        .limit(1)

      setPreviousOfferId(prevOffers?.[0]?.id ?? null)
      setNextOfferId(nextOffers?.[0]?.id ?? null)
    } catch (err) {
      console.error('[v0] Error loading adjacent offers:', err)
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
        // Load items
        const loadedItems = offerItems as OfferItem[]
        const itemsToSet = loadedItems.length >= 5
          ? loadedItems
          : [
            ...loadedItems,
            ...Array.from({ length: 5 - loadedItems.length }, () => createEmptyItem('article'))
          ]
        isInitialMount.current = true
        setItems(itemsToSet)
        setUnsavedChanges(false)
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  useEffect(() => {
    loadOfferItems()
    loadAdjacentOffers()
    // Mark that we are NOT in initial user change state
    setUnsavedChanges(false)
  }, [offer?.id])

  // Helper to add 30 days to a date
  const addDays = (dateStr: string, days: number) => {
    const date = new Date(dateStr)
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    notas_internas: any;
    customer_id: number | string | null;
    contact_id: number | null;
    tarifa_id: number | null;
    status: OfferStatus;
    valid_until: string;
  }>({
    title: offer?.title || '',
    description: offer?.description || '',
    notas_internas: (offer as any)?.notas_internas || '',
    customer_id: offer?.customer_id || null,
    contact_id: offer?.contact_id || null,
    tarifa_id: offer?.tarifa_id || null,
    status: (offer?.status || 'borrador') as OfferStatus,
    valid_until: offer?.valid_until ? offer.valid_until.split('T')[0] : addDays(new Date().toISOString().split('T')[0], 30),
  })

  // Phase 1: Load essential UI metadata (tarifas, settings) immediately
  useEffect(() => {
    const loadMetadata = async () => {
      const supabase = createClient()
      const [tarifasResponse, settingsResponse] = await Promise.all([
        supabase.from('tarifas').select('id_tarifa, nombre').order('nombre'),
        supabase.from('app_settings').select('default_tarifa_id').eq('id', 1).single(),
      ])

      const { data: tarifasData } = tarifasResponse
      if (tarifasData) {
        setTarifas(tarifasData)

        const { data: settingsData } = settingsResponse
        let defaultTarifaId: number | null = null

        if (settingsData?.default_tarifa_id) {
          defaultTarifaId = settingsData.default_tarifa_id
        } else {
          const mysairTarifa = tarifasData.find(t => t.nombre === 'Tarifa_MYSAIR_2026')
          defaultTarifaId = mysairTarifa ? mysairTarifa.id_tarifa : (tarifasData.length > 0 ? tarifasData[0].id_tarifa : null)
        }

        if (defaultTarifaId && !offer?.id) {
          setDefaultTarifa(defaultTarifaId)
          setFormData(prev => {
            if (!prev.tarifa_id) {
              return { ...prev, tarifa_id: defaultTarifaId }
            }
            return prev
          })
        }
      }
    }
    loadMetadata()
  }, [offer?.id])

  // Phase 2: Load heavy data (products) in the background
  useEffect(() => {
    const loadProducts = async () => {
      const supabase = createClient()
      const BATCH = 1000
      const MAX_PRODUCTS = 50000

      const fetchAllProducts = async (columns: string) => {
        const first = await supabase
          .from('products')
          .select(columns, { count: 'exact' })
          .order('referencia')
          .range(0, BATCH - 1)

        const total = first.count ?? BATCH
        const pages = Math.min(Math.ceil(total / BATCH), MAX_PRODUCTS / BATCH)

        if (pages <= 1) return first.data ?? []

        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) =>
            supabase
              .from('products')
              .select(columns)
              .order('referencia')
              .range((i + 1) * BATCH, (i + 2) * BATCH - 1)
          )
        )

        return [
          ...(first.data ?? []),
          ...rest.flatMap(r => r.data ?? []),
        ]
      }

      // Step 2.1: Load only referencies (fast)
      const refsOnly = await fetchAllProducts('id, referencia')
      if (refsOnly.length > 0) {
        setProducts(refsOnly as any[])
      }

      // Step 2.2: Load full product details (slow)
      const fullProducts = await fetchAllProducts('id, referencia, descripcion, modelo_nombre, familia, larguero_largo, larguero_alto')
      if (fullProducts.length > 0) {
        setProducts(fullProducts as any[])
      }
    }
    loadProducts()
  }, [])

  // Sync isValidated from server when offer prop is refreshed (e.g. via router.refresh())
  useEffect(() => {
    setIsValidated(offer?.is_validated ?? false)
    if (offer) {
      setFormData({
        title: offer.title || '',
        description: offer.description || '',
        notas_internas: (offer as any).notas_internas || '',
        customer_id: offer.customer_id || null,
        contact_id: offer.contact_id || null,
        tarifa_id: offer.tarifa_id || null,
        status: (offer.status || 'borrador') as OfferStatus,
        valid_until: offer.valid_until ? offer.valid_until.split('T')[0] : addDays(new Date().toISOString().split('T')[0], 30),
      })
    }
    // When offer changes (load/refresh), definitely NO unsaved changes yet
    setUnsavedChanges(false)
  }, [offer?.is_validated, offer?.id])

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
        const customerIdStr = String(formData.customer_id)

        // Skip loading if it's a free-text customer (not yet created/assigned a numeric ID)
        if (customerIdStr.startsWith('free:')) {
          setContactList([])
          setCurrentCustomer(null)
          return
        }

        const customerId = parseInt(customerIdStr)

        // Load contacts
        const { data: contacts, error: contactsError } = await supabase
          .from('clients_contacts')
          .select('*')
          .eq('customer_id', customerId)
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
          .eq('id', customerId)
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

  // Recalculate discounts when customer changes
  useEffect(() => {
    if (!currentCustomer || items.length === 0) return

    setItems(currentItems => currentItems.map(item => {
      // Ignorar artículos de medida especial, artículos externos o con PVP manual
      if (!item.product_id || item.external_ref || item.custom_ref || item.is_pvp_modified) return item

      const product = products.find(p => p.id === item.product_id)
      if (!product) return item

      // Calculate new discount based on product family and current customer discounts
      let newDiscount = 0
      if (product.familia === 'SISTEMAS' || product.familia === 'VMC') {
        newDiscount = currentCustomer.descuento_sistemas || 0
      } else if (product.familia === 'DIFUSIÓN') {
        newDiscount = currentCustomer.descuento_difusion || 0
      } else if (product.familia === 'MYSAir') {
        newDiscount = currentCustomer.descuento_agfri || 0
      }

      // Only update if discount changed
      if (newDiscount !== item.discount1) {
        const updatedItem = { ...item, discount1: newDiscount }
        return calculateItemTotals(updatedItem)
      }

      return item
    }))
  }, [currentCustomer])

  // Load precios when tarifa changes
  useEffect(() => {
    if (!formData.tarifa_id) return

    const loadPrecios = async () => {
      const supabase = createClient()
      const allPrecios: any[] = []

      // Load precios in batches up to 50000
      for (let i = 0; i < 50; i++) {
        const { data, error } = await supabase
          .from('precios_producto')
          .select('id_producto, id_tarifa, precio')
          .eq('id_tarifa', formData.tarifa_id)
          .order('id_producto')
          .range(i * 1000, i * 1000 + 999)

        if (error || !data || data.length === 0) break
        allPrecios.push(...data)
        if (data.length < 1000) break
      }

      setPrecios(allPrecios)
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
        setInitialAssignedUserIds(userIds)
      } catch (err) {
        console.error('Error:', err)
      }
    }

    loadAssignments()
  }, [offer?.id])

  // Update prices of existing items when tarifa changes and precios are loaded
  useEffect(() => {
    if (precios.length === 0 || items.length === 0) return

    setItems(currentItems => currentItems.map((item) => {
      // Ignorar artículos de medida especial, artículos externos o con PVP manual
      if (!item.product_id || item.external_ref || item.custom_ref || item.is_pvp_modified) return item

      const newPrecio = precios.find(p => p.id_producto === parseInt(item.product_id || '0'))

      if (newPrecio && newPrecio.precio !== item.pvp) {
        const updatedItem = {
          ...item,
          pvp: newPrecio.precio,
        }
        return calculateItemTotals(updatedItem)
      }
      return item
    }))
  }, [precios])

  // Execute callback action after successful save
  useEffect(() => {
    if (savedOfferId && success && callbackRef.current) {
      const callback = callbackRef.current
      callbackRef.current = null
      callback()
      setSuccess(false)
    }
  }, [savedOfferId, success])

  // Handle unsaved changes when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [unsavedChanges])

  const isInitialMount = useRef(true)

  // Mark changes as unsaved when form data changes
  useEffect(() => {
    if (isInitialMount.current) {
      // First mount doesn't count as user change
      isInitialMount.current = false
      return
    }
    // If we're loading data, don't set unsavedChanges
    if (!loading && !success) {
      setUnsavedChanges(true)
    }
  }, [items])

  const handleNavigation = (path: string) => {
    if (unsavedChanges && !loading && !isViewer) {
      setPendingNavigation(path)
      // Guardar automáticamente antes de salir
      callbackRef.current = () => {
        router.push(path)
      }
      
      // Seleccionar el botón de guardado y simular el click
      const saveButton = document.querySelector('[data-save-button]') as HTMLButtonElement
      if (saveButton) {
        saveButton.click()
      } else {
        router.push(path)
      }
    } else {
      router.push(path)
    }
  }

  const handleSaveAndExit = async () => {
    setShowExitDialog(false)
    // Trigger save by setting callback
    if (pendingNavigation && savedOfferId) {
      callbackRef.current = () => {
        router.push(pendingNavigation)
      }
      // The save will trigger through handleSaveOffer
      const saveButton = document.querySelector('[data-save-button]') as HTMLButtonElement
      if (saveButton) saveButton.click()
    } else {
      router.push(pendingNavigation || '/dashboard/offers')
    }
  }

  const handleExitWithoutSave = () => {
    setShowExitDialog(false)
    setUnsavedChanges(false)
    router.push(pendingNavigation || '/dashboard/offers')
  }

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
      is_pvp_modified: item.is_pvp_modified,
    }
  }

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => String(p.id) === String(productId))
    
    const newItems = [...items]

    if (!product) {
      if (!productId) {
        newItems[index] = { ...newItems[index], product_id: null, description: '' }
        setItems(recalculateSummaries(newItems))
        return
      }

      // Automatically convert to external item if no product is found
      newItems[index] = {
        ...createEmptyItem('external'),
        external_ref: productId,
        quantity: newItems[index].quantity || 1,
      }
      setItems(recalculateSummaries(newItems))
      return
    }

    const precioFromTarifa = getPrecioForProduct(product.id)

    // Calculate automatic discount based on product family and customer discounts
    let automaticDiscount = 0
    if (currentCustomer) {
      if (product.familia === 'SISTEMAS' || product.familia === 'VMC') {
        automaticDiscount = currentCustomer.descuento_sistemas || 0
      } else if (product.familia === 'DIFUSIÓN') {
        automaticDiscount = currentCustomer.descuento_difusion || 0
      } else if (product.familia === 'HERRAMIENTA') {
        automaticDiscount = currentCustomer.descuento_agfri || 0
      }
    }

    newItems[index] = {
      ...newItems[index],
      product_id: productId,
      description: product.descripcion || '',
      pvp: precioFromTarifa !== null ? precioFromTarifa : 0,
      discount1: automaticDiscount,
      is_pvp_modified: false,
    }
    newItems[index] = calculateItemTotals(newItems[index])
    
    // Auto-add row if we're filling the last or second to last row
    if (index >= newItems.length - 2) {
      newItems.push(createEmptyItem('article'))
    }
    
    setItems(recalculateSummaries(newItems))
    setUserHasModifiedDiscounts(true)
  }

  const recalculateSummaries = (currentItems: OfferItem[]): OfferItem[] => {
    return currentItems.map((item, index) => {
      if (item.type !== 'summary') return item

      // Find the previous section_header
      let lastHeaderIndex = -1
      for (let i = index - 1; i >= 0; i--) {
        if (currentItems[i].type === 'section_header') {
          lastHeaderIndex = i
          break
        }
      }

      // Find articles between last header and this summary (excluding other summaries/notes)
      const articlesBefore = currentItems.slice(lastHeaderIndex + 1, index).filter(
        i => i.type === 'article'
      )

      return {
        ...item,
        pvp_total: articlesBefore.reduce((sum, i) => sum + (i.pvp_total || 0), 0),
        neto_total1: articlesBefore.reduce((sum, i) => sum + (i.neto_total1 || 0), 0),
        neto_total2: articlesBefore.reduce((sum, i) => sum + (i.neto_total2 || 0), 0),
      }
    })
  }

  const handleItemChange = (index: number, field: keyof OfferItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Recalcular totales cuando cambian campos relevantes
    if (['quantity', 'pvp', 'discount1', 'discount2'].includes(field)) {
      if (field === 'pvp') {
        newItems[index] = { ...newItems[index], is_pvp_modified: true }
      }
      newItems[index] = calculateItemTotals(newItems[index])
    }

    // Recalcular todos los resúmenes con los nuevos valores
    
    // Auto-add row if we're filling the last or second to last row with a reference or description
    if ((field === 'product_id' || field === 'external_ref' || field === 'description') && index >= newItems.length - 2) {
      // Check if it's already a significant change (not just an empty string)
      if (value) {
        newItems.push(createEmptyItem('article'))
      }
    }

    setItems(recalculateSummaries(newItems))

    // If discount fields are modified, track it separately from general unsavedChanges
    if (['discount1', 'discount2', 'product_id'].includes(field)) {
      setUserHasModifiedDiscounts(true)
    }
  }

  const addItem = () => {
    const newItems = [...items]
    const insertIndex = getInsertIndex(newItems)
    newItems.splice(insertIndex, 0, createEmptyItem('article'))
    setItems(newItems)
  }

  const getInsertIndex = (currentItems: OfferItem[]) => {
    let lastDataIndex = -1
    for (let i = currentItems.length - 1; i >= 0; i--) {
      const item = currentItems[i]
      const hasData = 
        item.type !== 'article' || 
        item.product_id || 
        (item.description && item.description.trim() !== '') || 
        (item.external_ref && item.external_ref.trim() !== '')
      
      if (hasData) {
        lastDataIndex = i
        break
      }
    }
    return lastDataIndex + 1
  }

  const addItemByProductId = (productId: string, quantity: number, customDescription?: string, customPrice?: number, customLongDescription?: string) => {
    const product = products.find(p => String(p.id) === String(productId))

    const precioFromTarifa = product ? getPrecioForProduct(product.id) : null
    let automaticDiscount = 0
    if (product && currentCustomer) {
      if (product.familia === 'SISTEMAS' || product.familia === 'VMC') automaticDiscount = currentCustomer.descuento_sistemas || 0
      else if (product.familia === 'DIFUSIÓN') automaticDiscount = currentCustomer.descuento_difusion || 0
      else if (product.familia === 'HERRAMIENTA') automaticDiscount = currentCustomer.descuento_agfri || 0
    }

    const newItem = {
      ...createEmptyItem('article'),
      product_id: String(productId),
      custom_ref: customDescription,
      description: customLongDescription || (product ? product.descripcion || '' : ''),
      pvp: customPrice !== undefined ? customPrice : (precioFromTarifa !== null ? precioFromTarifa : 0),
      quantity,
      discount1: automaticDiscount,
      is_pvp_modified: customPrice !== undefined,
    }
    
    setItems(currentItems => {
      const newItems = [...currentItems]
      const insertIndex = getInsertIndex(newItems)
      newItems.splice(insertIndex, 0, calculateItemTotals(newItem))
      return recalculateSummaries(newItems)
    })
    
    setUserHasModifiedDiscounts(true)
  }

  const addExternalItem = () => {
    const item: OfferItem = {
      ...createEmptyItem('external'),
      external_ref: '',
    }
    const newItems = [...items]
    const insertIndex = getInsertIndex(newItems)
    newItems.splice(insertIndex, 0, item)
    setItems(newItems)
  }

  const addSectionHeader = () => {
    const newItems = [...items]
    const insertIndex = getInsertIndex(newItems)
    newItems.splice(insertIndex, 0, createEmptyItem('section_header'))
    setItems(newItems)
  }

  const addNote = () => {
    const newItems = [...items]
    const insertIndex = getInsertIndex(newItems)
    newItems.splice(insertIndex, 0, createEmptyItem('note'))
    setItems(newItems)
  }

  const addSummary = () => {
    // Find articles since the last section_header
    let lastHeaderIndex = -1
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].type === 'section_header') {
        lastHeaderIndex = i
        break
      }
    }

    // Sum up articles between last header and current position (excluding summaries and notes)
    const articlesSinceHeader = items.slice(lastHeaderIndex + 1).filter(
      item => item.type === 'article'
    )

    const summaryPVP = articlesSinceHeader.reduce((sum, item) => sum + (item.pvp_total || 0), 0)
    const summaryNeto1 = articlesSinceHeader.reduce((sum, item) => sum + (item.neto_total1 || 0), 0)
    const summaryNeto2 = articlesSinceHeader.reduce((sum, item) => sum + (item.neto_total2 || 0), 0)

    const summaryItem: OfferItem = {
      id: crypto.randomUUID(),
      type: 'summary',
      product_id: null,
      description: 'Resumen',
      quantity: 0,
      pvp: 0,
      pvp_total: summaryPVP,
      discount1: 0,
      discount2: 0,
      neto_total1: summaryNeto1,
      neto_total2: summaryNeto2,
    }

    const newItems = [...items]
    const insertIndex = getInsertIndex(newItems)
    newItems.splice(insertIndex, 0, summaryItem)
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index)
      setItems(recalculateSummaries(newItems))
    }
  }

  // Drag & drop state
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = dragIndexRef.current
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragOverIndex(null)
      return
    }
    const newItems = [...items]
    const [dragged] = newItems.splice(dragIndex, 1)
    newItems.splice(dropIndex, 0, dragged)
    setItems(recalculateSummaries(newItems))
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  // Totals: exclude summary rows from global totals
  const totalAmount = items.reduce((sum, item) => item.type !== 'summary' ? sum + (item.neto_total2 || 0) : sum, 0)
  const totalPVP = items.reduce((sum, item) => item.type !== 'summary' ? sum + (item.pvp_total || 0) : sum, 0)
  const totalNeto = items.reduce((sum, item) => item.type !== 'summary' ? sum + (item.neto_total2 || 0) : sum, 0)

  // Calculate warnings for articles
  const articlesWithoutCost = items.filter(item =>
    item.type === 'article' && item.product_id && (item.pvp === undefined || item.pvp === 0 || item.pvp === null)
  )
  const articlesWithoutDiscount = items.filter(item =>
    item.type === 'article' && item.product_id && (item.discount1 === undefined || item.discount1 === null)
  )

  const needsValidation = items.some(item => {
    if (item.type !== 'article' || !item.product_id) return false;
    const product = products.find(p => String(p.id) === String(item.product_id));
    if (!product) return false;

    let maxDiscount = 0;
    if (currentCustomer) {
      if (product.familia === 'SISTEMAS' || product.familia === 'VMC') maxDiscount = currentCustomer.descuento_sistemas || 0;
      else if (product.familia === 'DIFUSIÓN') maxDiscount = currentCustomer.descuento_difusion || 0;
      else if (product.familia === 'HERRAMIENTA' || product.familia === 'MYSAir' || product.familia === 'AGFRI') maxDiscount = currentCustomer.descuento_agfri || 0;
    }

    if (maxDiscount === 0) return false;

    const totalDiscount = (1 - (1 - (item.discount1 || 0) / 100) * (1 - (item.discount2 || 0) / 100)) * 100;
    return totalDiscount > maxDiscount + 0.01;
  });

  // isPendingValidation logic:
  // - If discounts are within limits → never pending
  // - If discounts exceed limits AND the offer has NOT been validated → pending
  // - If discounts exceed limits AND the offer WAS validated BUT user has since changed discount fields → pending again
  const isPendingValidation = needsValidation && (!isValidated || userHasModifiedDiscounts);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      // Handle free-text customer
      let customerId: number | null = null
      let customerName: string | null = null

      if (formData.customer_id) {
        const customerIdStr = String(formData.customer_id)

        if (customerIdStr.startsWith('free:')) {
          // Extract the free-text customer name
          customerName = customerIdStr.substring(5)

          // Try to find or create a customer with this name
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('company_name', customerName)
            .single()

          if (existingCustomer) {
            customerId = existingCustomer.id
          } else {
            // Create a new customer with the free-text name
            const { data: newCustomer, error: createError } = await supabase
              .from('customers')
              .insert({
                company_name: customerName,
                created_by: currentUserId,
              })
              .select('id')
              .single()

            if (createError) {
              throw createError
            }
            customerId = newCustomer.id
          }
        } else {
          customerId = parseInt(customerIdStr)
        }
      }

      const offerData: Record<string, any> = {
        title: formData.title,
        description: formData.description,
        notas_internas: formData.notas_internas,
        customer_id: customerId,
        contact_id: formData.contact_id ? parseInt(String(formData.contact_id)) : null,
        tarifa_id: formData.tarifa_id ? parseInt(String(formData.tarifa_id)) : null,
        status: formData.status,
        valid_until: formData.valid_until || null,
        // is_validated can ONLY be set to true by an admin from the validations panel.
        // When saving, we only reset it to false if the offer now requires validation.
        // If no validation is needed, we leave the existing is_validated value untouched.
        ...(isPendingValidation ? { is_validated: false, validation_required_at: new Date().toISOString() } : {}),
      }

      let offerId: string | null = (offer?.id || savedOfferId)?.toString() || null

      if (offer || savedOfferId) {
        // Update existing offer
        const { error: updateError } = await supabase
          .from('offers')
          .update({
            ...offerData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', offer?.id || savedOfferId)

        if (updateError) throw updateError

        // Update offer items if they exist
        if (items.length > 0) {
          // Delete existing items first
          const { error: deleteError } = await supabase
            .from('offer_items')
            .delete()
            .eq('offer_id', offer?.id || savedOfferId)

          if (deleteError) throw deleteError

          // Insert new items
          const itemsToInsert = items
            .filter(item =>
              item.type === 'section_header' ||
              item.type === 'note' ||
              item.type === 'summary' ||
              (item.type === 'article' && (item.product_id || item.description)) ||
              (item.type === 'external' && (item.external_ref || item.description))
            )
            .map(item => ({
              offer_id: offerId,
              type: item.type,
              product_id: item.product_id ? Number(item.product_id) : null,
              external_ref: item.type === 'external' ? (item.external_ref || null) : (item.custom_ref || null),
              description: item.description || null,
              quantity: item.type === 'summary' ? 0 : (parseInt(String(item.quantity)) || 0),
              pvp: parseFloat(String(item.pvp)) || 0,
              pvp_total: parseFloat(String(item.pvp_total)) || 0,
              discount1: parseFloat(String(item.discount1)) || 0,
              discount2: parseFloat(String(item.discount2)) || 0,
              neto_total1: parseFloat(String(item.neto_total1)) || 0,
              neto_total2: parseFloat(String(item.neto_total2)) || 0,
              is_pvp_modified: item.is_pvp_modified || false,
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
          .single()

        if (insertError) throw insertError
        if (!newOfferData) throw new Error('Failed to create offer')

        offerId = newOfferData.id.toString()
        setSavedOfferNumber(newOfferData.offer_number)

        // Insert offer items
        if (items.length > 0) {
          const itemsToInsert = items
            .filter(item =>
              item.type === 'section_header' ||
              item.type === 'note' ||
              item.type === 'summary' ||
              (item.type === 'article' && (item.product_id || item.description)) ||
              (item.type === 'external' && (item.external_ref || item.description))
            )
            .map(item => ({
              offer_id: offerId,
              type: item.type,
              product_id: item.product_id ? Number(item.product_id) : null,
              external_ref: item.type === 'external' ? (item.external_ref || null) : (item.custom_ref || null),
              description: item.description || null,
              quantity: item.type === 'summary' ? 0 : (parseInt(String(item.quantity)) || 0),
              pvp: parseFloat(String(item.pvp)) || 0,
              pvp_total: parseFloat(String(item.pvp_total)) || 0,
              discount1: parseFloat(String(item.discount1)) || 0,
              discount2: parseFloat(String(item.discount2)) || 0,
              neto_total1: parseFloat(String(item.neto_total1)) || 0,
              neto_total2: parseFloat(String(item.neto_total2)) || 0,
              is_pvp_modified: item.is_pvp_modified || false,
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
      if (offerId) {
        // Delete existing assignments first (always, to support clearing all)
        const { error: deleteError } = await supabase
          .from('offer_assignments')
          .delete()
          .eq('offer_id', offerId)

        if (deleteError) throw deleteError

        // Insert new assignments only if any
        if (assignedUserIds.length > 0) {
          const assignmentsToInsert = assignedUserIds.map(userId => ({
            offer_id: offerId,
            user_id: userId,
          }))

          const { error: insertError } = await supabase
            .from('offer_assignments')
            .insert(assignmentsToInsert)

          if (insertError) throw insertError

          // Send notifications to new assignees (that were not in initially)
          const newAssignees = assignedUserIds.filter((uid) => uid !== currentUserId && !initialAssignedUserIds.includes(uid));
          if (newAssignees.length > 0) {
            const formattedOfferNumber = formatOfferNumber(savedOfferNumber || offer?.offer_number || 0)
            const notificationsToInsert = newAssignees.map(userId => ({
              user_id: userId,
              type: 'offer_assigned' as any,
              title: 'Oferta asignada',
              content: `${currentUserName || createdByName || 'Un usuario'} te ha asignado la oferta ${formattedOfferNumber}. Pulsa para ver`,
              link: `/dashboard/offers/${offerId}`,
              is_read: false
            }))
            
            await supabase.from('notifications').insert(notificationsToInsert)
          }
        }
      }

      // Send notifications to all admins if validation requested
      if (isPendingValidation && offerId) {
        const formattedOfferNumber = formatOfferNumber(savedOfferNumber || offer?.offer_number || 0)
        const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
        
        if (admins && admins.length > 0) {
          const notificationsToInsert = admins
            .filter(admin => admin.id !== currentUserId) // Don't notify the requestor
            .map(admin => ({
              user_id: admin.id,
              type: 'validation_requested' as any,
              title: 'Validación requerida',
              content: `${currentUserName || createdByName || 'Un usuario'} solicita validación para la oferta con nº ${formattedOfferNumber}. Pulsa para ver`,
              link: '/dashboard/validations',
              is_read: false
            }))
          
          if (notificationsToInsert.length > 0) {
            await supabase.from('notifications').insert(notificationsToInsert)
          }
        }
      }

      // Update state of initial assignments after successful save 
      setInitialAssignedUserIds(assignedUserIds)

      // Show success message
      setSuccess(true)
      setError(null)
      setSavedOfferId(offerId)
      setUnsavedChanges(false)
      setUserHasModifiedDiscounts(false) // New line added
      setLoading(false)

      // Refresh the page data to get the latest status from DB
      router.refresh()

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

  const handleDeleteOffer = async () => {
    const offerIdToDelete = offer?.id || savedOfferId
    if (!offerIdToDelete) return
    
    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('offers')
        .update({ visible: false })
        .eq('id', offerIdToDelete)
        
      if (error) throw error
      
      router.push('/dashboard/offers')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la oferta')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isViewer && (
          <Alert className="bg-blue-50 border-blue-200">
            <Eye className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-xs">
              Usted tiene el rol de <strong>Visualizador</strong>. Esta pantalla es de solo lectura y no se pueden realizar cambios.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">
              {(offer || savedOfferId) ? 'Oferta guardada correctamente' : 'Oferta creada correctamente'}
            </AlertDescription>
          </Alert>
        )}

        {isPendingValidation && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta oferta incluye descuentos superiores a los permitidos para el cliente. Un administrador debe validarla antes de poder generar el PDF.
            </AlertDescription>
          </Alert>
        )}

        {/* Detalles de la Oferta — 4 filas x 4 columnas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

          {/* ── Fila 1: Nº Oferta | — | — | Tarifa ��─ */}
          <div className="space-y-0.5">
            <Label className="text-xs">Nº Oferta</Label>
            <div className="flex items-center gap-1">
              <div className="flex-1 h-9 px-3 py-2 bg-muted rounded-md border border-input flex items-center text-sm font-medium justify-center">
                {savedOfferNumber || offer?.offer_number
                  ? formatOfferNumber(offer?.offer_number || savedOfferNumber || 0, new Date(offer?.created_at || new Date()).getFullYear())
                  : nextOfferNumber
                    ? formatOfferNumber(nextOfferNumber, new Date().getFullYear())
                    : 'Calculando...'}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => previousOfferId && handleNavigation(`/dashboard/offers/${previousOfferId}/edit`)}
                disabled={!previousOfferId || loading}
                className="h-9 w-9 p-0"
                title="Oferta anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => nextOfferId && handleNavigation(`/dashboard/offers/${nextOfferId}/edit`)}
                disabled={!nextOfferId || loading}
                className="h-9 w-9 p-0"
                title="Oferta siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Espacio vacío para mantener el grid simétrico */}
          <div className="hidden md:block"></div>

          {/* Creada por */}
          <div className="space-y-0.5">
            <Label className="text-xs">Creada por</Label>
            <Input
              type="text"
              value={createdByName || 'N/A'}
              readOnly
              disabled
              className="h-9 text-sm bg-muted"
            />
          </div>

          <div className="space-y-0.5">
            <Label htmlFor="tarifa_id" className="text-xs">Tarifa *</Label>
            <Select
              key={`tarifa-${formData.tarifa_id}-${tarifas.length}`}
              value={formData.tarifa_id?.toString() || ''}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, tarifa_id: parseInt(value) }))
                setUnsavedChanges(true)
              }}
              disabled={loading || isViewer}
            >
              <SelectTrigger id="tarifa_id" className="h-9 text-sm" disabled={loading || isViewer}>
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

          {/* ── Fila 2: Título (2 cols) | Estado+Validación (1 col) | Fecha Creación (1 col) ── */}
          <div className="space-y-0.5 md:col-span-2">
            <Label htmlFor="title" className="text-xs">Título Oferta *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value })
                setUnsavedChanges(true)
              }}
              required
              disabled={loading}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-0.5">
            <Label className="text-xs">Estado / Validación</Label>
            <div className="grid grid-cols-2 gap-1.5 items-end">
              <div className="w-full">
                <Select
                  value={formData.status}
                  onValueChange={(value) => {
                    setFormData({ ...formData, status: value as OfferStatus })
                    setUnsavedChanges(true)
                  }}
                  disabled={loading || isViewer}
                >
                  <SelectTrigger id="status" className="h-9 text-sm w-full" disabled={loading || isViewer}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="enviada">Enviada</SelectItem>
                    <SelectItem value="aceptada">Aceptada</SelectItem>
                    <SelectItem value="rechazada">Rechazada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={`h-9 w-full px-2 py-2 rounded-md border flex items-center justify-center text-[10px] font-medium leading-tight text-center ${!needsValidation ? 'bg-muted border-input text-muted-foreground' :
                (isPendingValidation ? 'bg-orange-100 border-orange-200 text-orange-800' : 'bg-green-100 border-green-200 text-green-800')
                }`}>
                {!needsValidation ? 'No requiere' : (isPendingValidation ? 'Pendiente' : 'Validada')}
              </div>
            </div>
          </div>

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

          {/* ── Fila 3: Cliente | Contacto | Descuentos ── */}
          <div className="space-y-0.5">
            <Label htmlFor="customer_id" className="text-xs">Cliente *</Label>
            <CustomerSearchInput
              value={formData.customer_id}
              customers={customers}
              onSelect={(customerId) => {
                // Keep free-text format as-is, only parse numbers
                const processedId = String(customerId).startsWith('free:') ? customerId : parseInt(String(customerId))
                setFormData(prev => ({ ...prev, customer_id: processedId }))
                setUnsavedChanges(true)
              }}
              disabled={loading || isViewer}
            />
          </div>

          <div className="space-y-0.5">
            <Label htmlFor="contact_id" className="text-xs">Contacto</Label>
            <Select
              value={formData.contact_id?.toString() || ''}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, contact_id: value ? parseInt(value) : null }))
                setUnsavedChanges(true)
              }}
              disabled={loading || isViewer || !formData.customer_id || contactList.length === 0}
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

          <div className="space-y-2">
            <Label className="text-xs">Descuentos (%)</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <Input
                  id="discount_sistemas"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={currentCustomer?.descuento_sistemas || ''}
                  readOnly
                  disabled
                  className="h-7 text-xs bg-muted text-center"
                  placeholder="0.00"
                />
                <Label htmlFor="discount_sistemas" className="text-xs text-center">Sist.</Label>
              </div>
              <div className="flex flex-col gap-1">
                <Input
                  id="discount_difusion"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={currentCustomer?.descuento_difusion || ''}
                  readOnly
                  disabled
                  className="h-7 text-xs bg-muted text-center"
                  placeholder="0.00"
                />
                <Label htmlFor="discount_difusion" className="text-xs text-center">Difus.</Label>
              </div>
              <div className="flex flex-col gap-1">
                <Input
                  id="discount_agfri"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={currentCustomer?.descuento_agfri || ''}
                  readOnly
                  disabled
                  className="h-7 text-xs bg-muted text-center"
                  placeholder="0.00"
                />
                <Label htmlFor="discount_agfri" className="text-xs text-center">Agfri</Label>
              </div>
            </div>
          </div>

          <div className="space-y-0.5">
            <Label htmlFor="valid_until" className="text-xs">Fecha Validez</Label>
            <Input
              id="valid_until"
              type="date"
              value={formData.valid_until}
              onChange={(e) => {
                setFormData({ ...formData, valid_until: e.target.value })
                setUnsavedChanges(true)
              }}
              disabled={loading || isViewer}
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
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value })
                setUnsavedChanges(true)
              }}
              rows={4}
              disabled={loading || isViewer}
              className="resize-none text-xs"
              placeholder="Descripción visible en la oferta"
            />
          </div>

          <div className="space-y-0.5">
            <Label htmlFor="notas_internas" className="text-xs">Notas Internas (Invisibles)</Label>
            <Textarea
              id="notas_internas"
              value={formData.notas_internas}
              onChange={(e) => {
                setFormData({ ...formData, notas_internas: e.target.value })
                setUnsavedChanges(true)
              }}
              rows={4}
              disabled={loading || isViewer}
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
                            disabled={loading || isViewer}
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
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <CalcularMedidasEspecialesDialog
                  tarifaId={formData.tarifa_id ? Number(formData.tarifa_id) : null}
                  onAddItem={(productId: string, quantity: number, customDescription?: string, customPrice?: number, customLongDescription?: string) => {
                    addItemByProductId(productId, quantity, customDescription, customPrice, customLongDescription)
                  }}
                />
              </div>
              
              <div className="h-4 w-px bg-border mx-1 hidden sm:block"></div>
              
              {!isViewer && (
                <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={loading} className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  Añadir Línea
                </Button>
              )}
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden flex flex-col">
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(2.5rem * 10 + 2.5rem)' }}>
              <table className="w-full text-xs" style={{ tableLayout: 'fixed', minWidth: '1200px' }}>
                <colgroup>
                  <col style={{ width: '1.5rem' }} />
                  <col style={{ width: '225px' }} />
                  <col style={{ width: '350px' }} />
                  <col style={{ width: '6rem' }} />
                  <col style={{ width: '7rem' }} />
                  <col style={{ width: '7rem' }} />
                  <col style={{ width: '7rem' }} />
                  <col style={{ width: '7rem' }} />
                  <col style={{ width: '8rem' }} />
                  <col style={{ width: '8rem' }} />
                  <col style={{ width: '3rem' }} />
                </colgroup>
                <thead className="bg-muted/50 sticky top-0 z-20">
                  <tr className="bg-muted/50">
                    <th className="px-1 py-2 h-9 sticky left-0 z-30 bg-muted/50 border-r border-border/50"></th>
                    <th className="px-2 py-2 h-9 text-left font-medium text-xs sticky left-6 z-30 bg-muted/50 border-r border-border/50">Artículo</th>
                    <th className="px-2 py-2 h-9 text-left font-medium text-xs">Descripción</th>
                    <th className="px-2 py-2 h-9 text-right font-medium text-xs">Cantidad</th>
                    <th className="px-2 py-2 h-9 text-right font-medium text-xs">PVP</th>
                    <th className="px-2 py-2 h-9 text-right font-medium text-xs">PVP Total</th>
                    <th className="px-2 py-2 h-9 text-right font-medium text-xs">Desc. 1 (%)</th>
                    <th className="px-2 py-2 h-9 text-right font-medium text-xs">Desc. 2 (%)</th>
                    <th className="px-2 py-2 h-9 text-right font-medium text-xs">Neto Total 1</th>
                    <th className="px-2 py-2 h-9 text-right font-medium text-xs">Neto Total 2</th>
                    <th className="px-2 py-2 h-9 text-center font-medium text-xs"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const isDragOver = dragOverIndex === index
                    const dragRowClass = isDragOver ? 'outline outline-2 outline-primary outline-offset-[-2px]' : ''
                    if (item.type === 'section_header') {
                      return (
                        <tr key={item.id}
                          className={`border-t border-border bg-[#1a2e4a] ${dragRowClass}`}
                          onDragOver={(e) => !isViewer && handleDragOver(e, index)}
                          onDrop={(e) => !isViewer && handleDrop(e, index)}
                        >
                          <td className={`px-1 py-1 w-6 sticky left-0 z-10 bg-[#1a2e4a] border-r border-white/10 ${!isViewer ? 'cursor-grab active:cursor-grabbing' : ''} select-none`}
                            draggable={!isViewer}
                            onDragStart={() => !isViewer && handleDragStart(index)}
                            onDragEnd={handleDragEnd}
                          >
                            {!isViewer && <GripVertical className="w-3.5 h-3.5 text-white/50 hover:text-white" />}
                          </td>
                          <td colSpan={9} className="px-2 py-2 sticky left-6 z-10 bg-[#1a2e4a] border-r border-white/10">
                            <Input
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              placeholder="Título de sección"
                              className="h-7 text-xs font-semibold bg-[#1a2e4a] text-white placeholder:text-white/50 border-white/20"
                              disabled={loading || isViewer}
                            />
                          </td>
                          <td className="px-2 py-1 text-center">
                            {!isViewer && (
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
                    }

                    // Note Row
                    if (item.type === 'note') {
                      return (
                        <tr key={item.id}
                          className={`border-t border-border bg-yellow-100 ${dragRowClass}`}
                          onDragOver={(e) => !isViewer && handleDragOver(e, index)}
                          onDrop={(e) => !isViewer && handleDrop(e, index)}
                        >
                          <td className={`px-1 py-1 w-6 sticky left-0 z-10 bg-yellow-100 border-r border-yellow-200 ${!isViewer ? 'cursor-grab active:cursor-grabbing' : ''} select-none`}
                            draggable={!isViewer}
                            onDragStart={() => !isViewer && handleDragStart(index)}
                            onDragEnd={handleDragEnd}
                          >
                            {!isViewer && <GripVertical className="w-3.5 h-3.5 text-yellow-700/50 hover:text-yellow-700" />}
                          </td>
                          <td colSpan={9} className="px-2 py-2 sticky left-6 z-10 bg-yellow-100 border-r border-yellow-200">
                            <Input
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              placeholder="Anotación"
                              className="h-7 text-xs italic bg-yellow-100 text-yellow-900 placeholder:text-yellow-700/60 border-yellow-300"
                              disabled={loading || isViewer}
                            />
                          </td>
                          <td className="px-2 py-1 text-center">
                            {!isViewer && (
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
                    }

                    // Summary Row
                    if (item.type === 'summary') {
                      return (
                        <tr key={item.id}
                          className={`border-t-2 border-border bg-[#1a2e4a] font-semibold ${dragRowClass}`}
                          onDragOver={(e) => !isViewer && handleDragOver(e, index)}
                          onDrop={(e) => !isViewer && handleDrop(e, index)}
                        >
                          <td className={`px-1 py-1 w-6 sticky left-0 z-10 bg-[#1a2e4a] border-r border-white/10 ${!isViewer ? 'cursor-grab active:cursor-grabbing' : ''} select-none`}
                            draggable={!isViewer}
                            onDragStart={() => !isViewer && handleDragStart(index)}
                            onDragEnd={handleDragEnd}
                          >
                            {!isViewer && <GripVertical className="w-3.5 h-3.5 text-white/50 hover:text-white" />}
                          </td>
                          <td colSpan={4} className="px-2 py-1.5 text-xs text-white italic sticky left-6 z-10 bg-[#1a2e4a] border-r border-white/10">
                            {item.description || 'Resumen'}
                          </td>
                          <td className="px-2 py-1.5 text-right text-xs text-white">
                            {formatNumber(item.pvp_total)}
                          </td>
                          <td colSpan={2} className="px-2 py-1.5"></td>
                          <td className="px-2 py-1.5 text-right text-xs text-white">
                            {formatNumber(item.neto_total1)}
                          </td>
                          <td className="px-2 py-1.5 text-right text-xs text-white font-bold">
                            {formatNumber(item.neto_total2)}
                          </td>
                          <td className="px-2 py-1 text-center">
                            {!isViewer && (
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
                    }

                    // External Article Row — free-text reference, no product lookup
                    if (item.type === 'external') {
                      return (
                        <tr key={item.id}
                          className={`border-t border-border hover:bg-muted/20 ${dragRowClass}`}
                          onDragOver={(e) => !isViewer && handleDragOver(e, index)}
                          onDrop={(e) => !isViewer && handleDrop(e, index)}
                        >
                          <td className={`px-1 py-1 w-6 sticky left-0 z-10 bg-background border-r border-border/50 ${!isViewer ? 'cursor-grab active:cursor-grabbing' : ''} select-none`}
                            draggable={!isViewer}
                            onDragStart={() => !isViewer && handleDragStart(index)}
                            onDragEnd={handleDragEnd}
                          >
                            {!isViewer && <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-muted-foreground" />}
                          </td>
                          <td className="px-2 py-1 sticky left-6 z-10 bg-background border-r border-border/50">
                            <div className="relative">
                              <Input
                                value={item.external_ref ?? ''}
                                onChange={(e) => handleItemChange(index, 'external_ref', e.target.value)}
                                placeholder="Referencia libre"
                                className="h-7 text-xs font-medium pr-6 bg-blue-50/50 border-blue-200 focus-visible:ring-blue-500"
                                disabled={loading || isViewer}
                              />
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2" title="Referencia fuera de tarifa. Revisar PVP y descuento">
                                <FileText className="w-3 h-3 text-blue-600" />
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              placeholder="Descripción"
                              className="h-7 text-xs"
                              disabled={loading || isViewer}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={item.quantity || ''}
                              onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                              onWheel={(e) => e.currentTarget.blur()}
                              className="h-7 text-xs text-right"
                              disabled={loading || isViewer}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.pvp || ''}
                              onChange={(e) => handleItemChange(index, 'pvp', Number(e.target.value))}
                              onWheel={(e) => e.currentTarget.blur()}
                              className={`h-7 text-xs text-right ${item.is_pvp_modified ? 'bg-blue-50/50 border-blue-200 focus-visible:ring-blue-500' : ''}`}
                              disabled={loading || isViewer}
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
                              value={item.discount1 !== undefined && item.discount1 !== null ? item.discount1 : ''}
                              onChange={(e) => handleItemChange(index, 'discount1', Number(e.target.value))}
                              onWheel={(e) => e.currentTarget.blur()}
                              className="h-7 text-xs text-right"
                              disabled={loading || isViewer}
                              placeholder="-"
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
                              onWheel={(e) => e.currentTarget.blur()}
                              className="h-7 text-xs text-right"
                              disabled={loading || isViewer}
                              placeholder="-"
                            />
                          </td>
                          <td className="px-2 py-1 text-right font-medium text-xs">
                            {item.neto_total1 > 0 ? formatNumber(item.neto_total1) : '-'}
                          </td>
                          <td className="px-2 py-1 text-right font-semibold text-xs text-primary">
                            {item.neto_total2 > 0 ? formatNumber(item.neto_total2) : '-'}
                          </td>
                          <td className="px-2 py-1 text-center">
                            {!isViewer && (
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
                    }

                    // Article Row (regular)
                    return (
                      <tr key={item.id}
                        className={`border-t border-border hover:bg-muted/20 ${dragOverIndex === index ? 'outline outline-2 outline-primary outline-offset-[-2px]' : ''}`}
                        onDragOver={(e) => !isViewer && handleDragOver(e, index)}
                        onDrop={(e) => !isViewer && handleDrop(e, index)}
                      >
                        <td className={`px-1 py-1 w-6 sticky left-0 z-10 bg-background border-r border-border/50 ${!isViewer ? 'cursor-grab active:cursor-grabbing' : ''} select-none`}
                          draggable={!isViewer}
                          onDragStart={() => !isViewer && handleDragStart(index)}
                          onDragEnd={handleDragEnd}
                        >
                          {!isViewer && <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-muted-foreground" />}
                        </td>
                        <td className="px-2 py-1 sticky left-6 z-10 bg-background border-r border-border/50">
                          {item.custom_ref || (item.type === 'article' && item.external_ref) ? (
                            <div className="relative">
                              <div className="h-7 px-2 flex items-center text-xs font-medium pr-6 bg-blue-50/50 border border-blue-200 rounded-md truncate text-foreground" title={item.custom_ref || item.external_ref}>
                                {item.custom_ref || item.external_ref}
                              </div>
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2" title="Artículo de medida especial o con referencia personalizada">
                                <FileText className="w-3 h-3 text-blue-600" />
                              </div>
                            </div>
                          ) : (
                            <ProductSearchInput
                              value={item.product_id || ''}
                              products={products}
                              onSelect={(productId) => handleProductSelect(index, productId)}
                              disabled={loading || isViewer}
                            />
                          )}
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Descripción"
                            className="h-7 text-xs"
                            disabled={loading || isViewer}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={item.quantity || ''}
                            onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="h-7 text-xs text-right"
                            disabled={loading || isViewer}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.pvp || ''}
                            onChange={(e) => handleItemChange(index, 'pvp', Number(e.target.value))}
                            onWheel={(e) => e.currentTarget.blur()}
                            className={`h-7 text-xs text-right ${item.is_pvp_modified ? 'bg-blue-50/50 border-blue-200 focus-visible:ring-blue-500' : ''}`}
                            disabled={loading || isViewer}
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
                            onWheel={(e) => e.currentTarget.blur()}
                            className="h-7 text-xs text-right"
                            disabled={loading || isViewer}
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
                            onWheel={(e) => e.currentTarget.blur()}
                            className="h-7 text-xs text-right"
                            disabled={loading || isViewer}
                          />
                        </td>
                        <td className="px-2 py-1 text-right font-medium text-xs">
                          {item.pvp > 0 ? formatNumber(item.neto_total1) : '-'}
                        </td>
                        <td className="px-2 py-1 text-right font-medium text-primary text-xs">
                          {item.pvp > 0 ? formatNumber(item.neto_total2) : '-'}
                        </td>
                        <td className="px-2 py-1 text-center">
                          {!isViewer && items.length > 1 && (
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
              </table>
            </div>
            <table className="w-full text-xs table-fixed border-t border-border">
              <tfoot className="bg-muted/30">
                <tr>
                  <td colSpan={7}></td>
                  <td className="px-2 py-1 text-right font-semibold text-xs">
                    Total PVP: <span className="font-bold text-sm">{formatNumber(totalPVP)}</span>
                  </td>
                  <td className="px-2 py-1 text-right font-semibold text-xs">
                    Total NETO: <span className="font-bold text-sm text-primary">{formatNumber(totalNeto)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Warnings for articles */}
          <div className="space-y-2 mt-3">
            {articlesWithoutCost.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <span className="font-semibold">{articlesWithoutCost.length} artículo(s) sin coste</span> - Añade un precio PVP a los artículos para calcular totales correctamente
                </div>
              </div>
            )}
            {articlesWithoutDiscount.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-orange-800">
                  <span className="font-semibold">{articlesWithoutDiscount.length} artículo(s) sin descuento</span> - Estos artículos no tienen descuento aplicado
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-1 justify-start py-3 border-b border-border">
            {!isViewer && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={addSectionHeader} disabled={loading} className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  Añadir Título
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addNote} disabled={loading} className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  Añadir Anotación
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addSummary} disabled={loading} className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  Añadir Resumen
                </Button>
                {/* Import/Export buttons */}
                {(offer?.id || savedOfferId) && (
                  <>
                    <ImportItemsDialog offerId={(offer?.id || savedOfferId)!.toString()} onSuccess={() => loadOfferItems()} />
                    <ExportItemsExcelButton
                      items={items}
                      products={products}
                      offerNumber={offer?.offer_number || 0}
                      customerName={(offer as any)?.customer?.company_name || currentCustomer?.company_name}
                      disabled={loading || items.length === 0}
                    />
                  </>
                )}
              </>
            )}
            {!isViewer && (
              <CalcularLarguerosDialog
                items={items.filter(i => i.type === 'article' && i.product_id).map(i => {
                  const product = products.find(p => p.id === i.product_id)
                  return {
                    product_id: i.product_id || '',
                    quantity: i.quantity || 1,
                    product: product ? {
                      referencia: product.referencia || '',
                      descripcion: product.descripcion || '',
                      larguero_largo: product.larguero_largo || null,
                      larguero_alto: product.larguero_alto || null,
                    } : undefined,
                  }
                })}
                onAddItem={addItemByProductId}
              />
            )}
          </div>
        </div>

        <div className="flex justify-between gap-2">
          <div className="flex gap-2">
            {!isViewer && (
              <Button
                type="button"
                variant="default"
                onClick={() => handleNavigation('/dashboard/offers/new')}
                disabled={loading}
                className="h-8 text-xs"
              >
                <Plus className="mr-2 h-3 w-3" />
                Nueva Oferta
              </Button>
            )}
            {!isViewer && (
              <DuplicateOfferButton
                offerId={savedOfferId ?? ''}
                variant="outline"
                size="sm"
                showLabel={true}
                disabled={!savedOfferId && !offer?.id}
              />
            )}
            {!isViewer && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading || isDeleting || (!offer?.id && !savedOfferId)}
                className="h-8 text-xs"
              >
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="mr-2 h-3 w-3" />}
                Eliminar
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (savedOfferId || offer?.id) {
                  router.push(`/dashboard/offers/${savedOfferId || offer?.id}`)
                } else {
                  callbackRef.current = () => router.push(`/dashboard/offers/${savedOfferId}`)
                  const form = document.querySelector('form') as HTMLFormElement | null
                  if (form) form.requestSubmit()
                }
              }}
              disabled={loading}
              className="h-8 text-xs"
              title={!savedOfferId && !offer?.id ? 'Guarda la oferta primero para poder verla' : undefined}
            >
              <Eye className="mr-2 h-3 w-3" />
              Ver
            </Button>
            <GeneratePdfButton
              offerId={savedOfferId || offer?.id?.toString() || ''}
              offerNumber={savedOfferNumber || offer?.offer_number || 0}
              customerName={(offer as any)?.customer?.company_name || currentCustomer?.company_name}
              offerTitle={formData.title || offer?.title}
              disabled={isPendingValidation}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => handleNavigation('/dashboard/offers')} disabled={loading} className="h-8 text-xs">
              {isViewer ? 'Cerrar' : (loading ? 'Guardando...' : 'Atrás')}
            </Button>
            {!isViewer && (
              <Button type="submit" disabled={loading || !unsavedChanges} className="h-8 text-xs" data-save-button>
                {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                {(offer || savedOfferId) ? 'Actualizar Oferta' : 'Guardar'}
              </Button>
            )}
          </div>
        </div>
      </form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar oferta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará de la lista la oferta <strong>&ldquo;{offer?.title || formData.title}&rdquo;</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOffer}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar en esta oferta. ¿Qué deseas hacer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleExitWithoutSave}>
              Salir sin guardar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndExit}>
              Guardar y salir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
