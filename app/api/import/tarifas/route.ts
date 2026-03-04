import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    await requireRole(['admin'])

    const body = await request.json()
    const { tarifaNombre, rows } = body as {
      tarifaNombre: string
      rows: Record<string, string>[]
    }

    if (!tarifaNombre || tarifaNombre.trim() === '') {
      return NextResponse.json({ error: 'El nombre de la tarifa es obligatorio' }, { status: 400 })
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No hay filas de precios para importar' }, { status: 400 })
    }

    // 1. Upsert the tarifa (by name)
    const { data: existingTarifa } = await supabase
      .from('tarifas')
      .select('id_tarifa')
      .eq('nombre', tarifaNombre.trim())
      .maybeSingle()

    let tarifaId: number

    if (existingTarifa) {
      // Update existing tarifa
      await supabase
        .from('tarifas')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id_tarifa', existingTarifa.id_tarifa)

      tarifaId = existingTarifa.id_tarifa
    } else {
      // Create new tarifa
      const { data: newTarifa, error: tarifaError } = await supabase
        .from('tarifas')
        .insert({
          nombre: tarifaNombre.trim(),
          fecha_inicio: new Date().toISOString(),
          fecha_fin: null,
        })
        .select('id_tarifa')
        .single()

      if (tarifaError || !newTarifa) {
        return NextResponse.json({ error: `Error creando tarifa: ${tarifaError?.message}` }, { status: 500 })
      }
      tarifaId = newTarifa.id_tarifa
    }

    // 2. Resolve product references to IDs
    const referencias = rows
      .map(r => (r['referencia'] ?? r['REFERENCIA'] ?? '').toString().trim())
      .filter(r => r.length > 0)

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, referencia')
      .in('referencia', referencias)

    if (productsError) {
      return NextResponse.json({ error: `Error buscando productos: ${productsError.message}` }, { status: 500 })
    }

    const refToId = new Map<string, number>()
    products?.forEach(p => refToId.set(p.referencia, p.id))

    // 3. Build precios_producto rows
    const precios: { id_tarifa: number; id_producto: number; precio: number }[] = []
    const notFound: string[] = []

    for (const row of rows) {
      const ref = (row['referencia'] ?? row['REFERENCIA'] ?? '').toString().trim()
      const precioStr = (row['precio'] ?? row['PRECIO'] ?? '').toString().replace(',', '.')
      const precio = parseFloat(precioStr)

      if (!ref) continue
      if (isNaN(precio)) continue

      const productId = refToId.get(ref)
      if (!productId) {
        notFound.push(ref)
        continue
      }

      precios.push({ id_tarifa: tarifaId, id_producto: productId, precio })
    }

    if (precios.length === 0) {
      return NextResponse.json({
        error: 'Ninguna fila tiene referencia y precio válidos. ' +
          (notFound.length > 0 ? `Referencias no encontradas: ${notFound.slice(0, 10).join(', ')}` : '')
      }, { status: 400 })
    }

    // Process each price individually: check if exists by tarifa+producto, then update or insert
    let inserted = 0
    let updated = 0
    const priceErrors: string[] = []

    for (const precio of precios) {
      try {
        const { data: existing, error: existingError } = await supabase
          .from('precios_producto')
          .select('id_precio')
          .eq('id_tarifa', precio.id_tarifa)
          .eq('id_producto', precio.id_producto)
          .limit(1)
          .maybeSingle()

        if (existingError) {
          priceErrors.push(`Error buscando precio existente: ${existingError.message}`)
          continue
        }

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('precios_producto')
            .update({ precio })
            .eq('id_precio', existing.id_precio)
          if (error) priceErrors.push(`Error actualizando precio: ${error.message}`)
          else updated++
        } else {
          // Insert new
          const { error } = await supabase
            .from('precios_producto')
            .insert(precio)
          if (error) priceErrors.push(`Error insertando precio: ${error.message}`)
          else inserted++
        }
      } catch (err) {
        priceErrors.push(`Error procesando precio: ${err instanceof Error ? err.message : 'Error desconocido'}`)
      }
    }

    return NextResponse.json({
      success: true,
      tarifaId,
      inserted,
      updated,
      notFound: notFound.slice(0, 20),
      errors: priceErrors,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[v0] Tarifas import error:', errorMessage)
    console.error('[v0] Full error:', err)
    return NextResponse.json({ 
      error: `Error interno del servidor: ${errorMessage}` 
    }, { status: 500 })
  }
}
