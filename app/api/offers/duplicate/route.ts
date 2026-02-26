import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const profile = await requireProfile()
    const supabase = await createClient()

    // Get id from query parameters
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 })
    }

    console.log('[v0] Starting duplicate for offer:', id)

    // Get the offer to duplicate
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', id)
      .single()

    if (offerError || !offer) {
      console.error('[v0] Error fetching offer:', offerError)
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    console.log('[v0] Found offer:', offer.id, 'title:', offer.title)

    // Get the highest offer number globally to generate a new sequential one
    const { data: maxOfferData, error: maxError } = await supabase
      .from('offers')
      .select('offer_number')
      .order('offer_number', { ascending: false })
      .limit(1)

    if (maxError) console.error('[v0] Error getting max offer_number:', maxError)

    const newOfferNumber = maxOfferData && maxOfferData.length > 0 
      ? (maxOfferData[0].offer_number ?? 0) + 1 
      : 1

    console.log('[v0] New offer number will be:', newOfferNumber)

    // Create new offer with copied data - ONLY required fields
    const { data: newOffer, error: createError } = await supabase
      .from('offers')
      .insert({
        customer_id: offer.customer_id,
        title: `${offer.title} (COPIA)`,
        description: offer.description || '',
        notas_internas: offer.notas_internas || '',
        notes: offer.notes || '',
        tarifa_id: offer.tarifa_id,
        offer_number: newOfferNumber,
        currency: offer.currency || 'EUR',
        visible: true,
        status: 'draft',
        created_by: profile.id,
        contact_id: offer.contact_id || null,
        assigned_to: offer.assigned_to || null,
      })
      .select()
      .single()

    if (createError || !newOffer) {
      console.error('[v0] Error creating new offer:', createError)
      return NextResponse.json({ error: `Failed to create offer: ${createError?.message}` }, { status: 500 })
    }

    console.log('[v0] Created new offer:', newOffer.id)

    // Get offer items from original offer
    const { data: items, error: itemsError } = await supabase
      .from('offer_items')
      .select('*')
      .eq('offer_id', id)

    if (itemsError) {
      console.error('[v0] Error fetching offer items:', itemsError)
    } else if (items && items.length > 0) {
      console.log('[v0] Found', items.length, 'items to copy')

      // Copy items to new offer
      const itemsToInsert = items.map((item: any) => ({
        offer_id: newOffer.id,
        product_id: item.product_id,
        description: item.description || '',
        quantity: item.quantity,
        pvp: item.pvp,
        discount1: item.discount1 || 0,
        discount2: item.discount2 || 0,
        neto_total1: item.neto_total1,
        neto_total2: item.neto_total2,
        pvp_total: item.pvp_total,
      }))

      const { error: insertError } = await supabase
        .from('offer_items')
        .insert(itemsToInsert)

      if (insertError) {
        console.error('[v0] Error copying items:', insertError)
        // Don't fail the whole operation, items copy is secondary
      } else {
        console.log('[v0] Successfully copied', items.length, 'items')
      }
    }

    // Copy offer assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('offer_assignments')
      .select('*')
      .eq('offer_id', id)

    if (assignmentsError) {
      console.error('[v0] Error fetching offer assignments:', assignmentsError)
    } else if (assignments && assignments.length > 0) {
      console.log('[v0] Found', assignments.length, 'assignments to copy')

      const assignmentsToInsert = assignments.map((assignment: any) => ({
        offer_id: newOffer.id,
        user_id: assignment.user_id,
      }))

      const { error: assignInsertError } = await supabase
        .from('offer_assignments')
        .insert(assignmentsToInsert)

      if (assignInsertError) {
        console.error('[v0] Error copying assignments:', assignInsertError)
      } else {
        console.log('[v0] Successfully copied', assignments.length, 'assignments')
      }
    }

    console.log('[v0] Duplicate complete for offer:', newOffer.id)

    return NextResponse.json({ 
      success: true, 
      newOfferId: newOffer.id,
      newOfferNumber: newOfferNumber
    })
  } catch (error) {
    console.error('[v0] Unexpected error in duplicate route:', error)
    return NextResponse.json({ error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown'}` }, { status: 500 })
  }
}
