import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireProfile } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const profile = await requireProfile()

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { full_name, email, phone, department, role } = await request.json()

    if (!full_name || !email || !role) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, email y rol' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Invite user by email - Supabase sends a confirmation email
    // so the user can set their own password. The trigger handle_new_user
    // will automatically create the profile row with full_name + role.
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name, role },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/confirm`,
      }
    )

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }

    const userId = inviteData.user.id

    // Update the auto-created profile with phone and department
    await adminClient
      .from('profiles')
      .update({
        phone: phone || null,
        department: department || null,
      })
      .eq('id', userId)

    return NextResponse.json({ success: true, userId }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
