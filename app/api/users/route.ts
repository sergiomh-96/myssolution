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

    // Delete any orphan profile with this email that has no matching auth user
    // (e.g. profiles created directly in the DB without a real auth account)
    await adminClient
      .from('profiles')
      .delete()
      .eq('email', email)

    // Invite user — Supabase sends a confirmation/set-password email.
    // The trigger handle_new_user auto-creates the profile with full_name + role.
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
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        phone: phone || null,
        department: department || null,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Profile update error:', updateError)
    }

    return NextResponse.json({ success: true, userId }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
