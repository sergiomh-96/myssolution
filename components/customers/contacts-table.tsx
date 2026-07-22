'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Contact {
  id: number
  customer_id: number
  nombre: string
  apellidos: string
  puesto: string
  email: string
  telefono: string
  codigo_postal: string
  direccion: string
  created_at: string
  updated_at: string
}

interface ContactsTableProps {
  customerId: number
  customerName: string
  disabled?: boolean
}

const PUESTOS_OPTIONS = [
  'Ingeniero',
  'Comercial',
  'Técnico',
  'Compras',
  'Administración',
  'Gerente',
  'Instalador',
  'Arquitecto',
  'Usuario Final',
  'Jefe de Obra',
  'Proyectista',
  'Almacen',
]

export function ContactsTable({ customerId, customerName, disabled = false }: ContactsTableProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [newContact, setNewContact] = useState({
    nombre: '',
    apellidos: '',
    puesto: '',
    email: '',
    telefono: '',
    codigo_postal: '',
    direccion: '',
  })

  const [editContact, setEditContact] = useState({
    nombre: '',
    apellidos: '',
    puesto: '',
    email: '',
    telefono: '',
    codigo_postal: '',
    direccion: '',
  })

  useEffect(() => {
    fetchContacts()
  }, [customerId])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('clients_contacts')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setContacts(data || [])
    } catch (err: any) {
      setError(err.message || 'Error al cargar contactos')
    } finally {
      setLoading(false)
    }
  }

  const handleAddContact = async () => {
    if (!newContact.nombre.trim()) {
      setError('El nombre es requerido')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()
      const { error: insertError } = await supabase
        .from('clients_contacts')
        .insert({
          customer_id: customerId,
          ...newContact,
          nombre: newContact.nombre.trim(),
          email: newContact.email.trim() || null,
          puesto: newContact.puesto || null,
        })

      if (insertError) throw insertError

      setNewContact({
        nombre: '',
        apellidos: '',
        puesto: '',
        email: '',
        telefono: '',
        codigo_postal: '',
        direccion: '',
      })
      await fetchContacts()
    } catch (err: any) {
      setError(err.message || 'Error al añadir contacto')
    } finally {
      setLoading(false)
    }
  }

  const handleStartEdit = (contact: Contact) => {
    setEditingId(contact.id)
    setEditContact({
      nombre: contact.nombre || '',
      apellidos: contact.apellidos || '',
      puesto: contact.puesto || '',
      email: contact.email || '',
      telefono: contact.telefono || '',
      codigo_postal: contact.codigo_postal || '',
      direccion: contact.direccion || '',
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContact({
      nombre: '',
      apellidos: '',
      puesto: '',
      email: '',
      telefono: '',
      codigo_postal: '',
      direccion: '',
    })
  }

  const handleSaveEdit = async (id: number) => {
    if (!editContact.nombre.trim()) {
      setError('El nombre del contacto es requerido')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('clients_contacts')
        .update({
          nombre: editContact.nombre.trim(),
          apellidos: editContact.apellidos.trim() || null,
          puesto: editContact.puesto || null,
          email: editContact.email.trim() || null,
          telefono: editContact.telefono.trim() || null,
          codigo_postal: editContact.codigo_postal.trim() || null,
          direccion: editContact.direccion.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) throw updateError

      setEditingId(null)
      await fetchContacts()
    } catch (err: any) {
      setError(err.message || 'Error al actualizar contacto')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteContact = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este contacto?')) return

    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('clients_contacts')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      await fetchContacts()
    } catch (err: any) {
      setError(err.message || 'Error al eliminar contacto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Contactos - {customerName}</h3>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Add new contact form */}
      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <Label className="text-sm font-medium">Añadir Nuevo Contacto</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <Input
            placeholder="Nombre *"
            value={newContact.nombre}
            onChange={(e) => setNewContact({ ...newContact, nombre: e.target.value })}
            disabled={loading || disabled}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Apellidos"
            value={newContact.apellidos}
            onChange={(e) => setNewContact({ ...newContact, apellidos: e.target.value })}
            disabled={loading || disabled}
            className="h-8 text-sm"
          />
          <Select
            value={newContact.puesto}
            onValueChange={(value) => setNewContact({ ...newContact, puesto: value })}
            disabled={loading || disabled}
          >
            <SelectTrigger className="h-8 text-sm bg-background">
              <SelectValue placeholder="Puesto" />
            </SelectTrigger>
            <SelectContent>
              {PUESTOS_OPTIONS.map((puesto) => (
                <SelectItem key={puesto} value={puesto}>
                  {puesto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Email"
            type="email"
            value={newContact.email}
            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
            disabled={loading || disabled}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Teléfono"
            value={newContact.telefono}
            onChange={(e) => setNewContact({ ...newContact, telefono: e.target.value })}
            disabled={loading || disabled}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Código Postal"
            value={newContact.codigo_postal}
            onChange={(e) => setNewContact({ ...newContact, codigo_postal: e.target.value })}
            disabled={loading || disabled}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Dirección"
            value={newContact.direccion}
            onChange={(e) => setNewContact({ ...newContact, direccion: e.target.value })}
            disabled={loading || disabled}
            className="h-8 text-sm"
          />
        </div>
        <Button
          type="button"
          onClick={handleAddContact}
          disabled={loading || disabled}
          className="w-full h-8 text-sm"
          size="sm"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
          Añadir Contacto
        </Button>
      </div>

      {/* Contacts table */}
      <div className="border rounded-lg overflow-hidden">
        <Table className="text-xs">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="px-2 py-2 w-32">Nombre</TableHead>
              <TableHead className="px-2 py-2 w-32">Apellidos</TableHead>
              <TableHead className="px-2 py-2 w-28">Puesto</TableHead>
              <TableHead className="px-2 py-2 w-40">Email</TableHead>
              <TableHead className="px-2 py-2 w-28">Teléfono</TableHead>
              <TableHead className="px-2 py-2 w-24">Código Postal</TableHead>
              <TableHead className="px-2 py-2 w-40">Dirección</TableHead>
              <TableHead className="px-2 py-2 w-24 text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="px-2 py-4 text-center text-muted-foreground">
                  No hay contactos registrados
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => {
                const isEditing = editingId === contact.id
                
                if (isEditing) {
                  return (
                    <TableRow key={contact.id} className="bg-primary/5">
                      <TableCell className="p-1">
                        <Input
                          value={editContact.nombre}
                          onChange={(e) => setEditContact({ ...editContact, nombre: e.target.value })}
                          disabled={loading || disabled}
                          className="h-7 text-xs"
                          placeholder="Nombre *"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={editContact.apellidos}
                          onChange={(e) => setEditContact({ ...editContact, apellidos: e.target.value })}
                          disabled={loading || disabled}
                          className="h-7 text-xs"
                          placeholder="Apellidos"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Select
                          value={editContact.puesto}
                          onValueChange={(value) => setEditContact({ ...editContact, puesto: value })}
                          disabled={loading || disabled}
                        >
                          <SelectTrigger className="h-7 text-xs bg-background">
                            <SelectValue placeholder="Puesto" />
                          </SelectTrigger>
                          <SelectContent>
                            {PUESTOS_OPTIONS.map((puesto) => (
                              <SelectItem key={puesto} value={puesto}>
                                {puesto}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="email"
                          value={editContact.email}
                          onChange={(e) => setEditContact({ ...editContact, email: e.target.value })}
                          disabled={loading || disabled}
                          className="h-7 text-xs"
                          placeholder="Email"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={editContact.telefono}
                          onChange={(e) => setEditContact({ ...editContact, telefono: e.target.value })}
                          disabled={loading || disabled}
                          className="h-7 text-xs"
                          placeholder="Teléfono"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={editContact.codigo_postal}
                          onChange={(e) => setEditContact({ ...editContact, codigo_postal: e.target.value })}
                          disabled={loading || disabled}
                          className="h-7 text-xs"
                          placeholder="CP"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={editContact.direccion}
                          onChange={(e) => setEditContact({ ...editContact, direccion: e.target.value })}
                          disabled={loading || disabled}
                          className="h-7 text-xs"
                          placeholder="Dirección"
                        />
                      </TableCell>
                      <TableCell className="p-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveEdit(contact.id)}
                            disabled={loading || disabled}
                            className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Guardar cambios"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={loading || disabled}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            title="Cancelar edición"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                }

                return (
                  <TableRow key={contact.id} className="hover:bg-muted/50">
                    <TableCell className="px-2 py-2 truncate font-medium">{contact.nombre}</TableCell>
                    <TableCell className="px-2 py-2 truncate">{contact.apellidos || '-'}</TableCell>
                    <TableCell className="px-2 py-2 truncate">{contact.puesto || '-'}</TableCell>
                    <TableCell className="px-2 py-2 truncate">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-blue-600 underline cursor-pointer">
                          {contact.email}
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-2 truncate">
                      {contact.telefono ? (
                        <a href={`tel:${contact.telefono}`} className="text-blue-600 underline cursor-pointer">
                          {contact.telefono}
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-2 truncate">{contact.codigo_postal || '-'}</TableCell>
                    <TableCell className="px-2 py-2 truncate">{contact.direccion || '-'}</TableCell>
                    <TableCell className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(contact)}
                          disabled={loading || disabled || editingId !== null}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Editar contacto"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                          disabled={loading || disabled || editingId !== null}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Eliminar contacto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
