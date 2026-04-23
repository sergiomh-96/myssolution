'use client'

import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Loader2, 
  Search,
  Check,
  X,
  Eye,
  Copy,
  FileText,
  FileDown
} from 'lucide-react'
import { toast } from 'sonner'
import type { SupportAssistance, SupportAssistanceItem, UserRole } from '@/lib/types/database'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface AssistanceFormProps {
  assistance?: SupportAssistance & { items: SupportAssistanceItem[] }
  currentUserId: string
  currentUserRole: UserRole
  customers: { id: number; company_name: string; id_erp?: number }[]
  employees: { id: string; full_name: string | null }[]
  currentUserName: string
}

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
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<typeof customers[0] | null>(null)

  // Update selected customer when value changes
  useEffect(() => {
    const valueStr = String(value || '')
    if (!valueStr) {
      setSelectedCustomer(null)
      return
    }

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
          <div className="flex-1 h-9 px-3 py-2 border border-input rounded-md bg-background text-sm truncate">
            {selectedCustomer.company_name}
          </div>
          {!String(selectedCustomer.id).startsWith('free:') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => router.push(`/dashboard/customers/${selectedCustomer.id}/edit`)}
              title="Ver ficha cliente"
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
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
            <div className="absolute top-full left-0 right-0 mt-1 border border-input rounded-md bg-background shadow-lg z-50">
              {filteredCustomers.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto p-1">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleCustomerSelect(customer)}
                      className="w-full text-left px-3 py-2 hover:bg-accent rounded-sm text-sm transition-colors"
                    >
                      {customer.company_name}
                    </button>
                  ))}
                </div>
              )}
              {filteredCustomers.length === 0 && (
                <button
                  type="button"
                  onClick={handleFreeText}
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm text-primary font-medium"
                >
                  Usar "{searchTerm}" como cliente libre
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DistributorSearchInput({
  value,
  customers,
  onSelect,
  disabled,
}: {
  value: string
  customers: Array<{ id: string | number; company_name: string }>
  onSelect: (name: string) => void
  disabled?: boolean
}) {
  const [searchTerm, setSearchTerm] = useState(value)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setSearchTerm(value)
  }, [value])

  const filteredCustomers = searchTerm.trim()
    ? customers.filter(c =>
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10)
    : []

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder="Buscar distribuidor..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          onSelect(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        className="h-9 shadow-sm"
        disabled={disabled}
      />
      {isOpen && filteredCustomers.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 border border-input rounded-md bg-background shadow-lg z-50 max-h-[200px] overflow-y-auto p-1">
          {filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => {
                onSelect(customer.company_name)
                setSearchTerm(customer.company_name)
                setIsOpen(false)
              }}
              className="w-full text-left px-3 py-2 hover:bg-accent rounded-sm text-sm transition-colors"
            >
              {customer.company_name}
            </button>
          ))}
        </div>
      )}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)} 
        />
      )}
    </div>
  )
}

function ContactSearchInput({
  value,
  contacts,
  onSelect,
  onPhoneSelect,
  onEmailSelect,
  disabled,
}: {
  value: string
  contacts: Array<{ id: number; nombre: string; apellidos: string | null; telefono?: string | null; email?: string | null }>
  onSelect: (contactName: string) => void
  onPhoneSelect?: (phone: string) => void
  onEmailSelect?: (email: string) => void
  disabled?: boolean
}) {
  const [searchTerm, setSearchTerm] = useState(value)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setSearchTerm(value)
  }, [value])

  const filteredContacts = searchTerm.trim()
    ? contacts.filter(c => {
        const full = `${c.nombre} ${c.apellidos || ''}`.toLowerCase()
        return full.includes(searchTerm.toLowerCase())
      })
    : contacts

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder="Nombre del contacto..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          onSelect(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        className="h-9 shadow-sm"
        disabled={disabled}
      />
      {isOpen && filteredContacts.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 border border-input rounded-md bg-background shadow-lg z-50 max-h-[200px] overflow-y-auto p-1">
          {filteredContacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => {
                const fullName = `${contact.nombre} ${contact.apellidos || ''}`.trim()
                onSelect(fullName)
                if (onPhoneSelect && contact.telefono) onPhoneSelect(contact.telefono)
                if (onEmailSelect && contact.email) onEmailSelect(contact.email)
                setSearchTerm(fullName)
                setIsOpen(false)
              }}
              className="w-full text-left px-3 py-2 hover:bg-accent rounded-sm text-sm transition-colors"
            >
              <div className="font-medium">{contact.nombre} {contact.apellidos}</div>
              <div className="text-[10px] text-muted-foreground flex flex-col">
                {contact.telefono && <span>📞 {contact.telefono}</span>}
                {contact.email && <span>📧 {contact.email}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)} 
        />
      )}
    </div>
  )
}

