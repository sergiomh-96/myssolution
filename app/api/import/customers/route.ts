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
    let updated = 0
    const errors: string[] = []

    for (const row of rows) {
      // Normalise keys to lowercase
      const r: Record<string, string> = {}
      for (const [k, v] of Object.entries(row)) r[k.toLowerCase().trim()] = String(v ?? '').trim()

      const company_name = r['company_name'] || r['nombre_empresa'] || r['empresa']
      if (!company_name) { errors.push(`Fila sin company_name: ${JSON.stringify(row)}`); continue }

      const customerData: Record<string, unknown> = {
        company_name,
        contact_name: r['contact_name'] || r['nombre_contacto'] || null,
        contact_email: r['contact_email'] || r['email_contacto'] || null,
        contact_phone: r['contact_phone'] || r['telefono'] || null,
        address: r['address'] || r['direccion'] || null,
        ciudad: r['ciudad'] || r['city'] || null,
        provincia: r['provincia'] || null,
        codigo_postal: r['codigo_postal'] || r['cp'] || null,
        pais: r['pais'] || r['country'] || null,
        nif: r['nif'] || r['cif'] || null,
        industry: r['industry'] || r['sector'] || null,
        website: r['website'] || null,
        forma_pago: r['forma_pago'] || null,
        notas_cliente: r['notas_cliente'] || r['notas'] || null,
        status: (['active', 'inactive', 'prospect', 'churned'].includes(r['status']) ? r['status'] : 'active') as string,
        descuento_agfri: r['descuento_agfri'] ? parseInt(r['descuento_agfri']) || 0 : 0,
        descuento_difusion: r['descuento_difusion'] ? parseInt(r['descuento_difusion']) || 0 : 0,
        descuento_sistemas: r['descuento_sistemas'] ? parseInt(r['descuento_sistemas']) || 0 : 0,
      }

      // Check if customer already exists by company_name
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .ilike('company_name', company_name)
        .limit(1)
        .single()

      if (existing) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', existing.id)
        if (error) errors.push(`Error actualizando "${company_name}": ${error.message}`)
        else updated++
      } else {
        const { error } = await supabase
          .from('customers')
          .insert(customerData)
        if (error) errors.push(`Error insertando "${company_name}": ${error.message}`)
        else inserted++
      }
    }

    return NextResponse.json({ inserted, updated, errors })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 })
  }
}
