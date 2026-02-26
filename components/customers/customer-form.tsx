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
import type { CustomerStatus, UserRole } from '@/lib/types/database'

interface Profile {
  id: string
  full_name: string | null
  role: string
}

interface CustomerFormProps {
  customer?: any
  currentUserId: string
  currentUserRole: UserRole
  availableUsers: Profile[]
  assignedProfiles?: Array<{ profile_id: string; profiles?: Profile | null }>
  customerId?: string
  createdByUser?: { full_name: string | null }
}

export function CustomerForm({
  customer,
  currentUserId,
  currentUserRole,
  availableUsers = [],
  assignedProfiles = [],
  customerId,
  createdByUser,
}: CustomerFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>(
    assignedProfiles.map(ap => ap.profile_id)
  )
  const [profileToAdd, setProfileToAdd] = useState<string>('')

  // Use exact DB column names
  const [formData, setFormData] = useState({
    company_name: customer?.company_name || '',
    contact_name: customer?.contact_name || '',
    contact_email: customer?.contact_email || '',
    contact_phone: customer?.contact_phone || '',
    address: customer?.address || '',
    ciudad: customer?.ciudad || '',
    pais: customer?.pais || '',
    provincia: customer?.provincia || '',
    codigo_postal: customer?.codigo_postal || '',
    website: customer?.website || '',
    industry: customer?.industry || '',
    nif: customer?.nif || '',
    status: (customer?.status || 'lead') as CustomerStatus,
    assigned_to: customer?.assigned_to || currentUserId,
    notas_cliente: customer?.notas_cliente || '',
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

        // Update profile assignments
        await supabase
          .from('customer_profile_assignments')
          .delete()
          .eq('customer_id', customerId)

        if (selectedProfileIds.length > 0) {
          const { error: assignError } = await supabase
            .from('customer_profile_assignments')
            .insert(selectedProfileIds.map(profile_id => ({
              customer_id: Number(customerId),
              profile_id,
            })))
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
            .insert(selectedProfileIds.map(profile_id => ({
              customer_id: newCustomer.id,
              profile_id,
            })))
          if (assignError) throw assignError
        }
      }

      router.push('/dashboard/customers')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Ha ocurrido un error')
      setLoading(false)
    }
  }

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'sales_rep'
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
          <Label htmlFor="company_name">Nombre de empresa *</Label>
          <Input
            id="company_name"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nif">NIF / CIF</Label>
          <Input
            id="nif"
            value={formData.nif}
            onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
            disabled={loading}
          />
        </div>

        {customer && createdByUser && (
          <div className="space-y-2">
            <Label htmlFor="created_by">Creado Por</Label>
            <Input
              id="created_by"
              value={createdByUser.full_name || '-'}
              disabled
              className="bg-muted"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="contact_name">Nombre de contacto *</Label>
          <Input
            id="contact_name"
            value={formData.contact_name}
            onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email">Email de contacto *</Label>
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
          <Label htmlFor="contact_phone">Teléfono</Label>
          <Input
            id="contact_phone"
            type="tel"
            value={formData.contact_phone}
            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Web</Label>
          <Input
            id="website"
            placeholder="https://example.com"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Sector</Label>
          <Input
            id="industry"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
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

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Dirección</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ciudad">Ciudad</Label>
          <Input
            id="ciudad"
            value={formData.ciudad}
            onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="provincia">Provincia</Label>
          <Input
            id="provincia"
            value={formData.provincia}
            onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="codigo_postal">Código Postal</Label>
          <Input
            id="codigo_postal"
            value={formData.codigo_postal}
            onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pais">País</Label>
          <Input
            id="pais"
            value={formData.pais}
            onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notas_cliente">Notas</Label>
        <Textarea
          id="notas_cliente"
          value={formData.notas_cliente}
          onChange={(e) => setFormData({ ...formData, notas_cliente: e.target.value })}
          rows={3}
          disabled={loading}
        />
      </div>

      {/* Profile assignment section */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label className="text-base font-semibold">Perfiles Asignados</Label>
          {!isAdmin && (
            <span className="text-xs text-muted-foreground ml-1">(solo lectura)</span>
          )}
        </div>

        {/* Currently assigned badges */}
        <div className="flex flex-wrap gap-2 min-h-[36px]">
          {selectedProfileIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay perfiles asignados.</p>
          ) : (
            selectedProfileIds.map(id => (
              <Badge key={id} variant="secondary" className="flex items-center gap-1 pr-1 text-sm py-1">
                {getProfileName(id)}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => removeProfile(id)}
                    disabled={loading}
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                    aria-label="Eliminar perfil"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))
          )}
        </div>

        {/* Add profile dropdown - only for admin */}
        {isAdmin && (
          <div className="flex gap-2">
            <Select value={profileToAdd} onValueChange={setProfileToAdd} disabled={loading}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Seleccionar perfil para asignar..." />
              </SelectTrigger>
              <SelectContent>
                {unassignedProfiles.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    Todos los perfiles ya están asignados
                  </SelectItem>
                ) : (
                  unassignedProfiles.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.id}
                      {' '}
                      <span className="text-xs text-muted-foreground capitalize">({user.role})</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={addProfile}
              disabled={!profileToAdd || profileToAdd === '_none' || loading}
            >
              Añadir
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : customer ? 'Actualizar Cliente' : 'Crear Cliente'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
