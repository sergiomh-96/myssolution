'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X, Edit } from 'lucide-react'
import type { Offer, OfferStatus, UserRole } from '@/lib/types/database'
import { formatOfferNumber } from '@/lib/utils/offer'
import { createClient } from '@/lib/supabase/client'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'

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

interface OfferFormProps {
  currentUserId: string
  currentUserRole: UserRole
  customers: any[]
  offer?: Offer
}

export function OfferForm({ currentUserId, currentUserRole, customers, offer }: OfferFormProps) {
  const router = useRouter()
  
  // State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextOfferNumber, setNextOfferNumber] = useState<number | null>(null)
  const [contactList, setContactList] = useState<any[]>([])
  const [currentCustomer, setCurrentCustomer] = useState<any>(null)

  const [formData, setFormData] = useState({
    title: offer?.title || '',
    description: offer?.description || '',
    notas_internas: (offer as any)?.notas_internas || '',
    customer_id: offer?.customer_id || null,
    contact_id: offer?.contact_id || null,
    tarifa_id: offer?.tarifa_id || null,
    status: (offer?.status || 'draft') as OfferStatus,
    valid_until: offer?.valid_until ? offer.valid_until.split('T')[0] : '',
  })

  const [items, setItems] = useState<OfferItem[]>([])

  // Helper to add 30 days to a date
  const addDays = (dateStr: string, days: number) => {
    const date = new Date(dateStr)
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  // Initialize form
  useEffect(() => {
    if (!formData.valid_until && !offer) {
      setFormData(prev => ({
        ...prev,
        valid_until: addDays(new Date().toISOString().split('T')[0], 30)
      }))
    }
  }, [])

  // Calculate next offer number
  useEffect(() => {
    const calculateNextOfferNumber = async () => {
      if (offer) return
      
      try {
        const supabase = createClient()
        const currentYear = new Date().getFullYear()
        
        const { data: existingOffers } = await supabase
          .from('offers')
          .select('offer_number')
          .eq('created_by', currentUserId)
          .gte('created_at', `${currentYear}-01-01`)
          .lte('created_at', `${currentYear}-12-31`)
          .order('offer_number', { ascending: false })
          .limit(1)

        const nextNumber = (existingOffers && existingOffers.length > 0) 
          ? (existingOffers[0].offer_number as number) + 1 
          : 1
        
        setNextOfferNumber(nextNumber)
      } catch (err) {
        console.error('Error calculating offer number:', err)
      }
    }

    calculateNextOfferNumber()
  }, [currentUserId, offer])

  // Load customer data and contacts
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
        const { data: contacts } = await supabase
          .from('clients_contacts')
          .select('*')
          .eq('customer_id', formData.customer_id)
          .order('nombre')

        setContactList(contacts || [])

        // Load customer data
        const { data: customerData } = await supabase
          .from('customers')
          .select('*')
          .eq('id', formData.customer_id)
          .single()

        setCurrentCustomer(customerData)
      } catch (err) {
        console.error('Error:', err)
      }
    }

    loadCustomerData()
  }, [formData.customer_id])

  // Load offer items
  useEffect(() => {
    const loadOfferItems = async () => {
      if (!offer?.id) return

      try {
        const supabase = createClient()
        const { data: offerItems } = await supabase
          .from('offer_items')
          .select('*')
          .eq('offer_id', offer.id)
          .order('id')

        if (offerItems && offerItems.length > 0) {
          setItems(offerItems as OfferItem[])
        }
      } catch (err) {
        console.error('Error loading items:', err)
      }
    }

    loadOfferItems()
  }, [offer?.id])

  // Calculate totals
  const totals = {
    pvp_total: items.reduce((sum, item) => sum + (item.pvp_total || 0), 0),
    neto_total1: items.reduce((sum, item) => sum + (item.neto_total1 || 0), 0),
    neto_total2: items.reduce((sum, item) => sum + (item.neto_total2 || 0), 0),
  }

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

        // Update offer items
        if (items.length > 0) {
          const { error: deleteError } = await supabase
            .from('offer_items')
            .delete()
            .eq('offer_id', offer.id)

          if (deleteError) throw deleteError

          const itemsToInsert = items
            .filter(item => item.product_id)
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
        // Create new offer
        const { data: newOffer, error: insertError } = await supabase
          .from('offers')
          .insert({
            ...offerData,
            created_by: currentUserId,
            amount: totals.pvp_total,
            offer_number: nextOfferNumber,
          })
          .select()

        if (insertError) throw insertError
        if (!newOffer || newOffer.length === 0) throw new Error('Failed to create offer')

        const offerId = newOffer[0].id

        // Insert offer items
        if (items.length > 0) {
          const itemsToInsert = items
            .filter(item => item.product_id)
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Row 1: Offer Number, Title, Fecha Creación */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-0.5">
          <Label className="text-xs">Nº Oferta</Label>
          <div className="h-9 px-3 py-2 bg-muted rounded-md border border-input flex items-center text-sm font-medium">
            {offer 
              ? formatOfferNumber(offer.offer_number, new Date(offer.created_at).getFullYear())
              : nextOfferNumber 
                ? formatOfferNumber(nextOfferNumber, new Date().getFullYear())
                : 'Calculando...'}
          </div>
        </div>

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

        <div className="space-y-0.5">
          <Label className="text-xs">Fecha Creación</Label>
          <Input
            type="text"
            value={offer?.created_at 
              ? new Date(offer.created_at).toLocaleString('es-ES', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : new Date().toLocaleString('es-ES', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
            }
            readOnly
            disabled
            className="h-9 text-sm bg-muted"
          />
        </div>
      </div>

      {/* Row 2: Fecha Validez */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
      </div>

      {/* Row 3: Three description fields (without internal notes below) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-0.5">
          <Label className="text-xs">Notas Cliente</Label>
          <Textarea
            value={currentCustomer?.notas_cliente || ''}
            readOnly
            rows={3}
            className="resize-none text-sm bg-muted"
            placeholder="Notas del cliente (solo lectura)"
          />
        </div>

        <div className="space-y-0.5">
          <Label htmlFor="description" className="text-xs">Descripción (Visible en Oferta)</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            disabled={loading}
            className="resize-none text-sm"
            placeholder="Descripción visible en la oferta"
          />
        </div>

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
      </div>

      {/* Items Table with Totals */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Producto</th>
                <th className="px-4 py-2 text-right font-semibold">Cantidad</th>
                <th className="px-4 py-2 text-right font-semibold">PVP</th>
                <th className="px-4 py-2 text-right font-semibold">Total PVP</th>
                <th className="px-4 py-2 text-right font-semibold">Desc 1%</th>
                <th className="px-4 py-2 text-right font-semibold">Desc 2%</th>
                <th className="px-4 py-2 text-right font-semibold">Neto 1</th>
                <th className="px-4 py-2 text-right font-semibold">Neto 2</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-2">{item.description}</td>
                  <td className="px-4 py-2 text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-right">{item.pvp.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{item.pvp_total.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{item.discount1}%</td>
                  <td className="px-4 py-2 text-right">{item.discount2}%</td>
                  <td className="px-4 py-2 text-right">{item.neto_total1.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{item.neto_total2.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-muted/50 font-semibold border-t-2">
                <td colSpan={3} className="px-4 py-2">TOTALES</td>
                <td className="px-4 py-2 text-right">{totals.pvp_total.toFixed(2)}</td>
                <td colSpan={2}></td>
                <td className="px-4 py-2 text-right">{totals.neto_total1.toFixed(2)}</td>
                <td className="px-4 py-2 text-right">{totals.neto_total2.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Contact and Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-0.5">
          <Label htmlFor="contact_id" className="text-xs">Contacto</Label>
          <Select
            value={formData.contact_id?.toString() || ''}
            onValueChange={(value) => {
              setFormData(prev => ({ ...prev, contact_id: value ? parseInt(value) : null }))
            }}
            disabled={loading || !formData.customer_id || contactList.length === 0}
          >
            <SelectTrigger id="contact_id" className="h-9 text-sm">
              <SelectValue placeholder="Seleccionar contacto" />
            </SelectTrigger>
            <SelectContent>
              {contactList.map((contact) => (
                <SelectItem key={contact.id} value={contact.id.toString()}>
                  {contact.nombre}
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
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="sent">Enviada</SelectItem>
              <SelectItem value="accepted">Aceptada</SelectItem>
              <SelectItem value="rejected">Rechazada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {offer ? 'Actualizar Oferta' : 'Crear Oferta'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