function SatSearchInput({
  value,
  sats,
  onSelect,
  disabled,
}: {
  value: string
  sats: Array<{ id: number; empresa_sat: string; nombre_tecnico: string | null; zona: string | null }>
  onSelect: (satName: string) => void
  disabled?: boolean
}) {
  const [searchTerm, setSearchTerm] = useState(value)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setSearchTerm(value)
  }, [value])

  const filteredSats = searchTerm.trim()
    ? sats.filter(s => s.empresa_sat.toLowerCase().includes(searchTerm.toLowerCase()))
    : sats

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder="Buscar SAT..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          onSelect(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        className="h-9 shadow-sm"
        disabled={disabled}
      />
      {isOpen && filteredSats.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 border border-input rounded-md bg-background shadow-lg z-50 max-h-[200px] overflow-y-auto p-1">
          {filteredSats.map((sat) => (
            <button
              key={sat.id}
              type="button"
              onClick={() => {
                onSelect(sat.empresa_sat)
                setSearchTerm(sat.empresa_sat)
                setIsOpen(false)
              }}
              className="w-full text-left px-3 py-2 hover:bg-accent rounded-sm text-sm transition-colors"
            >
              <div className="font-medium">{sat.empresa_sat}</div>
              {(sat.nombre_tecnico || sat.zona) && (
                <div className="text-[10px] text-muted-foreground flex gap-2">
                  {sat.nombre_tecnico && <span>Técnico: {sat.nombre_tecnico}</span>}
                  {sat.zona && <span>Zona: {sat.zona}</span>}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)} 
        />
      )}
    </div>
  )
}

function ProductReferenceSearch({
  value,
  products,
  onSelect,
  disabled,
}: {
  value: string
  products: any[]
  onSelect: (product: any) => void
  disabled?: boolean
}) {
  const [searchTerm, setSearchTerm] = useState(value)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setSearchTerm(value)
  }, [value])

  const filteredProducts = searchTerm.trim()
    ? products.filter(p => 
        p.referencia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.modelo_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const term = searchTerm.toLowerCase()
        
        // 1. Check priority by field matches
        const aRefMatch = a.referencia?.toLowerCase().includes(term)
        const bRefMatch = b.referencia?.toLowerCase().includes(term)
        if (aRefMatch && !bRefMatch) return -1
        if (!aRefMatch && bRefMatch) return 1

        const aModelMatch = a.modelo_nombre?.toLowerCase().includes(term)
        const bModelMatch = b.modelo_nombre?.toLowerCase().includes(term)
        if (aModelMatch && !bModelMatch) return -1
        if (!aModelMatch && bModelMatch) return 1

        const aDescMatch = a.descripcion?.toLowerCase().includes(term)
        const bDescMatch = b.descripcion?.toLowerCase().includes(term)
        if (aDescMatch && !bDescMatch) return -1
        if (!aDescMatch && bDescMatch) return 1

        // 2. If same priority, sort by reference length or alphabetical
        return (a.referencia || '').localeCompare(b.referencia || '')
      })
      .slice(0, 10)
    : []

  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setDropdownRect(inputRef.current.getBoundingClientRect())
    }
  }, [isOpen])

  // Update position on scroll/resize
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

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        placeholder="Buscar ref..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          onSelect({ referencia: e.target.value, is_manual: true })
          setIsOpen(true)
          if (inputRef.current) setDropdownRect(inputRef.current.getBoundingClientRect())
        }}
        onFocus={() => {
          setIsOpen(true)
          if (inputRef.current) setDropdownRect(inputRef.current.getBoundingClientRect())
        }}
        className="h-8 text-[11px] font-mono shadow-none border-transparent focus-visible:border-border focus-visible:bg-muted/20"
        disabled={disabled}
      />
      {isOpen && filteredProducts.length > 0 && dropdownRect && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div 
          style={{
            position: 'fixed',
            top: dropdownRect.bottom + 4,
            left: dropdownRect.left,
            width: dropdownRect.width,
            zIndex: 9999
          }}
          className="border border-input rounded-md bg-background shadow-lg z-50 max-h-[200px] overflow-y-auto p-1"
        >
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                onSelect(product)
                setSearchTerm(product.referencia)
                setIsOpen(false)
              }}
              className="w-full text-left px-3 py-2 hover:bg-accent rounded-sm text-sm transition-colors border-b last:border-0"
            >
              <div className="flex justify-between items-start">
                <div className="font-mono text-xs font-bold">{product.referencia}</div>
                {product.modelo_nombre && (
                  <div className="text-[10px] bg-primary/10 text-primary px-1 rounded font-medium">
                    {product.modelo_nombre}
                  </div>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">{product.descripcion}</div>
            </button>
          ))}
        </div>,
        document.body
      )}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)} 
        />
      )}
    </div>
  )
}

