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

    // Process prices in batches for efficiency with large files
    let inserted = 0
    let updated = 0
    const priceErrors: string[] = []
    const BATCH_SIZE = 1000

    // Fetch existing prices for this tarifa in one query
    const { data: existingPrices, error: existingError } = await supabase
      .from('precios_producto')
      .select('id_precio, id_producto')
      .eq('id_tarifa', tarifaId)

    if (existingError) {
      return NextResponse.json({ error: `Error buscando precios existentes: ${existingError.message}` }, { status: 500 })
    }

    const existingPriceMap = new Map<number, number>() // id_producto -> id_precio
    existingPrices?.forEach(p => existingPriceMap.set(p.id_producto, p.id_precio))

    // Separate into insert and update batches
    const toInsert: typeof precios = []
    const toUpdate: Array<{ id_precio: number; precio: number }> = []

    for (const precio of precios) {
      const existingId = existingPriceMap.get(precio.id_producto)
      if (existingId) {
        toUpdate.push({ id_precio: existingId, precio: precio.precio })
      } else {
        toInsert.push(precio)
      }
    }

    // Process inserts in batches
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from('precios_producto')
        .insert(batch)
      if (error) {
        priceErrors.push(`Error en batch de inserts (${i}-${i + batch.length}): ${error.message}`)
      } else {
        inserted += batch.length
      }
    }

    // Process updates individually (Supabase no tiene upsert batch directamente)
    for (const upd of toUpdate) {
      const { error } = await supabase
        .from('precios_producto')
        .update({ precio: upd.precio })
        .eq('id_precio', upd.id_precio)
      if (error) {
        priceErrors.push(`Error actualizando precio ${upd.id_precio}: ${error.message}`)
      } else {
        updated++
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
