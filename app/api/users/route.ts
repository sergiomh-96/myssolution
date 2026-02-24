import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireProfile } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

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

    // First, create a user in the profiles table directly
    // Generate a temporary user ID
    const userId = uuidv4()
    
    console.log('[v0] Creating profile with ID:', userId)

    // Create profile in database
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name,
        email,
        phone: phone || null,
        department: department || null,
        role,
      })
      .select()
      .single()

    if (profileError) {
      console.error('[v0] Profile error:', profileError)
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    console.log('[v0] User profile created successfully:', profileData)
    
    // TODO: Consider setting up proper auth integration later
    // For now, the user profile is created but auth needs to be set up separately
    
    return NextResponse.json(profileData, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
