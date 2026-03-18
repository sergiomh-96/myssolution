import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth'
import { UserForm } from '@/components/users/user-form'
import { notFound } from 'next/navigation'

interface EditUserPageProps {
  params: Promise<{ id: string }>
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params
  const profile = await requireProfile()
  
  // Only admins can edit users
  if (profile.role !== 'admin') {
    return <div className="text-destructive">Access denied</div>
  }

  const supabase = await createClient()
  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !user) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Editar Usuario</h1>
        <p className="text-muted-foreground mt-1">
          Actualiza la información del usuario
        </p>
      </div>
      <UserForm user={user} />
    </div>
  )
}
