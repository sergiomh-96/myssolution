import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireProfile } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const profile = await requireProfile()

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { full_name, email, phone, department, role, password_mode, password } = await request.json()

    if (!full_name || !email || !role) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, email y rol' },
        { status: 400 }
      )
    }

    if (password_mode === 'manual' && (!password || password.length < 8)) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Remove any orphan profile (created without a real auth account)
    await adminClient.from('profiles').delete().eq('email', email)

    let userId: string

    if (password_mode === 'manual') {
      // Create user with a set password — immediate access, no email required
      const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role },
      })

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 })
      }

      userId = createData.user.id
    } else {
      // Invite mode — Supabase sends a set-password email
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

      userId = inviteData.user.id
    }

    // Update the auto-created profile with phone and department
    await adminClient
      .from('profiles')
      .update({ phone: phone || null, department: department || null })
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
