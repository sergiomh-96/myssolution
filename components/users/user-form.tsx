'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { Profile } from '@/lib/types/database'
import { ArrowLeft, Loader2, Mail, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface UserFormProps {
  user?: Profile
}

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gerente' },
  { value: 'sales_rep', label: 'Representante de Ventas' },
  { value: 'support_agent', label: 'Agente de Soporte' },
  { value: 'viewer', label: 'Visualizador' },
]

type PasswordMode = 'invite' | 'manual'

export function UserForm({ user }: UserFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ mode: PasswordMode; email: string } | null>(null)
  const [passwordMode, setPasswordMode] = useState<PasswordMode>('invite')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
    role: user?.role || 'viewer',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!user && passwordMode === 'manual' && formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setLoading(true)

    try {
      const endpoint = user ? `/api/users/${user.id}` : '/api/users'
      const method = user ? 'PUT' : 'POST'

      const payload = {
        ...formData,
        password_mode: passwordMode,
        password: passwordMode === 'manual' ? formData.password : undefined,
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar usuario')
      }

      if (user) {
        router.push('/dashboard/users')
        router.refresh()
      } else {
        setSuccess({ mode: passwordMode, email: formData.email })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="grid gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Usuario creado correctamente</h3>
                {success.mode === 'invite' ? (
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Se ha enviado un email de invitación a <strong>{success.email}</strong> para que establezca su contraseña.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground max-w-sm">
                    El usuario <strong>{success.email}</strong> ha sido creado con la contraseña indicada y ya puede acceder a la aplicación.
                  </p>
                )}
              </div>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => { setSuccess(null); setFormData({ full_name: '', email: '', phone: '', department: '', role: 'viewer', password: '' }) }}>
                  Crear otro usuario
                </Button>
                <Button onClick={() => router.push('/dashboard/users')}>
                  Volver a usuarios
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/users">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <CardTitle>{user ? 'Editar Usuario' : 'Crear Usuario'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Juan García"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading || !!user}
                  placeholder="juan@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={loading}
                  placeholder="+34 123 456 789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  disabled={loading}
                  placeholder="Ventas"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="role">Rol *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  disabled={loading}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!user && (
              <div className="space-y-4 pt-2 border-t">
                <Label className="text-sm font-medium">Acceso inicial</Label>
                <RadioGroup
                  value={passwordMode}
                  onValueChange={(v) => setPasswordMode(v as PasswordMode)}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3"
                >
                  <label
                    htmlFor="mode-invite"
                    className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${passwordMode === 'invite' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                  >
                    <RadioGroupItem value="invite" id="mode-invite" className="mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Enviar invitación por email</span>
                      </div>
                      <p className="text-xs text-muted-foreground">El usuario recibirá un email para establecer su propia contraseña.</p>
                    </div>
                  </label>

                  <label
                    htmlFor="mode-manual"
                    className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${passwordMode === 'manual' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                  >
                    <RadioGroupItem value="manual" id="mode-manual" className="mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Establecer contraseña ahora</span>
                      </div>
                      <p className="text-xs text-muted-foreground">El admin asigna una contraseña inicial para acceso inmediato.</p>
                    </div>
                  </label>
                </RadioGroup>

                {passwordMode === 'manual' && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña inicial *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        disabled={loading}
                        placeholder="Mínimo 8 caracteres"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Comparte esta contraseña con el usuario de forma segura.</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" type="button" onClick={() => router.back()} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {user ? 'Actualizar Usuario' : passwordMode === 'invite' ? 'Crear y Enviar Invitación' : 'Crear Usuario'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
