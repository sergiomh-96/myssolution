'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { User, Shield, EyeOff, Loader2 } from 'lucide-react'
import type { Profile } from '@/lib/types/database'

export function UserSettings({ initialProfile }: { initialProfile: Profile }) {
  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = createClient()

  const handleTogglePrivacy = async (checked: boolean) => {
    setIsUpdating(true)
    const { error } = await supabase
      .from('profiles')
      .update({ default_privacy_mode: checked })
      .eq('id', profile.id)

    if (error) {
      toast.error('Error al actualizar la configuración')
      setIsUpdating(false)
      return
    }

    setProfile({ ...profile, default_privacy_mode: checked })
    setIsUpdating(false)
    toast.success('Configuración actualizada correctamente')
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle>Mis Datos</CardTitle>
          </div>
          <CardDescription>Información personal de tu perfil</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground font-bold tracking-tight">Nombre Completo</Label>
              <p className="text-sm font-medium">{profile.full_name || 'No especificado'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground font-bold tracking-tight">Email</Label>
              <p className="text-sm font-medium">{profile.email}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground font-bold tracking-tight">Rol</Label>
              <p className="text-sm font-medium capitalize">{profile.role.replace('_', ' ')}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground font-bold tracking-tight">Departamento</Label>
              <p className="text-sm font-medium">{profile.department || 'General'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm overflow-hidden border-l-4 border-l-primary">
        <CardHeader className="bg-muted/30 py-3 px-6 h-14 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
              <CardTitle className="text-sm font-semibold text-foreground">
                Dashboard - Datos clientes/importes/estadisticas visibles
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {isUpdating && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <Select 
                value={profile.default_privacy_mode ? 'NO' : 'SI'} 
                onValueChange={(val) => handleTogglePrivacy(val === 'NO')}
                disabled={isUpdating}
              >
                <SelectTrigger className="h-8 w-20 text-xs font-bold uppercase transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SI" className="text-xs font-bold text-success">SI</SelectItem>
                  <SelectItem value="NO" className="text-xs font-bold text-destructive">NO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}
