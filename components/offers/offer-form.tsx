'use client'

import { useState } from 'react'
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
  
  const existingItems = offer?.items as OfferItem[] || []
  
  const [formData, setFormData] = useState({
    title: offer?.title || '',
    description: offer?.description || '',
    customer_id: offer?.customer_id || '',
    currency: offer?.currency || 'USD',
    status: (offer?.status || 'draft') as OfferStatus,
    valid_until: offer?.valid_until ? offer.valid_until.split('T')[0] : '',
    notes: offer?.notes || '',
  })

  const createEmptyItem = (): OfferItem => ({
    id: crypto.randomUUID(),
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <Label htmlFor="currency">Currency</Label>
          <Select 
            value={formData.currency} 
            onValueChange={(value) => setFormData({ ...formData, currency: value })}
            disabled={loading}
          >
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="JPY">JPY</SelectItem>
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          disabled={loading}
        />
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
                <th className="px-3 py-2 text-left font-medium w-14">#</th>
                <th className="px-3 py-2 text-left font-medium w-[30%]">Descripción</th>
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
                  <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
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
                  {formData.currency} {totalAmount.toFixed(2)}
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
