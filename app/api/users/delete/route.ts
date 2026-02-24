import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireProfile } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const profile = await requireProfile()
    
    // Only admins can delete users
    if (profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Delete user from auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Delete profile from database (cascade will handle related records)
    await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
