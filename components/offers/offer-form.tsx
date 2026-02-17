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
  description: string
  quantity: number
  unit_price: number
  total: number
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

  const [items, setItems] = useState<OfferItem[]>(
    existingItems.length > 0 ? existingItems : [{ description: '', quantity: 1, unit_price: 0, total: 0 }]
  )

  const handleItemChange = (index: number, field: keyof OfferItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = Number(newItems[index].quantity)
      const unitPrice = Number(newItems[index].unit_price)
      newItems[index].total = quantity * unitPrice
    }
    
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0)

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

        {items.map((item, index) => (
          <div key={index} className="p-4 border border-border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Item {index + 1}</span>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor={`item-description-${index}`}>Description</Label>
                <Input
                  id={`item-description-${index}`}
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`item-quantity-${index}`}>Quantity</Label>
                <Input
                  id={`item-quantity-${index}`}
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`item-unit-price-${index}`}>Unit Price</Label>
                <Input
                  id={`item-unit-price-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="text-right">
              <span className="text-sm font-medium">
                Total: {formData.currency} {item.total.toFixed(2)}
              </span>
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-4 border-t border-border">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-semibold">
              {formData.currency} {totalAmount.toFixed(2)}
            </p>
          </div>
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
