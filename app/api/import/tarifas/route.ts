import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    await requireRole(['admin'])
    const supabase = await createClient()

    const body = await request.json()
    const { tarifaNombre, tarifaFechaInicio, tarifaFechaFin, rows } = body as {
      tarifaNombre: string
      tarifaFechaInicio?: string
      tarifaFechaFin?: string
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
      // Update existing tarifa dates if provided
      await supabase
        .from('tarifas')
        .update({
          ...(tarifaFechaInicio ? { fecha_inicio: tarifaFechaInicio } : {}),
          ...(tarifaFechaFin ? { fecha_fin: tarifaFechaFin } : {}),
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
          fecha_inicio: tarifaFechaInicio || new Date().toISOString(),
          fecha_fin: tarifaFechaFin || null,
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

    // 4. Upsert prices (by id_tarifa + id_producto)
    const { data: inserted, error: preciosError } = await supabase
      .from('precios_producto')
      .upsert(precios, { onConflict: 'id_tarifa,id_producto', ignoreDuplicates: false })
      .select('id_precio')

    if (preciosError) {
      console.error('[v0] Tarifas import error:', preciosError)
      return NextResponse.json({ error: `Error guardando precios: ${preciosError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      tarifaId,
      inserted: inserted?.length ?? 0,
      notFound: notFound.slice(0, 20),
    })
  } catch (err) {
    console.error('[v0] Tarifas import unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
