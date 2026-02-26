import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, X } from 'lucide-react'
import type { Customer, CustomerStatus, UserRole } from '@/lib/types/database'
import { Card } from '@/components/ui/card'

interface CustomerFormProps {
  customer?: Customer
  currentUserId: string
  currentUserRole: UserRole
  availableUsers: { id: string; full_name: string | null; role: string }[]
  assignedProfiles?: Array<{ profile_id: string; profiles?: { id: string; full_name: string | null; role: string } }>
  customerId?: string
}

export function CustomerForm({ 
  customer, 
  currentUserId, 
  currentUserRole, 
  availableUsers,
  assignedProfiles = [],
  customerId 
}: CustomerFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>(
    assignedProfiles?.map(ap => ap.profile_id) || []
  )
  const [newProfileId, setNewProfileId] = useState<string>('')
  
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

  const handleAddProfile = () => {
    if (newProfileId && !selectedProfiles.includes(newProfileId)) {
      setSelectedProfiles([...selectedProfiles, newProfileId])
      setNewProfileId('')
    }
  }

  const handleRemoveProfile = (profileId: string) => {
    setSelectedProfiles(selectedProfiles.filter(id => id !== profileId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      if (customer && customerId) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customer.id)

        if (updateError) throw updateError

        // Update profile assignments
        // Delete existing assignments
        await supabase
          .from('customer_profile_assignments')
          .delete()
          .eq('customer_id', customerId)

        // Insert new assignments
        if (selectedProfiles.length > 0) {
          const assignments = selectedProfiles.map(profileId => ({
            customer_id: customerId,
            profile_id: profileId,
          }))

          const { error: assignError } = await supabase
            .from('customer_profile_assignments')
            .insert(assignments)

          if (assignError) throw assignError
        }
      } else {
        // Create new customer
        const { data: newCustomer, error: insertError } = await supabase
          .from('customers')
          .insert({
            ...formData,
            created_by: currentUserId,
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Insert profile assignments if any
        if (selectedProfiles.length > 0 && newCustomer) {
          const assignments = selectedProfiles.map(profileId => ({
            customer_id: newCustomer.id,
            profile_id: profileId,
          }))

          const { error: assignError } = await supabase
            .from('customer_profile_assignments')
            .insert(assignments)

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

  const canChangeAssignment = currentUserRole === 'admin' || currentUserRole === 'manager'
  const assignedProfilesList = assignedProfiles
    ?.filter(ap => selectedProfiles.includes(ap.profile_id))
    .map(ap => ap.profiles || { id: ap.profile_id, full_name: ap.profile_id, role: '' }) || []

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
            type="url"
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

        {canChangeAssignment && availableUsers.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To (Primary)</Label>
            <Select 
              value={formData.assigned_to} 
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              disabled={loading}
            >
              <SelectTrigger id="assigned_to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.id} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {canChangeAssignment && availableUsers.length > 0 && (
        <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
          <Label>Assign Additional Profiles</Label>
          <div className="flex gap-2">
            <Select 
              value={newProfileId} 
              onValueChange={setNewProfileId}
              disabled={loading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select profile to add..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers
                  .filter(user => !selectedProfiles.includes(user.id))
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.id} ({user.role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={handleAddProfile}
              disabled={!newProfileId || loading}
              variant="outline"
            >
              Add Profile
            </Button>
          </div>

          {selectedProfiles.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Assigned Profiles:</Label>
              <div className="flex flex-wrap gap-2">
                {selectedProfiles.map((profileId) => {
                  const profile = availableUsers.find(u => u.id === profileId)
                  return (
                    <Card key={profileId} className="px-3 py-2 bg-background flex items-center gap-2">
                      <span className="text-sm">
                        {profile?.full_name || profileId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveProfile(profileId)}
                        className="ml-1 hover:text-destructive"
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
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
            customer ? 'Update Customer' : 'Create Customer'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      if (customer && customerId) {
        // Update existing customer
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customer.id)

        if (updateError) throw updateError

        // Update profile assignments
        // Delete existing assignments
        await supabase
          .from('customer_profile_assignments')
          .delete()
          .eq('customer_id', customerId)

        // Insert new assignments
        if (selectedProfiles.length > 0) {
          const assignments = selectedProfiles.map(profileId => ({
            customer_id: customerId,
            profile_id: profileId,
          }))

          const { error: assignError } = await supabase
            .from('customer_profile_assignments')
            .insert(assignments)

          if (assignError) throw assignError
        }
      } else {
        // Create new customer
        const { data: newCustomer, error: insertError } = await supabase
          .from('customers')
          .insert({
            ...formData,
            created_by: currentUserId,
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Insert profile assignments if any
        if (selectedProfiles.length > 0 && newCustomer) {
          const assignments = selectedProfiles.map(profileId => ({
            customer_id: newCustomer.id,
            profile_id: profileId,
          }))

          const { error: assignError } = await supabase
            .from('customer_profile_assignments')
            .insert(assignments)

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

  const canChangeAssignment = currentUserRole === 'admin' || currentUserRole === 'manager'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
            type="url"
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

        {canChangeAssignment && availableUsers.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Select 
              value={formData.assigned_to} 
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              disabled={loading}
            >
              <SelectTrigger id="assigned_to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.id} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
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
            customer ? 'Update Customer' : 'Create Customer'
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
