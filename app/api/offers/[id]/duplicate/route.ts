import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const profile = await requireProfile()
    const { id } = await params
    const supabase = await createClient()

    // Get the offer to duplicate
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', id)
      .single()

    if (offerError || !offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Get the highest offer number for this year to generate a new one
    const year = new Date(offer.created_at).getFullYear()
    const { data: maxOfferData } = await supabase
      .from('offers')
      .select('offer_number')
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`)
      .order('offer_number', { ascending: false })
      .limit(1)

    const newOfferNumber = maxOfferData && maxOfferData.length > 0 
      ? maxOfferData[0].offer_number + 1 
      : 1

    // Create new offer with copied data
    const { data: newOffer, error: createError } = await supabase
      .from('offers')
      .insert({
        customer_id: offer.customer_id,
        contact_id: offer.contact_id,
        title: `${offer.title} (COPIA)`,
        description: offer.description,
        notas_internas: offer.notas_internas,
        notes: offer.notes,
        tarifa_id: offer.tarifa_id,
        offer_number: newOfferNumber,
        currency: offer.currency,
        visible: true,
        status: 'draft',
        created_by: profile.id,
        assigned_to: offer.assigned_to,
      })
      .select()
      .single()

    if (createError || !newOffer) {
      return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 })
    }

    // Get offer items from original offer
    const { data: items, error: itemsError } = await supabase
      .from('offer_items')
      .select('*')
      .eq('offer_id', id)

    if (!itemsError && items && items.length > 0) {
      // Copy items to new offer
      const itemsToInsert = items.map(item => ({
        offer_id: newOffer.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        pvp: item.pvp,
        discount1: item.discount1,
        discount2: item.discount2,
        neto_total1: item.neto_total1,
        neto_total2: item.neto_total2,
        pvp_total: item.pvp_total,
      }))

      const { error: insertError } = await supabase
        .from('offer_items')
        .insert(itemsToInsert)

      if (insertError) {
        return NextResponse.json({ error: 'Failed to copy items' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      newOfferId: newOffer.id,
      newOfferNumber: newOfferNumber
    })
  } catch (error) {
    console.error('[v0] Error duplicating offer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
