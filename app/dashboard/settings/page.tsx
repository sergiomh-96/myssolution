import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserManagementTable } from '@/components/settings/user-management-table'
import { Suspense } from 'react'
import { DefaultTarifaSettings } from '@/components/settings/default-tarifa-settings'
import { UserSettings } from '@/components/settings/user-settings'

function LoadingCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cargando...</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground animate-pulse">Cargando datos de configuración...</div>
      </CardContent>
    </Card>
  )
}

export default async function SettingsPage() {
  const profile = await requireRole(['admin', 'sales_rep', 'support_agent'])
  const supabase = await createClient()
  const isAdmin = profile.role === 'admin'

  // Get all users (only for admin)
  let users = null
  if (isAdmin) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    users = data
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-foreground">Configuración</h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-tight opacity-70">
          {isAdmin ? 'Gestión del sistema y perfil de usuario' : 'Gestión de tu perfil y preferencias'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        {/* Siempre mostramos la Configuración del Usuario (Mis Datos + Privacidad) */}
        <div className="lg:col-span-8">
          <UserSettings initialProfile={profile} />
        </div>

        {/* Información del Sistema a la derecha */}
        <div className="lg:col-span-4">
          <Card className="border-border/50 shadow-sm sticky top-4">
            <CardHeader className="py-2.5 px-4 bg-muted/20 border-b border-border/50">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground opacity-80">Información del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs leading-relaxed">
              <div className="flex justify-between items-center pb-2 border-b border-border/30">
                <span className="text-muted-foreground">Software:</span>
                <span className="font-bold text-primary">MYSSolution CRM</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/30">
                <span className="text-muted-foreground">Versión:</span>
                <span className="font-medium">1.0.2</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/30">
                <span className="text-muted-foreground">Servicios:</span>
                <span className="font-medium">Supabase Cloud</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Estado sesión:</span>
                <span className="flex items-center gap-1.5 font-bold text-success capitalize group">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Conectado
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Solo mostramos la Gestión de Usuarios y Tarifas a los Admins */}
      {isAdmin && (
        <div className="space-y-6 pt-6 border-t border-border/50">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>
                Administra cuentas de usuario, roles y permisos del sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTable users={users || []} />
            </CardContent>
          </Card>

          <Suspense fallback={<LoadingCard />}>
            <DefaultTarifaSettings />
          </Suspense>
        </div>
      )}
    </div>
  )
}
