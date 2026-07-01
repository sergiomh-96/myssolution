import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ── Encoding ────────────────────────────────────────────────────────────────

function encodeWindows1252(str: string): Buffer {
  const buf = Buffer.alloc(str.length)
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 256)       buf[i] = code
    else if (code === 0x20AC) buf[i] = 0x80 // €
    else                   buf[i] = 63       // '?' fallback
  }
  return buf
}

// ── Text helpers ─────────────────────────────────────────────────────────────

/** Strip characters that break FIEBDC-3 pipe-delimited fields */
function sanitizeField(text: string): string {
  return text
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\|/g, '-')
    .replace(/~/g, '-')
    .trim()
}

/** Clean a concept code: uppercase, no spaces, only safe chars */
function sanitizeCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')              // no spaces allowed in codes
    .replace(/[^A-Z0-9_\-\.]/g, '_') // only alphanumeric, _, -, .
}

/** Format quantity for ~D records: integer if whole, else up to 3 decimal places */
function fmtQty(qty: number): string {
  if (Number.isInteger(qty)) return qty.toString()
  return parseFloat(qty.toFixed(3)).toString()
}

/** Format price with exactly 3 decimal places (Arquimedes style) */
function fmtPrice(price: number): string {
  return price.toFixed(3)
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = new URL(req.url)
  const encoding = url.searchParams.get('encoding') || 'utf8'
  const supabase = await createClient()

  // 1. Fetch offer
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select(`*, customer:customers!customer_id(id, company_name)`)
    .eq('id', id)
    .single()

  if (offerError || !offer) {
    return NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 })
  }

  // 2. Fetch items
  const { data: items, error: itemsError } = await supabase
    .from('offer_items')
    .select(`
      *,
      product:products!product_id(id, referencia, descripcion, texto_prescripcion, familia)
    `)
    .eq('offer_id', id)
    .order('id')

  if (itemsError || !items) {
    return NextResponse.json({ error: 'Error al cargar los artículos de la oferta' }, { status: 500 })
  }

  // ── 3. Group items into chapters ──────────────────────────────────────────

  const conceptMap = new Map<string, {
    code: string
    unit: string
    summary: string   // short label (shown in ~C summary field)
    longText: string  // long description for ~T record
    price: number
  }>()

  function getOrCreateConcept(item: any): string {
    const rawRef = item.product?.referencia || item.external_ref || item.custom_ref || 'ART'
    const baseCode = sanitizeCode(rawRef)

    const description = item.description || item.product?.descripcion || 'Artículo'
    const summary = sanitizeField(description)
    // Use the product reference as short label (like Arquimedes: "MR01 350X150CB")
    const longText = sanitizeField(item.product?.texto_prescripcion || description)
    const price = Number(item.pvp || 0)
    const unit = 'ud'

    let suffix = 0
    let candidateCode = baseCode

    while (true) {
      const existing = conceptMap.get(candidateCode)
      if (!existing) {
        conceptMap.set(candidateCode, { code: candidateCode, unit, summary, longText, price })
        return candidateCode
      }
      if (Math.abs(existing.price - price) < 0.001 && existing.summary === summary) {
        return existing.code
      }
      suffix++
      candidateCode = `${baseCode}_${suffix}`
    }
  }

  type Chapter = {
    code: string
    title: string
    items: Array<{ conceptCode: string; quantity: number }>
  }
  const chapters: Chapter[] = []
  let currentChapter: Chapter | null = null
  let chapterCounter = 1
  const reservedCodes = new Set<string>()

  function nextChapterCode(): string {
    let code = `C${String(chapterCounter).padStart(2, '0')}#`
    let suffix = 1
    while (conceptMap.has(code) || reservedCodes.has(code)) {
      code = `C${String(chapterCounter).padStart(2, '0')}_${suffix++}#`
    }
    reservedCodes.add(code)
    chapterCounter++
    return code
  }

  for (const item of items) {
    if (item.type === 'section_header') {
      const capCode = nextChapterCode()
      const capTitle = sanitizeField(item.description || `Capítulo ${chapterCounter - 1}`)
      currentChapter = { code: capCode, title: capTitle, items: [] }
      chapters.push(currentChapter)
    } else if (item.type === 'article') {
      if (!currentChapter) {
        const capCode = nextChapterCode()
        currentChapter = { code: capCode, title: 'Presupuesto', items: [] }
        chapters.push(currentChapter)
      }
      const conceptCode = getOrCreateConcept(item)
      currentChapter.items.push({ conceptCode, quantity: Number(item.quantity || 0) })
    }
  }

  // Pre-compute chapter totals (needed for ~C records, like Arquimedes does)
  function chapterTotal(cap: Chapter): number {
    const grouped = new Map<string, number>()
    for (const it of cap.items) {
      grouped.set(it.conceptCode, (grouped.get(it.conceptCode) || 0) + it.quantity)
    }
    let total = 0
    for (const [code, qty] of grouped.entries()) {
      const concept = conceptMap.get(code)
      total += (concept?.price || 0) * qty
    }
    return total
  }

  const rootTotal = chapters.reduce((sum, cap) => sum + chapterTotal(cap), 0)

  // ── 4. Build BC3 lines ────────────────────────────────────────────────────
  //
  // Reference: PRUEBA_10a.bc3 exported by Arquimedes (FIEBDC-3/2016)
  //
  // ~V | GENERATOR | VERSION | PROGRAM || CHARSET | DOCTYPE |
  // ~K | ...complex... |
  // ~C | CODE | UNIT | SUMMARY | PRICE | DATE | TYPE |
  //   - TYPE = 0 for all (root, chapters, articles)
  //   - Chapters and root: price = calculated total, unit = empty
  //   - Articles: price = PVP (3 decimal places)
  // ~T | CODE | LONG_TEXT |
  // ~D | PARENT |          ← first line (field 2 empty, children on next lines)
  // |CHILD1\\QTY1          ← field 3 starts: CODE\\QTY (double-\\ = empty factor)
  // \CHILD2\\QTY2          ← more children
  // \|                     ← close field 3
  //
  // KEY RULES:
  //   • ~D uses 3-subcampo format per child: CODE \ [empty=factor] \ QTY
  //     written as CODE\\QTY (two backslashes = separator + empty + separator)
  //   • NO ~M records (Arquimedes does not generate them)
  //   • Codes must have no spaces

  const lines: string[] = []

  // Date string
  const today = new Date()
  const dateStr = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getFullYear()).slice(-2)}`

  // ~V – Version record
  // Field order: GENERATOR | VERSION | PROGRAM || CHARSET | DOCTYPE |
  // (NOT "date" in field 2 — that was wrong in our old implementation)
  if (encoding === 'ansi') {
    lines.push(`~V|MYSSOLUTION|FIEBDC-3/2004|MYSSOLUTION||ANSI||`)
  } else if (encoding === 'utf8_2024') {
    lines.push(`~V|MYSSOLUTION|FIEBDC-3/2024|MYSSOLUTION||UTF-8||`)
  } else {
    lines.push(`~V|MYSSOLUTION|FIEBDC-3/2020|MYSSOLUTION||UTF-8||`)
  }

  // ~K – simplified parameters
  lines.push(`~K|EUR|2|3|2|3|2|0|`)

  // ── ~C Concepts ───────────────────────────────────────────────────────────

  const rootCode = `OFERTA_${offer.offer_number}##`
  const rootTitle = sanitizeField(offer.title || `Oferta ${offer.offer_number}`)

  // Root (type 0, price = sum of all chapters)
  lines.push(`~C|${rootCode}||${rootTitle}|${fmtPrice(rootTotal)}|${dateStr}|0|`)

  // Chapters (type 0, price = sum of chapter items)
  for (const cap of chapters) {
    lines.push(`~C|${cap.code}||${cap.title}|${fmtPrice(chapterTotal(cap))}|${dateStr}|0|`)
    // ~T for chapter title (matching Arquimedes pattern)
    lines.push(`~T|${cap.code}|${cap.title}|`)
  }

  // Articles (type 0, price = PVP, 3 decimal places)
  for (const concept of conceptMap.values()) {
    lines.push(`~C|${concept.code}|${concept.unit}|${concept.summary}|${fmtPrice(concept.price)}|${dateStr}|0|`)
    lines.push(`~T|${concept.code}|${concept.longText}|`)
  }

  // ── ~D Decompositions (Arquimedes multi-line format) ──────────────────────
  //
  // Each child in field 3 uses format: CODE\\QTY
  //   In the actual file bytes: CODE + \ + \ + QTY
  //   Subfield reading (split on \): CODE, '' (empty factor=1), QTY
  //
  // Multi-line format:
  //   ~D|PARENT
  //   |CHILD1\\QTY1
  //   \CHILD2\\QTY2
  //   \|

  // Root → chapters
  if (chapters.length > 0) {
    lines.push(`~D|${rootCode}`)
    chapters.forEach((cap, i) => {
      const prefix = i === 0 ? '|' : '\\'
      // Each chapter has qty=1 in the root
      lines.push(`${prefix}${cap.code}\\\\1`)
    })
    lines.push(`\\|`)
  }

  // Chapters → articles
  for (const cap of chapters) {
    if (cap.items.length === 0) continue

    const grouped = new Map<string, number>()
    for (const it of cap.items) {
      grouped.set(it.conceptCode, (grouped.get(it.conceptCode) || 0) + it.quantity)
    }

    lines.push(`~D|${cap.code}`)
    let firstItem = true
    for (const [code, qty] of grouped.entries()) {
      const prefix = firstItem ? '|' : '\\'
      firstItem = false
      lines.push(`${prefix}${code}\\\\${fmtQty(qty)}`)
    }
    lines.push(`\\|`)
  }

  // ── Output ────────────────────────────────────────────────────────────────

  const bc3Content = lines.join('\r\n') + '\r\n'
  const safeClient = (offer.customer?.company_name || 'Cliente')
    .replace(/[^\w\s\-ñáéíóúÑÁÉÍÓÚ]/g, '').trim().replace(/\s+/g, '_')
  const filename = `OFERTA_${offer.offer_number}_${safeClient}.bc3`

  if (encoding === 'ansi') {
    return new NextResponse(encodeWindows1252(bc3Content), {
      headers: {
        'Content-Type': 'text/plain; charset=windows-1252',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return new NextResponse(bc3Content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
