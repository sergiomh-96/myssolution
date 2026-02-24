import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireProfile } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const profile = await requireProfile()
    
    // Only admins can create users
    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    console.log('[v0] Received body:', body)
    
    const { full_name, email, phone, department, role, password } = body

    if (!full_name || !email || !password || !role) {
      console.log('[v0] Missing fields - full_name:', full_name, 'email:', email, 'password:', password, 'role:', role)
      return NextResponse.json(
        { error: 'Missing required fields: full_name, email, password, role' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
      },
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Create profile in database
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user!.id,
        full_name,
        email,
        phone: phone || null,
        department: department || null,
        role,
      })
      .select()
      .single()

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user!.id)
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    return NextResponse.json(profileData, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
