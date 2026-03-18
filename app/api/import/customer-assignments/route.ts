import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    await requireRole(['admin'])
    const supabase = await createClient()
    const { rows } = await request.json()

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No hay filas para importar' }, { status: 400 })
    }

    let inserted = 0
    const notFound: string[] = []
    const errors: string[] = []

    for (const row of rows) {
      // Normalise keys to lowercase
      const r: Record<string, string> = {}
      for (const [k, v] of Object.entries(row)) r[k.toLowerCase().trim()] = String(v ?? '').trim()

      const company_name = r['company_name'] || r['nombre_empresa'] || r['empresa']
      const email = r['email'] || r['email_perfil'] || r['profile_email']

      if (!company_name || !email) {
        errors.push(`Fila incompleta (faltan company_name y/o email): ${JSON.stringify(row)}`)
        continue
      }

      // Find customer by company_name (case-insensitive)
      const { data: customer } = await supabase
        .from('customers')
        .select('id, company_name')
        .ilike('company_name', company_name)
        .limit(1)
        .single()

      if (!customer) {
        notFound.push(`Cliente no encontrado: "${company_name}"`)
        continue
      }

      // Find profile by email (case-insensitive)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', email)
        .limit(1)
        .single()

      if (!profile) {
        notFound.push(`Perfil no encontrado con email: "${email}"`)
        continue
      }

      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('customer_profile_assignments')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('profile_id', profile.id)
        .limit(1)
        .single()

      if (existing) {
        // Already assigned, skip
        continue
      }

      // Insert assignment
      const { error } = await supabase
        .from('customer_profile_assignments')
        .insert({
          customer_id: customer.id,
          profile_id: profile.id,
        })

      if (error) {
        errors.push(`Error asignando "${email}" a "${company_name}": ${error.message}`)
      } else {
        inserted++
      }
    }

    return NextResponse.json({ inserted, notFound, errors })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
  }
}
