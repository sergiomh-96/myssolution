import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    await requireRole(['admin'])
    const supabase = await createClient()

    const body = await request.json()
    const { tarifaName, fechaInicio, fechaFin, rows } = body as {
      tarifaName: string
      fechaInicio?: string
      fechaFin?: string
      rows: Record<string, unknown>[]
    }

    if (!tarifaName) {
      return NextResponse.json({ error: 'Tarifa name is required' }, { status: 400 })
    }
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    // 1. Create or find the tarifa
    let tarifaId: number

    const { data: existingTarifa } = await supabase
      .from('tarifas')
      .select('id_tarifa')
      .eq('nombre', tarifaName)
      .single()

    if (existingTarifa) {
      tarifaId = existingTarifa.id_tarifa
      // Update dates if provided
      await supabase
        .from('tarifas')
        .update({
          ...(fechaInicio ? { fecha_inicio: new Date(fechaInicio).toISOString() } : {}),
          ...(fechaFin ? { fecha_fin: new Date(fechaFin).toISOString() } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id_tarifa', tarifaId)
    } else {
      const { data: newTarifa, error: tarifaError } = await supabase
        .from('tarifas')
        .insert({
          nombre: tarifaName,
          fecha_inicio: fechaInicio ? new Date(fechaInicio).toISOString() : null,
          fecha_fin: fechaFin ? new Date(fechaFin).toISOString() : null,
        })
        .select('id_tarifa')
        .single()

      if (tarifaError || !newTarifa) {
        return NextResponse.json({ error: `Error creating tarifa: ${tarifaError?.message}` }, { status: 500 })
      }
      tarifaId = newTarifa.id_tarifa
    }

    // 2. For each row, look up the product by referencia and upsert the precio
    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const row of rows) {
      const referencia = String(row['referencia'] ?? row['Referencia'] ?? '').trim()
      const precio = Number(row['precio'] ?? row['Precio'] ?? row['pvp'] ?? row['PVP'] ?? 0)

      if (!referencia) { skipped++; continue }
      if (isNaN(precio) || precio < 0) { errors.push(`Referencia "${referencia}": precio inválido`); skipped++; continue }

      // Find the product
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('referencia', referencia)
        .single()

      if (!product) {
        errors.push(`Referencia "${referencia}": producto no encontrado`)
        skipped++
        continue
      }

      // Upsert precio for this product+tarifa
      const { error: precioError } = await supabase
        .from('precios_producto')
        .upsert(
          {
            id_producto: product.id,
            id_tarifa: tarifaId,
            precio,
          },
          { onConflict: 'id_producto,id_tarifa', ignoreDuplicates: false }
        )

      if (precioError) {
        errors.push(`Referencia "${referencia}": ${precioError.message}`)
        skipped++
      } else {
        imported++
      }
    }

    return NextResponse.json({
      success: true,
      tarifaId,
      tarifaName,
      imported,
      skipped,
      errors: errors.slice(0, 20), // cap error list
      total: rows.length,
    })
  } catch (error) {
    return NextResponse.json({ error: `Server error: ${error instanceof Error ? error.message : 'Unknown'}` }, { status: 500 })
  }
}