export function AssistanceForm({ 
  assistance, 
  currentUserId, 
  currentUserRole,
  customers,
  employees,
  currentUserName
}: AssistanceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Partial<SupportAssistanceItem>[]>(
    assistance?.items || [{ id: crypto.randomUUID(), cantidad: 1, en_garantia: false }]
  )
  const [availableContacts, setAvailableContacts] = useState<any[]>([])
  const [availableSats, setAvailableSats] = useState<any[]>([])
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [formData, setFormData] = useState<Partial<SupportAssistance> & { customer_id?: any }>({
    titulo: assistance?.titulo || '',
    customer_id: assistance?.customer_id || null,
    contacto_nombre: assistance?.contacto_nombre || '',
    contacto_telefono: assistance?.contacto_telefono || '',
    contacto_email: assistance?.contacto_email || '',
    tipo_cliente: assistance?.tipo_cliente || 'USUARIO FINAL',
    codigo_postal: assistance?.codigo_postal || '',
    ciudad: assistance?.ciudad || '',
    provincia: assistance?.provincia || '',
    direccion: assistance?.direccion || '',
    empleado_id: assistance?.empleado_id || currentUserId,
    fecha: (assistance?.created_at ? format(new Date(assistance.created_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')) as any,
    hora: (assistance?.created_at ? format(new Date(assistance.created_at), 'HH:mm') : format(new Date(), 'HH:mm')) as any,
    duracion_llamada: assistance?.duracion_llamada || 0,
    tipo_incidencia: assistance?.tipo_incidencia || 'INCIDENCIA TÉCNICA',
    estado: assistance?.estado || 'ABIERTA',
    subestado: assistance?.subestado || '',
    distribuidor: assistance?.distribuidor || '',
    sat: assistance?.sat || '',
    garantia: assistance?.garantia || false,
    rma_number: assistance?.rma_number || 0,
    incidencia_desc: assistance?.incidencia_desc || '',
    solucion_desc: assistance?.solucion_desc || '',
    comentarios_soporte: assistance?.comentarios_soporte || '',
    comentarios_admin: assistance?.comentarios_admin || '',
  })

  // Fetch contacts when customer changes
  useEffect(() => {
    const fetchContacts = async () => {
      if (!formData.customer_id || typeof formData.customer_id === 'string') {
        setAvailableContacts([])
        return
      }

      const supabase = createClient()
      const { data } = await supabase
        .from('clients_contacts')
        .select('id, nombre, apellidos, telefono, email')
        .eq('customer_id', formData.customer_id)
      
      setAvailableContacts(data || [])
    }

    fetchContacts()
  }, [formData.customer_id])

  // Fetch SATs on mount
  useEffect(() => {
    const fetchSats = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('sat_companies')
        .select('id, empresa_sat, nombre_tecnico, zona')
        .order('empresa_sat')
      
      setAvailableSats(data || [])
    }

    fetchSats()
  }, [])

  // Fetch products on mount (batch loading for all 28,000+ products)
  useEffect(() => {
    const loadProducts = async () => {
      const supabase = createClient()
      const BATCH = 1000
      const MAX_PRODUCTS = 50000

      try {
        // Fetch first batch and total count
        const { data: firstBatch, count, error: firstError } = await supabase
          .from('products')
          .select('id, referencia, descripcion, modelo_nombre', { count: 'exact' })
          .eq('status', 'active')
          .order('referencia')
          .range(0, BATCH - 1)

        if (firstError) throw firstError
        if (!firstBatch) return

        const total = count ?? BATCH
        const pages = Math.min(Math.ceil(total / BATCH), MAX_PRODUCTS / BATCH)

        if (pages <= 1) {
          setAvailableProducts(firstBatch)
          return
        }

        // Fetch remaining batches in parallel
        const remainingPromises = Array.from({ length: pages - 1 }, (_, i) =>
          supabase
            .from('products')
            .select('id, referencia, descripcion, modelo_nombre')
            .eq('status', 'active')
            .order('referencia')
            .range((i + 1) * BATCH, (i + 1) * BATCH + (BATCH - 1))
        )

        const results = await Promise.all(remainingPromises)
        const allProducts = [
          ...firstBatch,
          ...results.flatMap(res => res.data || [])
        ]

        setAvailableProducts(allProducts)
      } catch (err) {
        console.error('Error batch loading products:', err)
      }
    }

    loadProducts()
  }, [])

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), cantidad: 1, en_garantia: false, observacion: '' }])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, field: keyof SupportAssistanceItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      if (!formData.titulo?.trim()) {
        throw new Error('El título es obligatorio')
      }
      
      // Handle free-text customer like in OfferForm
      let customerId: number | null = null
      if (formData.customer_id) {
        const idStr = String(formData.customer_id)
        if (idStr.startsWith('free:')) {
          const customerName = idStr.substring(5)
          
          // Try to find existing
          const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('company_name', customerName)
            .maybeSingle()
          
          if (existing) {
            customerId = existing.id
          } else {
            // Create new
            const { data: newCust, error: custErr } = await supabase
              .from('customers')
              .insert({ company_name: customerName, created_by: currentUserId })
              .select('id')
              .single()
            if (custErr) throw custErr
            customerId = newCust.id
          }
        } else {
          const n = Number(formData.customer_id)
          customerId = (isNaN(n) || n === 0) ? null : n
        }
      }

      const payload: any = {
        titulo: formData.titulo,
        customer_id: customerId,
        contacto_nombre: formData.contacto_nombre,
        contacto_telefono: formData.contacto_telefono,
        contacto_email: formData.contacto_email,
        tipo_cliente: formData.tipo_cliente,
        codigo_postal: formData.codigo_postal,
        ciudad: formData.ciudad,
        provincia: formData.provincia,
        direccion: formData.direccion,
        empleado_id: formData.empleado_id,
        duracion_llamada: formData.duracion_llamada,
        tipo_incidencia: formData.tipo_incidencia,
        estado: formData.estado,
        subestado: formData.subestado === 'NINGUNA' ? '' : formData.subestado,
        distribuidor: formData.distribuidor,
        sat: formData.sat,
        garantia: formData.garantia,
        rma_number: formData.rma_number,
        incidencia_desc: formData.incidencia_desc,
        solucion_desc: formData.solucion_desc,
        comentarios_soporte: formData.comentarios_soporte,
        comentarios_admin: formData.comentarios_admin,
      }

      // Solo añadir created_by si es una inserción nueva
      if (!assistance?.id) {
        payload.created_by = currentUserId
      }

      if (customerId !== null && isNaN(customerId)) {
        throw new Error('El ID de cliente no es válido (NaN)')
      }

      let assistanceId = assistance?.id

      if (assistanceId) {
        // Update
        const { error } = await supabase
          .from('support_assistances')
          .update(payload)
          .eq('id', assistanceId)
        
        if (error) throw error
      } else {
        // Insert
        const { data, error } = await supabase
          .from('support_assistances')
          .insert([payload])
          .select('id')
        
        if (error) throw error
        
        if (!data || data.length === 0) {
          throw new Error('Error al crear: El registro se guardó pero no se pudo recuperar el ID (posible error de permisos RLS)')
        }
        
        assistanceId = data[0].id
      }

      // Sync items
      await supabase.from('support_assistance_items').delete().eq('assistance_id', assistanceId)
      const itemsToInsert = items
        .filter(item => item.referencia && item.referencia.trim() !== '')
        .map(item => ({
          assistance_id: assistanceId,
          marca: item.marca || null,
          referencia: item.referencia || null,
          cantidad: item.cantidad || 1,
          descripcion: item.descripcion || null,
          en_garantia: item.en_garantia || false,
          observacion: item.observacion ? item.observacion.substring(0, 140) : null,
        }))

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('support_assistance_items')
          .insert(itemsToInsert)
        if (itemsError) throw itemsError
      }

      toast.success(assistance ? 'Asistencia actualizada' : 'Asistencia registrada correctamente')
      router.push('/dashboard/requests')
      router.refresh()
    } catch (err: any) {
      console.group('Error al guardar asistencia')
      console.error('Tipo de error:', typeof err)
      console.error('Keys del error:', Object.keys(err || {}))
      console.error('Error objeto:', err)
      console.error('Mensaje (err.message):', err?.message)
      console.error('Detalles (err.details):', err?.details)
      console.error('Código (err.code):', err?.code)
      console.groupEnd()
      
      const errorMsg = err?.message || err?.details || 'Error desconocido'
      toast.error('Error al guardar: ' + errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const creatorName = employees.find(e => e.id === (assistance?.created_by || currentUserId))?.full_name || currentUserName || 'Desconocido'

  const handleDuplicate = async () => {
    if (!assistance?.id) return
    if (!confirm('¿Deseas duplicar esta asistencia? Se creará una nueva con los mismos datos.')) return
    
    setLoading(true)
    try {
      const supabase = createClient()
      
      // 1. Create new assistance record based on current formData
      const { data: newAssistance, error: assistanceError } = await supabase
        .from('support_assistances')
        .insert({
          ...formData,
          external_id: undefined, // Trigger will generate new one
          fecha: format(new Date(), 'yyyy-MM-dd'),
          hora: format(new Date(), 'HH:mm'),
          created_by: currentUserId,
          estado: 'ABIERTA'
        })
        .select()
        .single()
        
      if (assistanceError) throw assistanceError
      
      // 2. Clone items
      if (items.length > 0) {
        const itemsToInsert = items
          .filter(item => item.referencia || item.descripcion)
          .map(item => ({
            assistance_id: newAssistance.id,
            marca: item.marca,
            referencia: item.referencia,
            cantidad: item.cantidad,
            descripcion: item.descripcion,
            en_garantia: item.en_garantia,
            observacion: item.observacion
          }))
          
        if (itemsToInsert.length > 0) {
          const { error: itemsError } = await supabase
            .from('support_assistance_items')
            .insert(itemsToInsert)
          if (itemsError) throw itemsError
        }
      }
      
      toast.success('Asistencia duplicada correctamente')
      router.push(`/dashboard/requests/${newAssistance.id}`)
      router.refresh()
    } catch (err: any) {
      toast.error('Error al duplicar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!assistance?.id) return
    
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('support_assistances')
        .delete()
        .eq('id', assistance.id)
        
      if (error) throw error
      
      toast.success('Asistencia eliminada correctamente')
      router.push('/dashboard/requests')
      router.refresh()
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message)
    } finally {
      setLoading(false)
      setShowDeleteDialog(false)
    }
  }

  const handleGeneratePdf = () => {
    toast.info('Generación de PDF para asistencias estará disponible próximamente.')
    // Placeholder for future implementation:
    // window.open(`/api/requests/${assistance.id}/pdf`, '_blank')
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6 pb-8 max-w-[1700px] mx-auto">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight">
              {assistance ? `Asistencia ${assistance.external_id}` : 'Nueva Asistencia Técnica'}
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              {assistance ? 'Gestión de incidencia técnica' : 'Registro de nueva incidencia de cliente'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {assistance?.id && (
             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/requests/${assistance.id}`)}
                className="h-8 text-xs"
              >
                <Eye className="mr-2 h-3 w-3" />
                Ver
              </Button>
          )}
          <Button type="submit" disabled={loading} size="sm" className="gap-2 h-8 text-xs px-4">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {assistance ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1) SECCION DE DATOS */}
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
            <span className="w-6 h-px bg-primary/30" />
            1. Sección de Datos
          </h2>
          <Card className="shadow-sm border-border/80 bg-muted/10">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Row 1: ID, (Empty), Date/Time, Creator */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">1. Nº Incidencia</Label>
                  <Input 
                    value={assistance?.external_id || 'Autogenerado'} 
                    disabled 
                    className="h-9 bg-muted/50 font-mono text-xs"
                  />
                </div>
                
                {/* Empty column */}
                <div className="hidden lg:block" />

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">2. Fecha y Hora</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="date" 
                      value={formData.fecha || ''} 
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      className="h-9 text-[11px] shadow-sm flex-[2]"
                      disabled
                    />
                    <Input 
                      type="time" 
                      value={formData.hora || ''} 
                      onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                      className="h-9 text-[11px] shadow-sm flex-1"
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">3. Creada por</Label>
                  <Input 
                    value={creatorName} 
                    disabled 
                    className="h-9 bg-muted/50 text-xs"
                  />
                </div>

                {/* Row 2: Title (2 cols), Status/Substatus, Type */}
                <div className="lg:col-span-2 space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">4. Título de la Incidencia</Label>
                  <Input 
                    value={formData.titulo} 
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Ej: Problema conexión..."
                    required 
                    className="h-9 focus-visible:ring-primary shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">5. Tipo Incidencia</Label>
                  <Select 
                    value={formData.tipo_incidencia || ''} 
                    onValueChange={(v) => setFormData({ ...formData, tipo_incidencia: v })}
                  >
                    <SelectTrigger className="w-full h-9 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCIDENCIA TÉCNICA">INCIDENCIA TÉCNICA</SelectItem>
                      <SelectItem value="CONSULTA">CONSULTA</SelectItem>
                      <SelectItem value="INCIDENCIA ADMINISTRATIVA">INCIDENCIA ADMINISTRATIVA</SelectItem>
                      <SelectItem value="INCIDENCIA TRANSPORTE">INCIDENCIA TRANSPORTE</SelectItem>
                      <SelectItem value="PUESTA EN MARCHA">PUESTA EN MARCHA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">6. Estado</Label>
                  <Select 
                    value={formData.estado || ''} 
                    onValueChange={(v) => setFormData({ ...formData, estado: v })}
                  >
                    <SelectTrigger className={cn("h-9 font-bold shadow-sm w-full transition-colors", 
                      formData.estado === 'ABIERTA' ? "bg-warning text-warning-foreground border-warning" : "bg-success text-success-foreground border-success"
                    )}>
                      <SelectValue placeholder="Estado..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ABIERTA">ABIERTA</SelectItem>
                      <SelectItem value="CERRADA">CERRADA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Row 3: Empresa (Wait, not in list, adding it), Contact, CP, Prov */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">7. Empresa / Cliente</Label>
                  <CustomerSearchInput 
                    value={formData.customer_id}
                    customers={customers}
                    onSelect={(val) => setFormData({ ...formData, customer_id: val as any })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">8. Persona Contacto</Label>
                  <ContactSearchInput 
                    value={formData.contacto_nombre || ''}
                    contacts={availableContacts}
                    onSelect={(val) => setFormData(prev => ({ ...prev, contacto_nombre: val }))}
                    onPhoneSelect={(phone) => setFormData(prev => ({ ...prev, contacto_telefono: phone }))}
                    onEmailSelect={(email) => setFormData(prev => ({ ...prev, contacto_email: email }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">9a. Teléfono</Label>
                      <Input 
                        value={formData.contacto_telefono || ''} 
                        onChange={(e) => setFormData({ ...formData, contacto_telefono: e.target.value })}
                        className="h-9 shadow-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">9b. Email</Label>
                      <Input 
                        value={formData.contacto_email || ''} 
                        onChange={(e) => setFormData({ ...formData, contacto_email: e.target.value })}
                        className="h-9 shadow-sm"
                        placeholder="email@ejemplo.com"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">10. Subestado</Label>
                  <Select 
                    value={formData.subestado || ''} 
                    onValueChange={(v) => setFormData({ ...formData, subestado: v })}
                  >
                    <SelectTrigger className="h-9 text-sm shadow-sm w-full">
                      <SelectValue placeholder="Subestado..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NINGUNA">Ninguna</SelectItem>
                      <SelectItem value="CLIENTE FINAL NOS ENVIA MATERIAL">CLIENTE FINAL NOS ENVIA MATERIAL</SelectItem>
                      <SelectItem value="CURSADA RECOGIDA MATERIAL CLIENTE FINAL">CURSADA RECOGIDA MATERIAL CLIENTE FINAL</SelectItem>
                      <SelectItem value="CURSADA RECOGIDA MATERIAL DISTRIBUIDOR">CURSADA RECOGIDA MATERIAL DISTRIBUIDOR</SelectItem>
                      <SelectItem value="DERIVADA A COMERCIAL">DERIVADA A COMERCIAL</SelectItem>
                      <SelectItem value="DERIVADA A INGENIERIA">DERIVADA A INGENIERIA</SelectItem>
                      <SelectItem value="DERIVADA A PEPE MAZÓN">DERIVADA A PEPE MAZÓN</SelectItem>
                      <SelectItem value="DERIVADA A SAT">DERIVADA A SAT</SelectItem>
                      <SelectItem value="DISTRIBUIDOR NOS ENVIA MATERIAL">DISTRIBUIDOR NOS ENVIA MATERIAL</SelectItem>
                      <SelectItem value="REPOSICIÓN EN GARANTÍA">REPOSICIÓN EN GARANTÍA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">11. Provincia</Label>
                  <Input 
                    value={formData.provincia || ''} 
                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                    className="h-9 shadow-sm"
                  />
                </div>

                {/* Row 4: Ciudad, Dirección, RMA, Distribuidor */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">12. Ciudad</Label>
                  <Input 
                    value={formData.ciudad || ''} 
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                    className="h-9 shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">13. Nº RMA</Label>
                  <Input 
                    type="number" 
                    className="h-9 text-right shadow-sm" 
                    value={formData.rma_number || 0}
                    onChange={(e) => setFormData({ ...formData, rma_number: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">14. SAT</Label>
                  <SatSearchInput 
                    value={formData.sat || ''}
                    sats={availableSats}
                    onSelect={(val) => setFormData({ ...formData, sat: val })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">15. Dirección</Label>
                  <Input 
                    value={formData.direccion || ''} 
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    className="h-9 shadow-sm"
                    placeholder="Calle, número, oficina..."
                  />
                </div>

                {/* Row 5: CP, Provincia */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">16. CP</Label>
                  <Input 
                    value={formData.codigo_postal || ''} 
                    onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
                    className="h-9 shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">17. Distribuidor</Label>
                  <DistributorSearchInput 
                    value={formData.distribuidor || ''}
                    customers={customers}
                    onSelect={(val) => setFormData({ ...formData, distribuidor: val })}
                  />
                </div>
                <div></div>
                <div></div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 2) SECCION DE REFERENCIAS */}
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
            <span className="w-6 h-px bg-primary/30" />
            2. Sección de Referencias
          </h2>
          <Card className="shadow-none border-border/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground w-[180px]">Referencia</th>
                    <th className="px-4 py-2.5 text-center font-semibold uppercase tracking-wider text-muted-foreground w-[70px]">Cant.</th>
                    <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground w-[280px]">Descripción del Material</th>
                    <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground w-[420px]">Observación</th>
                    <th className="px-4 py-2.5 text-center font-semibold uppercase tracking-wider text-muted-foreground w-[80px]">Garantía</th>
                    <th className="px-4 py-2.5 text-center font-semibold uppercase tracking-wider text-muted-foreground w-[60px]">
                      <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 w-7 p-0 shadow-sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-background">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-muted/5 transition-colors">
                      <td className="p-2">
                        <ProductReferenceSearch 
                          value={item.referencia || ''}
                          products={availableProducts}
                          onSelect={(p) => {
                            if (p.is_manual) {
                              updateItem(item.id!, 'referencia', p.referencia)
                            } else {
                              const newItems = items.map(it => 
                                it.id === item.id 
                                  ? { ...it, referencia: p.referencia, descripcion: p.descripcion }
                                  : it
                              )
                              setItems(newItems)
                              
                              // Auto-add new line if this is the last item
                              if (idx === items.length - 1) {
                                addItem()
                              }
                            }
                          }}
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Input 
                          type="number" 
                          value={item.cantidad || 1} 
                          onChange={(e) => updateItem(item.id!, 'cantidad', parseInt(e.target.value) || 1)}
                          className="h-8 text-[11px] text-center w-16 mx-auto shadow-none border-transparent focus-visible:border-border"
                        />
                      </td>
                      <td className="p-2">
                        <Input 
                          value={item.descripcion || ''} 
                          onChange={(e) => updateItem(item.id!, 'descripcion', e.target.value)}
                          placeholder="Nombre del producto..."
                          className="h-8 text-[11px] shadow-none border-transparent focus-visible:border-border"
                        />
                      </td>
                      <td className="p-2">
                        <Input 
                          value={item.observacion || ''} 
                          onChange={(e) => updateItem(item.id!, 'observacion', e.target.value)}
                          placeholder="Nota (máx 140)..."
                          maxLength={140}
                          className="h-8 text-[11px] shadow-none border-transparent focus-visible:border-border"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input 
                          type="checkbox" 
                          checked={item.en_garantia} 
                          onChange={(e) => updateItem(item.id!, 'en_garantia', e.target.checked)}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => removeItem(item.id!)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* 3) SECCION DE COMENTARIOS */}
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
            <span className="w-6 h-px bg-primary/30" />
            3. Sección de Comentarios
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold flex items-center gap-2 uppercase text-warning">
                  <span className="w-2.5 h-2.5 rounded-full bg-warning border-2 border-warning/20" />
                  Descripción de la Incidencia (Problema)
                </Label>
                <Textarea 
                  value={formData.incidencia_desc || ''} 
                  onChange={(e) => setFormData({ ...formData, incidencia_desc: e.target.value })}
                  placeholder="Detalles sobre qué falla y bajo qué condiciones..."
                  className="min-h-[120px] bg-warning/[0.03] border-warning/20 focus-visible:ring-warning shadow-sm text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold flex items-center gap-2 uppercase text-success">
                  <span className="w-2.5 h-2.5 rounded-full bg-success border-2 border-success/20" />
                  Solución Aplicada (Resolución)
                </Label>
                <Textarea 
                  value={formData.solucion_desc || ''} 
                  onChange={(e) => setFormData({ ...formData, solucion_desc: e.target.value })}
                  placeholder="Pasos seguidos para resolver o estado final..."
                  className="min-h-[120px] bg-success/[0.03] border-success/20 focus-visible:ring-success shadow-sm text-sm"
                />
              </div>
            </div>

            <div className="space-y-4">
               <Tabs defaultValue="com_soporte" className="w-full border rounded-lg overflow-hidden bg-background shadow-sm">
                  <TabsList className="bg-muted/30 px-1 h-9 rounded-none w-full justify-start gap-1 border-b">
                    <TabsTrigger value="com_soporte" className="h-7 text-[10px] font-bold uppercase tracking-wider px-4 flex items-center gap-1.5">
                      Observaciones tras revisión en fábrica
                      {formData.comentarios_soporte && formData.comentarios_soporte.trim().length > 0 && (
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] text-destructive-foreground animate-pulse">1</span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="com_admin" className="h-7 text-[10px] font-bold uppercase tracking-wider px-4 flex items-center gap-1.5">
                      Notas Administración
                      {formData.comentarios_admin && formData.comentarios_admin.trim().length > 0 && (
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] text-destructive-foreground animate-pulse">1</span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="com_soporte" className="mt-0 p-0">
                    <Textarea 
                      value={formData.comentarios_soporte || ''} 
                      onChange={(e) => setFormData({ ...formData, comentarios_soporte: e.target.value })}
                      placeholder="Escriba aquí notas que solo el equipo técnico deba ver..."
                      className="min-h-[254px] border-none rounded-none focus-visible:ring-0 shadow-none resize-none p-3 text-sm"
                    />
                  </TabsContent>
                  <TabsContent value="com_admin" className="mt-0 p-0">
                    <Textarea 
                      value={formData.comentarios_admin || ''} 
                      onChange={(e) => setFormData({ ...formData, comentarios_admin: e.target.value })}
                      placeholder="Notas destinadas a facturación o administrativa..."
                      className="min-h-[254px] border-none rounded-none focus-visible:ring-0 shadow-none resize-none p-3 text-sm"
                    />
                  </TabsContent>
               </Tabs>
            </div>
          </div>
        </section>

        {/* 4) BOTONES DE ACCIÓN INFERIORES */}
        <section className="pt-4 mt-6 border-t flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              size="sm"
              onClick={() => router.push('/dashboard/requests/new')}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm"
            >
              <Plus className="w-3 h-3 mr-2" />
              Añadir nueva
            </Button>

            {assistance?.id && (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleDuplicate}
                  className="h-8 text-xs"
                >
                  <Copy className="w-3 h-3 mr-2" />
                  Duplicar
                </Button>
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-8 text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Eliminar
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {assistance?.id && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleGeneratePdf}
                className="h-8 text-xs"
              >
                <FileText className="w-3 h-3 mr-2" />
                Generar PDF
              </Button>
            )}
            
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="h-8 text-xs">
              {loading ? 'Guardando...' : 'Atrás'}
            </Button>

            <Button 
              type="submit" 
              disabled={loading} 
              size="sm"
              className="h-8 text-xs px-4"
            >
              {loading ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Save className="w-3 h-3 mr-2" />}
              {assistance ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </section>
      </div>
    </form>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar asistencia?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará de la lista la asistencia <strong>&ldquo;{assistance?.titulo || formData.titulo}&rdquo;</strong>. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
