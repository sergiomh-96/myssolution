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
import { ContactsTable } from './contacts-table'

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
    descuento_sistemas: customer?.descuento_sistemas || 0,
    descuento_difusion: customer?.descuento_difusion || 0,
    descuento_agfri: customer?.descuento_agfri || 0,
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

        if (newCustomer) {
          const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
          
          if (admins && admins.length > 0) {
            const notificationsToInsert = admins
              .filter(admin => admin.id !== currentUserId)
              .map(admin => ({
                user_id: admin.id,
                type: 'system' as any,
                title: 'Nuevo cliente creado',
                message: `Se ha creado un nuevo cliente: ${newCustomer.company_name}. Pulsa para ver`,
                link: `/dashboard/customers/${newCustomer.id}/edit`,
                read: false
              }))
            
            if (notificationsToInsert.length > 0) {
              await supabase.from('notifications').insert(notificationsToInsert)
            }
          }
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
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Customer fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="company_name" className="text-sm">Nombre de empresa *</Label>
          <Input
            id="company_name"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            required
            disabled={loading}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="nif" className="text-sm">NIF / CIF</Label>
          <Input
            id="nif"
            value={formData.nif}
            onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
            disabled={loading}
            className="h-8 text-sm"
          />
        </div>

        {customer && createdByUser && (
          <div className="space-y-1">
            <Label htmlFor="created_by" className="text-sm">Creado Por</Label>
            <Input
              id="created_by"
              value={createdByUser.full_name || '-'}
              disabled
              className="bg-muted h-8 text-sm"
            />
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="contact_name" className="text-sm">Nombre de contacto</Label>
          <Input
            id="contact_name"
            value={formData.contact_name}
            onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
            disabled={loading}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="contact_email" className="text-sm">Email de contacto</Label>
          <Input
            id="contact_email"
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            disabled={loading}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="contact_phone" className="text-sm">Teléfono</Label>
          <Input
            id="contact_phone"
            type="tel"
            value={formData.contact_phone}
            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            disabled={loading}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="website" className="text-sm">Web</Label>
          <Input
            id="website"
            placeholder="https://example.com"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            disabled={loading}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="industry" className="text-sm">Sector</Label>
          <Input
            id="industry"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            disabled={loading}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="status" className="text-sm">Estado</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as CustomerStatus })}
            disabled={loading}
          >
            <SelectTrigger id="status" className="h-8 text-sm">
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

        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="address" className="text-sm">Dirección</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            disabled={loading}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="ciudad" className="text-sm">Ciudad</Label>
          <Input
            id="ciudad"
            value={formData.ciudad}
            onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
            disabled={loading}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="provincia" className="text-sm">Provincia</Label>
          <Input
            id="provincia"
            value={formData.provincia}
            onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
            disabled={loading}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="codigo_postal" className="text-sm">Código Postal</Label>
          <Input
            id="codigo_postal"
            value={formData.codigo_postal}
            onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })}
            disabled={loading}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="pais" className="text-sm">País</Label>
          <Input
            id="pais"
            value={formData.pais}
            onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
            disabled={loading}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notas_cliente" className="text-sm">Notas</Label>
        <Textarea
          id="notas_cliente"
          value={formData.notas_cliente}
          onChange={(e) => setFormData({ ...formData, notas_cliente: e.target.value })}
          rows={2}
          disabled={loading}
          className="text-sm"
        />
      </div>

      {/* Discounts section */}
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">Descuentos</Label>
          {currentUserRole !== 'admin' && (
            <span className="text-xs text-muted-foreground ml-1">(solo lectura)</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="descuento_sistemas" className="text-sm">Descuento Sistemas (%)</Label>
            <Input
              id="descuento_sistemas"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.descuento_sistemas}
              onChange={(e) => setFormData({ ...formData, descuento_sistemas: parseFloat(e.target.value) || 0 })}
              disabled={loading || currentUserRole !== 'admin'}
              className={`h-8 text-sm ${currentUserRole !== 'admin' ? 'bg-muted' : ''}`}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="descuento_difusion" className="text-sm">Descuento Difusión (%)</Label>
            <Input
              id="descuento_difusion"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.descuento_difusion}
              onChange={(e) => setFormData({ ...formData, descuento_difusion: parseFloat(e.target.value) || 0 })}
              disabled={loading || currentUserRole !== 'admin'}
              className={`h-8 text-sm ${currentUserRole !== 'admin' ? 'bg-muted' : ''}`}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="descuento_agfri" className="text-sm">Descuento Agfri (%)</Label>
            <Input
              id="descuento_agfri"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.descuento_agfri}
              onChange={(e) => setFormData({ ...formData, descuento_agfri: parseFloat(e.target.value) || 0 })}
              disabled={loading || currentUserRole !== 'admin'}
              className={`h-8 text-sm ${currentUserRole !== 'admin' ? 'bg-muted' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Profile assignment section */}
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Perfiles Asignados</Label>
          {!isAdmin && (
            <span className="text-xs text-muted-foreground ml-1">(solo lectura)</span>
          )}
        </div>

        {/* Currently assigned badges */}
        <div className="flex flex-wrap gap-1 min-h-[28px]">
          {selectedProfileIds.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hay perfiles asignados.</p>
          ) : (
            selectedProfileIds.map(id => (
              <Badge key={id} variant="secondary" className="flex items-center gap-1 pr-0.5 text-xs py-0.5">
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
              <SelectTrigger className="flex-1 h-8 text-sm">
                <SelectValue placeholder="Seleccionar perfil..." />
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
              className="h-8 text-sm px-3"
            >
              Añadir
            </Button>
          </div>
        )}
      </div>

      {/* Contacts table - only show when editing existing customer */}
      {customer && customerId && (
        <ContactsTable customerId={Number(customerId)} customerName={formData.company_name} disabled={loading} />
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={loading} className="h-8 text-sm px-4">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Guardando...
            </>
          ) : customer ? 'Actualizar Cliente' : 'Crear Cliente'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="h-8 text-sm px-4">
          Cancelar
        </Button>
      </div>
    </form>
  )
}
