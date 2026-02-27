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

    // Process items: map referencia to product_id
    const processedItems = []
    const notFound: string[] = []

    for (const item of items) {
      if (!item.referencia) continue

      // Find product by referencia
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('referencia', item.referencia)
        .limit(1)
        .single()

      if (!product) {
        notFound.push(item.referencia)
        continue
      }

      processedItems.push({
        offer_id: offerId,
        product_id: product.id,
        description: item.description || '',
        quantity: parseInt(item.quantity) || 1,
        pvp: parseFloat(item.pvp) || 0,
        pvp_total: parseFloat(item.pvp_total) || 0,
        discount1: parseFloat(item.discount1) || 0,
        discount2: parseFloat(item.discount2) || 0,
        neto_total1: parseFloat(item.neto_total1) || 0,
        neto_total2: parseFloat(item.neto_total2) || 0,
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
