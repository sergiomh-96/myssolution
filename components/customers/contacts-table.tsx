'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Plus, Trash2, Edit2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
    if (!newContact.nombre.trim() || !newContact.email.trim()) {
      setError('Nombre y email son requeridos')
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
          <Input
            placeholder="Puesto"
            value={newContact.puesto}
            onChange={(e) => setNewContact({ ...newContact, puesto: e.target.value })}
            disabled={loading || disabled}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Email *"
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
              <TableHead className="px-2 py-2 w-20 text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-2 py-4 text-center text-muted-foreground">
                  No hay contactos registrados
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-muted/50">
                  <TableCell className="px-2 py-2 truncate">{contact.nombre}</TableCell>
                  <TableCell className="px-2 py-2 truncate">{contact.apellidos || '-'}</TableCell>
                  <TableCell className="px-2 py-2 truncate">{contact.puesto || '-'}</TableCell>
                  <TableCell className="px-2 py-2 truncate text-blue-600 underline cursor-pointer">
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteContact(contact.id)}
                      disabled={loading || disabled}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
