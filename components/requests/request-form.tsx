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
import { Loader2 } from 'lucide-react'
import type { TechnicalRequest, RequestPriority, RequestStatus, UserRole } from '@/lib/types/database'

interface RequestFormProps {
  request?: TechnicalRequest
  currentUserId: string
  currentUserRole: UserRole
  customers: { id: string; company_name: string }[]
  agents: { id: string; full_name: string | null }[]
}

export function RequestForm({ request, currentUserId, currentUserRole, customers, agents }: RequestFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    title: request?.title || '',
    description: request?.description || '',
    customer_id: request?.customer_id || '',
    priority: (request?.priority || 'medium') as RequestPriority,
    status: (request?.status || 'open') as RequestStatus,
    category: request?.category || '',
    assigned_to: request?.assigned_to || '',
    resolution_notes: request?.resolution_notes || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      const requestData = {
        title: formData.title,
        description: formData.description,
        customer_id: formData.customer_id || null,
        priority: formData.priority,
        status: formData.status,
        category: formData.category || null,
        assigned_to: formData.assigned_to || null,
        resolution_notes: formData.resolution_notes || null,
      }

      if (request) {
        // Update existing request
        const { error: updateError } = await supabase
          .from('technical_requests')
          .update({
            ...requestData,
            updated_at: new Date().toISOString(),
            resolved_at: formData.status === 'resolved' ? new Date().toISOString() : request.resolved_at,
          })
          .eq('id', request.id)

        if (updateError) throw updateError
      } else {
        // Create new request
        const { error: insertError } = await supabase
          .from('technical_requests')
          .insert({
            ...requestData,
            created_by: currentUserId,
          })

        if (insertError) throw insertError
      }

      router.push('/dashboard/requests')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  const canAssign = currentUserRole === 'admin' || currentUserRole === 'manager'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Request Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer_id">Customer</Label>
          <Select 
            value={formData.customer_id} 
            onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
            disabled={loading}
          >
            <SelectTrigger id="customer_id">
              <SelectValue placeholder="Internal request" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Internal (No Customer)</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            placeholder="e.g., Bug, Feature Request, Question"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select 
            value={formData.priority} 
            onValueChange={(value) => setFormData({ ...formData, priority: value as RequestPriority })}
            disabled={loading}
          >
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select 
            value={formData.status} 
            onValueChange={(value) => setFormData({ ...formData, status: value as RequestStatus })}
            disabled={loading}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="pending_customer">Pending Customer</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canAssign && agents.length > 0 && (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="assigned_to">Assign To</Label>
            <Select 
              value={formData.assigned_to} 
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              disabled={loading}
            >
              <SelectTrigger id="assigned_to">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.full_name || agent.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={6}
          required
          disabled={loading}
        />
      </div>

      {(request || formData.status === 'resolved' || formData.status === 'closed') && (
        <div className="space-y-2">
          <Label htmlFor="resolution_notes">Resolution Notes</Label>
          <Textarea
            id="resolution_notes"
            value={formData.resolution_notes}
            onChange={(e) => setFormData({ ...formData, resolution_notes: e.target.value })}
            rows={4}
            disabled={loading}
          />
        </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            request ? 'Update Request' : 'Create Request'
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
