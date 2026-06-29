import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Fetch offer details
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select(`
      *,
      customer:customers!customer_id(id, company_name)
    `)
    .eq('id', id)
    .single()

  if (offerError || !offer) {
    return NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 })
  }

  // 2. Fetch offer items with product details (including prescription text)
  const { data: items, error: itemsError } = await supabase
    .from('offer_items')
    .select(`
      *,
      product:products!product_id(
        id,
        referencia,
        descripcion,
        texto_prescripcion,
        familia
      )
    `)
    .eq('offer_id', id)
    .order('id')

  if (itemsError || !items) {
    return NextResponse.json({ error: 'Error al cargar los artículos de la oferta' }, { status: 500 })
  }

  // 3. Process items and group them into chapters
  const conceptMap = new Map<string, {
    code: string
    unit: string
    summary: string
    price: number
    prescription: string | null
  }>()

  // Helper to get or create a concept code and store its details
  function getOrCreateConcept(item: any): string {
    const ref = item.product?.referencia || item.external_ref || item.custom_ref || 'ART'
    const baseCode = ref.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_')
    
    const description = item.description || item.product?.descripcion || 'Artículo'
    const summary = description.trim().replace(/[|\r\n]/g, ' ')
    
    const price = Number(item.pvp || 0)
    const prescription = item.product?.texto_prescripcion || null
    const unit = 'ud'

    let suffix = 0
    let candidateCode = baseCode
    
    while (true) {
      const existing = conceptMap.get(candidateCode)
      if (!existing) {
        conceptMap.set(candidateCode, {
          code: candidateCode,
          unit,
          summary,
          price,
          prescription
        })
        return candidateCode
      }
      
      // If same code exists, reuse it if it's the same concept (same price and summary)
      if (Math.abs(existing.price - price) < 0.01 && existing.summary === summary) {
        return existing.code
      }
      
      suffix++
      candidateCode = `${baseCode}_${suffix}`
    }
  }

  const chapters: Array<{
    code: string
    title: string
    items: Array<{
      conceptCode: string
      quantity: number
    }>
  }> = []

  let currentChapter: typeof chapters[0] | null = null
  let chapterCounter = 1
  const chapterCodes = new Set<string>()

  function getUniqueChapterCode(index: number): string {
    let code = `C_${String(index).padStart(2, '0')}#`
    let suffix = 1
    while (conceptMap.has(code) || chapterCodes.has(code)) {
      code = `C_${String(index).padStart(2, '0')}_${suffix++}#`
    }
    chapterCodes.add(code)
    return code
  }

  for (const item of items) {
    if (item.type === 'section_header') {
      const capCode = getUniqueChapterCode(chapterCounter++)
      currentChapter = {
        code: capCode,
        title: (item.description || `Capítulo ${chapterCounter - 1}`).trim().replace(/[|\r\n]/g, ' '),
        items: []
      }
      chapters.push(currentChapter)
    } else if (item.type === 'article') {
      if (!currentChapter) {
        // Create default chapter if an article appears before any section header
        const capCode = getUniqueChapterCode(chapterCounter++)
        currentChapter = {
          code: capCode,
          title: 'Presupuesto',
          items: []
        }
        chapters.push(currentChapter)
      }
      
      const conceptCode = getOrCreateConcept(item)
      currentChapter.items.push({
        conceptCode,
        quantity: Number(item.quantity || 0)
      })
    }
  }

  // 4. Generate BC3 file content
  const lines: string[] = []

  // Version record (~V)
  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const yy = String(today.getFullYear()).slice(-2)
  const todayStr = `${dd}${mm}${yy}`
  lines.push(`~V|MYSSOLUTION|${todayStr}|FIEBDC-3/2004||UTF-8|`)

  // Parameters record (~K)
  // EUR, 2 decimals for prices, 3 for quantities, 2 for totals
  lines.push(`~K|EUR|2|3|2|3|2|0|`)

  // Root concept (~C)
  const rootCode = `OFERTA_${offer.offer_number}##`
  const rootTitle = (offer.title || `Oferta ${offer.offer_number}`).trim().replace(/[|\r\n]/g, ' ')
  lines.push(`~C|${rootCode}||${rootTitle}|||5|`)

  // Chapters (~C)
  for (const cap of chapters) {
    lines.push(`~C|${cap.code}||${cap.title}|||5|`)
  }

  // Articles (~C) and Long texts (~T)
  for (const concept of conceptMap.values()) {
    const priceStr = concept.price.toFixed(2)
    lines.push(`~C|${concept.code}|${concept.unit}|${concept.summary}|${priceStr}||4|`)
    
    if (concept.prescription) {
      const sanitizedPresc = concept.prescription
        .trim()
        .replace(/[|]/g, '_')          // remove pipe
        .replace(/\r?\n/g, '\\')        // replace newlines with backslash
      lines.push(`~T|${concept.code}|${sanitizedPresc}|`)
    }
  }

  // Decompositions (~D)
  // Root decomposes into chapters
  if (chapters.length > 0) {
    const rootDecParts = chapters.map(cap => `${cap.code}\\1`).join('\\')
    lines.push(`~D|${rootCode}|${rootDecParts}|`)
  }

  // Each chapter decomposes into its articles
  for (const cap of chapters) {
    if (cap.items.length > 0) {
      // Group items in the same chapter if they share the same concept code
      const groupedItemsMap = new Map<string, number>()
      for (const item of cap.items) {
        const currentQty = groupedItemsMap.get(item.conceptCode) || 0
        groupedItemsMap.set(item.conceptCode, currentQty + item.quantity)
      }

      const decParts = Array.from(groupedItemsMap.entries())
        .map(([conceptCode, quantity]) => `${conceptCode}\\${quantity}`)
        .join('\\')
      
      lines.push(`~D|${cap.code}|${decParts}|`)
    }
  }

  // Measurement records (~M)
  // For each chapter and its items, define the budget measurements (quantities)
  for (const cap of chapters) {
    // Chapter measurement of 1 under the root
    lines.push(`~M|${rootCode}\\${cap.code}|1|1.000|2\\\\1.000\\\\|`)
    
    if (cap.items.length > 0) {
      const groupedItemsMap = new Map<string, number>()
      for (const item of cap.items) {
        const currentQty = groupedItemsMap.get(item.conceptCode) || 0
        groupedItemsMap.set(item.conceptCode, currentQty + item.quantity)
      }

      let pos = 1
      for (const [conceptCode, quantity] of groupedItemsMap.entries()) {
        const qtyStr = quantity.toFixed(3)
        // ~M | CODIGO_PADRE\CODIGO_HIJO | POSICION | MEDICION | TIPO\COMENTARIO\UNIDADES\LONGITUD\LATITUD\ALTURA
        lines.push(`~M|${cap.code}\\${conceptCode}|${pos++}|${qtyStr}|2\\\\${qtyStr}\\\\|`)
      }
    }
  }

  const bc3Content = lines.join('\r\n') + '\r\n'
  const safeClient = (offer.customer?.company_name || 'Cliente')
    .replace(/[^\w\s\-ñáéíóúÑÁÉÍÓÚ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
  const filename = `OFERTA_${offer.offer_number}_${safeClient}.bc3`

  return new NextResponse(bc3Content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
