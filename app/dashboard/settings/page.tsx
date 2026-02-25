import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserManagementTable } from '@/components/settings/user-management-table'
import { Suspense } from 'react'
import { DefaultTarifaSettings } from '@/components/settings/default-tarifa-settings'

function LoadingCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarifa Predeterminada</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground">Cargando...</div>
      </CardContent>
    </Card>
  )
}

export default async function SettingsPage() {
  const profile = await requireRole(['admin'])
  const supabase = await createClient()

  // Get all users
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage system configuration and users
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManagementTable users={users || []} />
        </CardContent>
      </Card>

      <Suspense fallback={<LoadingCard />}>
        <DefaultTarifaSettings />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            MYSSolution CRM v1.0.0
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database:</span>
              <span className="font-medium">Supabase PostgreSQL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Authentication:</span>
              <span className="font-medium">Supabase Auth</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Real-time:</span>
              <span className="font-medium">Supabase Realtime</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
