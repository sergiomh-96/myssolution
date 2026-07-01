import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  // 3. Group items into chapters (same logic as bc3 route)
  function sanitizeCode(raw: string): string {
    return raw.trim().toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9_\-\.]/g, '_')
  }

  type Chapter = {
    code: string
    title: string
    items: Array<{
      code: string
      unit: string
      summary: string
      longText: string
      pvp: number
      quantity: number
    }>
  }

  const chapters: Chapter[] = []
  let currentChapter: Chapter | null = null
  let chapterCounter = 1

  for (const item of items) {
    if (item.type === 'section_header') {
      const rawCode = sanitizeCode(`C${String(chapterCounter++).padStart(2, '0')}`)
      currentChapter = {
        code: rawCode,
        title: (item.description || `Capítulo ${chapterCounter - 1}`).trim(),
        items: []
      }
      chapters.push(currentChapter)
    } else if (item.type === 'article') {
      if (!currentChapter) {
        currentChapter = { code: 'C01', title: 'Presupuesto', items: [] }
        chapters.push(currentChapter)
        chapterCounter = 2
      }
      const rawRef = item.product?.referencia || item.external_ref || item.custom_ref || 'ART'
      currentChapter.items.push({
        code: sanitizeCode(rawRef),
        unit: 'ud',
        summary: (item.description || item.product?.descripcion || 'Artículo').trim(),
        longText: (item.product?.texto_prescripcion || '').trim(),
        pvp: Number(item.pvp || 0),
        quantity: Number(item.quantity || 0),
      })
    }
  }

  // 4. Compute totals
  function chapterTotal(cap: Chapter): number {
    return cap.items.reduce((s, it) => s + it.pvp * it.quantity, 0)
  }
  const rootTotal = chapters.reduce((s, cap) => s + chapterTotal(cap), 0)
  const offerCode = sanitizeCode(`OFERTA_${offer.offer_number}`)
  const offerTitle = (offer.title || `Oferta ${offer.offer_number}`).trim()

  // 5. Number formatter — Spanish locale, comma decimal, dot thousands
  function fmt(n: number, decimals = 2): string {
    return n.toLocaleString('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Build HTML-based Excel (mimics Arquimedes measurement format)
  //
  // Layout (13 columns: A–M):
  //   A: Código  B: Tipo  C: Ud  D-J: Resumen (colspan 7)  K: Cantidad  L: Precio(€)  M: Importe(€)
  //
  // Colour palette (matching image):
  //   Dark green  #375623  (root / chapter header rows)      text white
  //   Mid green   #70AD47  (article/partida rows)            text white
  //   Light green #E2EFDA  (description rows below articles) text default
  //   Light green #C6EFCE  (chapter subtotal rows)           text default
  // ─────────────────────────────────────────────────────────────────────────

  const COL_SPAN = 7   // columns D–J merged for Resumen
  const TOTAL_COLS = 13

  // Styles (inline so Excel renders them correctly)
  const S = {
    rootRow:  'background:#375623; color:#FFFFFF; font-weight:bold;',
    capRow:   'background:#375623; color:#FFFFFF; font-weight:bold;',
    artRow:   'background:#70AD47; color:#FFFFFF;',
    descRow:  'background:#E2EFDA; color:#595959; font-size:9pt;',
    subRow:   'background:#C6EFCE; font-weight:bold;',
    hdrRow:   'background:#375623; color:#FFFFFF; font-weight:bold;',
    numRight: 'text-align:right;',
    center:   'text-align:center;',
    border:   'border:0.5pt solid #A9D18E;',
    noBorder: 'border:none;',
  }

  function td(content: string, style = '', extra = ''): string {
    return `<td style="${S.border}${style}" ${extra}>${content}</td>`
  }
  function tdEmpty(style = ''): string { return td('', style) }
  function tr(cells: string, rowStyle = ''): string {
    return `<tr style="${rowStyle}">${cells}</tr>\n`
  }

  let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]><xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Presupuesto</x:Name>
    <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml><![endif]-->
<style>
  table { border-collapse:collapse; font-family:Arial, sans-serif; font-size:10pt; }
  td { padding:3px 5px; vertical-align:middle; white-space:nowrap; }
</style>
</head>
<body>
<table>
`

  // ── Row 1: Obra header ───────────────────────────────────────────────────
  html += tr(
    `<td colspan="${TOTAL_COLS}" style="${S.noBorder} font-weight:bold; font-size:12pt;">`
    + `Obra: ${offerCode}</td>`,
    S.noBorder
  )

  // ── Row 2: Presupuesto + % C.I. ─────────────────────────────────────────
  html += tr(
    `<td colspan="10" style="${S.noBorder} font-weight:bold; font-size:11pt;">Presupuesto</td>`
    + `<td colspan="3" style="${S.noBorder} text-align:right; font-size:9pt;">% C.I.&nbsp;&nbsp;3</td>`,
    S.noBorder
  )

  // ── Row 3: Column headers ────────────────────────────────────────────────
  html += tr(
    td('Código',      S.hdrRow)
    + td('Tipo',      S.hdrRow)
    + td('Ud',        S.hdrRow + S.center)
    + `<td colspan="${COL_SPAN}" style="${S.border}${S.hdrRow}">Resumen</td>`
    + td('Cantidad',  S.hdrRow + S.numRight)
    + td('Precio (€)', S.hdrRow + S.numRight)
    + td('Importe (€)', S.hdrRow + S.numRight)
  )

  // ── Row 4: Root row ──────────────────────────────────────────────────────
  html += tr(
    td(offerCode,         S.rootRow)
    + td('Capítulo',      S.rootRow)
    + tdEmpty(S.rootRow)
    + `<td colspan="${COL_SPAN}" style="${S.border}${S.rootRow}">${offerTitle}</td>`
    + tdEmpty(S.rootRow + S.numRight)
    + td(fmt(rootTotal),  S.rootRow + S.numRight)
    + td(fmt(rootTotal),  S.rootRow + S.numRight)
  )

  // ── Chapters ─────────────────────────────────────────────────────────────
  for (const cap of chapters) {
    const capTotal = chapterTotal(cap)

    // Chapter header row (dark green)
    html += tr(
      td(cap.code,         S.capRow)
      + td('Capítulo',     S.capRow)
      + tdEmpty(S.capRow)
      + `<td colspan="${COL_SPAN}" style="${S.border}${S.capRow}">${cap.title}</td>`
      + tdEmpty(S.capRow + S.numRight)
      + td(fmt(capTotal),  S.capRow + S.numRight)
      + td(fmt(capTotal),  S.capRow + S.numRight)
    )

    // Articles
    for (const art of cap.items) {
      const artTotal = art.pvp * art.quantity

      // Article row (mid green)
      html += tr(
        td(art.code,                           S.artRow)
        + td('Partida',                        S.artRow)
        + td(art.unit,                         S.artRow + S.center)
        + `<td colspan="${COL_SPAN}" style="${S.border}${S.artRow}">${art.summary}</td>`
        + td(fmt(art.quantity, 3),             S.artRow + S.numRight)
        + td(fmt(art.pvp, 2),                  S.artRow + S.numRight)
        + td(fmt(artTotal, 2),                 S.artRow + S.numRight)
      )

      // Long text / description row (light green)
      if (art.longText) {
        html += tr(
          tdEmpty(S.descRow)
          + tdEmpty(S.descRow)
          + tdEmpty(S.descRow)
          + `<td colspan="${COL_SPAN}" style="${S.border}${S.descRow}">${art.longText.replace(/\r?\n/g, '<br>')}</td>`
          + tdEmpty(S.descRow)
          + tdEmpty(S.descRow)
          + tdEmpty(S.descRow)
        )
      }
    }

    // Chapter subtotal row (light green, chapter code in Resumen col)
    html += tr(
      tdEmpty(S.subRow)
      + tdEmpty(S.subRow)
      + tdEmpty(S.subRow)
      + `<td colspan="${COL_SPAN}" style="${S.border}${S.subRow} font-weight:bold;">${cap.code}</td>`
      + tdEmpty(S.subRow + S.numRight)
      + td(fmt(capTotal), S.subRow + S.numRight)
      + td(fmt(capTotal), S.subRow + S.numRight)
    )
  }

  // ── Root subtotal row ────────────────────────────────────────────────────
  html += tr(
    tdEmpty(S.subRow)
    + tdEmpty(S.subRow)
    + tdEmpty(S.subRow)
    + `<td colspan="${COL_SPAN}" style="${S.border}${S.subRow} font-weight:bold;">${offerCode}</td>`
    + tdEmpty(S.subRow + S.numRight)
    + td(fmt(rootTotal), S.subRow + S.numRight)
    + td(fmt(rootTotal), S.subRow + S.numRight)
  )

  html += `</table></body></html>`

  // 7. Response
  const safeClient = (offer.customer?.company_name || 'Cliente')
    .replace(/[^\w\s\-ñáéíóúÑÁÉÍÓÚ]/g, '').trim().replace(/\s+/g, '_')
  const filename = `OFERTA_${offer.offer_number}_${safeClient}.xls`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
