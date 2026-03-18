import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { UserForm } from '@/components/users/user-form'

export default async function NewUserPage() {
  const profile = await requireProfile()
  
  // Only admins can create users
  if (profile.role !== 'admin') {
    return <div className="text-destructive">Access denied</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Crear Nuevo Usuario</h1>
        <p className="text-muted-foreground mt-1">
          Agrega un nuevo usuario al sistema
        </p>
      </div>
      <UserForm />
    </div>
  )
}
