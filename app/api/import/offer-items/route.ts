import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    await requireProfile()
    const supabase = await createClient()

    const { items, offerId } = await request.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    if (!offerId) {
      return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 })
    }

    // Get offer data to access tarifa_id
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('tarifa_id')
      .eq('id', offerId)
      .single()

    if (offerError || !offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Process items: map referencia to product_id and fill nulls
    const processedItems = []
    const notFound: string[] = []

    for (const item of items) {
      if (!item.referencia) continue

      // Find product by referencia
      const { data: product } = await supabase
        .from('products')
        .select('id, descripcion')
        .eq('referencia', item.referencia)
        .limit(1)
        .single()

      if (!product) {
        notFound.push(item.referencia)
        continue
      }

      // Get price from offer's tarifa if pvp is not provided
      let pvp = parseFloat(item.pvp) || 0
      if (!item.pvp && offer.tarifa_id) {
        const { data: precioData } = await supabase
          .from('precios_producto')
          .select('precio')
          .eq('id_tarifa', offer.tarifa_id)
          .eq('id_producto', product.id)
          .limit(1)
          .single()
        if (precioData) {
          pvp = parseFloat(String(precioData.precio)) || 0
        }
      }

      const quantity = parseInt(item.quantity) || 1
      const pvpTotal = item.pvp_total ? parseFloat(item.pvp_total) : pvp * quantity
      const discount1 = parseFloat(item.discount1) || 0
      const discount2 = parseFloat(item.discount2) || 0

      processedItems.push({
        offer_id: offerId,
        product_id: product.id,
        description: item.description || product.descripcion || '',
        quantity,
        pvp,
        pvp_total: pvpTotal,
        discount1,
        discount2,
        neto_total1: item.neto_total1 ? parseFloat(item.neto_total1) : pvpTotal * (1 - discount1 / 100),
        neto_total2: item.neto_total2 ? parseFloat(item.neto_total2) : pvpTotal * (1 - discount1 / 100) * (1 - discount2 / 100),
      })
    }

    if (processedItems.length === 0) {
      return NextResponse.json({
        error: 'No valid items found',
        notFound,
      }, { status: 400 })
    }

    // Insert items
    const { data, error } = await supabase
      .from('offer_items')
      .insert(processedItems)
      .select()

    if (error) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length ?? 0,
      notFound,
    })
  } catch (error) {
    console.error('[v0] Error importing offer items:', error)
    return NextResponse.json(
      { error: `Server error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
