import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { UserRole, Profile } from '@/lib/types/database'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  return user
}

export async function getUserProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const user = await getCurrentUser()
  
  if (!user) {
    return null
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return profile
}

export async function requireProfile() {
  const profile = await getUserProfile()
  
  if (!profile) {
    redirect('/auth/login')
  }
  
  return profile
}

export async function hasRole(allowedRoles: UserRole[]): Promise<boolean> {
  const profile = await getUserProfile()
  
  if (!profile) {
    return false
  }
  
  return allowedRoles.includes(profile.role)
}

export async function requireRole(allowedRoles: UserRole[]) {
  const profile = await requireProfile()
  
  if (!allowedRoles.includes(profile.role)) {
    redirect('/dashboard')
  }
  
  return profile
}

export function canManageOffers(role: UserRole): boolean {
  return ['admin', 'manager', 'sales_rep'].includes(role)
}

export function canApproveOffers(role: UserRole): boolean {
  return ['admin', 'manager'].includes(role)
}

export function canManageRequests(role: UserRole): boolean {
  return ['admin', 'manager', 'support_agent'].includes(role)
}

export function canViewAnalytics(role: UserRole): boolean {
  return ['admin', 'manager', 'viewer'].includes(role)
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin'
}
