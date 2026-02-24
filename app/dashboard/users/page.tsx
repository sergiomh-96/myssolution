import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { UsersTable } from '@/components/users/users-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function UsersPage() {
  const profile = await requireProfile()
  
  // Only admins can manage users
  if (profile.role !== 'admin') {
    return <div className="text-destructive">Access denied. Only administrators can manage users.</div>
  }

  const supabase = await createClient()

  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-1">
            Crear, editar y gestionar usuarios del sistema
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/users/new">
            <Plus className="w-4 h-4 mr-2" />
            Crear Usuario
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="text-destructive">Error loading users: {error.message}</div>
      ) : (
        <UsersTable users={users || []} />
      )}
    </div>
  )
}
