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
import { Badge } from '@/components/ui/badge'
import { Loader2, X, Users } from 'lucide-react'
import type { Customer, CustomerStatus, UserRole } from '@/lib/types/database'

interface Profile {
  id: string
  full_name: string | null
  role: string
}

interface CustomerFormProps {
  customer?: Customer
  currentUserId: string
  currentUserRole: UserRole
  availableUsers: Profile[]
  assignedProfiles?: Array<{ profile_id: string; profiles?: Profile | null }>
  customerId?: string
}

export function CustomerForm({
  customer,
  currentUserId,
  currentUserRole,
  availableUsers = [],
  assignedProfiles = [],
  customerId,
}: CustomerFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>(
    assignedProfiles.map(ap => ap.profile_id)
  )
  const [profileToAdd, setProfileToAdd] = useState<string>('')

  const [formData, setFormData] = useState({
    company_name: customer?.company_name || '',
    contact_name: customer?.contact_name || '',
    contact_email: customer?.contact_email || '',
    contact_phone: customer?.contact_phone || '',
    address: customer?.address || '',
    city: customer?.city || '',
    country: customer?.country || '',
    website: customer?.website || '',
    industry: customer?.industry || '',
    status: (customer?.status || 'lead') as CustomerStatus,
    assigned_to: customer?.assigned_to || currentUserId,
    notes: customer?.notes || '',
  })

  const addProfile = () => {
    if (profileToAdd && !selectedProfileIds.includes(profileToAdd)) {
      setSelectedProfileIds(prev => [...prev, profileToAdd])
      setProfileToAdd('')
    }
  }

  const removeProfile = (id: string) => {
    setSelectedProfileIds(prev => prev.filter(p => p !== id))
  }

  const getProfileName = (id: string) => {
    const found = availableUsers.find(u => u.id === id)
    return found?.full_name || id
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      if (customer && customerId) {
        const { error: updateError } = await supabase
          .from('customers')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', customer.id)
        if (updateError) throw updateError

        await supabase
          .from('customer_profile_assignments')
          .delete()
          .eq('customer_id', customerId)

        if (selectedProfileIds.length > 0) {
          const { error: assignError } = await supabase
            .from('customer_profile_assignments')
            .insert(selectedProfileIds.map(profile_id => ({ customer_id: customerId, profile_id })))
          if (assignError) throw assignError
        }
      } else {
        const { data: newCustomer, error: insertError } = await supabase
          .from('customers')
          .insert({ ...formData, created_by: currentUserId })
          .select()
          .single()
        if (insertError) throw insertError

        if (selectedProfileIds.length > 0 && newCustomer) {
          const { error: assignError } = await supabase
            .from('customer_profile_assignments')
            .insert(selectedProfileIds.map(profile_id => ({ customer_id: newCustomer.id, profile_id })))
          if (assignError) throw assignError
        }
      }

      router.push('/dashboard/customers')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  const unassignedProfiles = availableUsers.filter(u => !selectedProfileIds.includes(u.id))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Customer fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="company_name">Company Name *</Label>
          <Input
            id="company_name"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_name">Contact Name *</Label>
          <Input
            id="contact_name"
            value={formData.contact_name}
            onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email">Contact Email *</Label>
          <Input
            id="contact_email"
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_phone">Contact Phone</Label>
          <Input
            id="contact_phone"
            type="tel"
            value={formData.contact_phone}
            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            placeholder="https://example.com"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as CustomerStatus })}
            disabled={loading}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="churned">Churned</SelectItem>
            </SelectContent>
          </Select>
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

      {/* Profile assignment - always visible */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label className="text-base font-semibold">Assigned Profiles</Label>
        </div>

        {/* Currently assigned */}
        <div className="flex flex-wrap gap-2 min-h-[36px]">
          {selectedProfileIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No profiles assigned yet.</p>
          ) : (
            selectedProfileIds.map(id => (
              <Badge key={id} variant="secondary" className="flex items-center gap-1 pr-1 text-sm">
                {getProfileName(id)}
                <button
                  type="button"
                  onClick={() => removeProfile(id)}
                  disabled={loading}
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
        </div>

        {/* Add profile dropdown */}
        {availableUsers.length > 0 ? (
          <div className="flex gap-2">
            <Select value={profileToAdd} onValueChange={setProfileToAdd} disabled={loading}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a profile to assign..." />
              </SelectTrigger>
              <SelectContent>
                {unassignedProfiles.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.id}
                    <span className="ml-2 text-xs text-muted-foreground capitalize">({user.role})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={addProfile}
              disabled={!profileToAdd || loading}
            >
              Add
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No profiles available to assign.</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : customer ? 'Update Customer' : 'Create Customer'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
