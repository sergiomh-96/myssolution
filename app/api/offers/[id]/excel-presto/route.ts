import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import XLSX from 'xlsx-js-style'

// Helper to sanitize fields to match FIEBDC/Presto constraints
function sanitizeField(text: string): string {
  return text
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\|/g, '-')
    .replace(/~/g, '-')
    .trim()
}

// Clean and format concept codes
function sanitizeCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')              // no spaces allowed in codes
    .replace(/[^A-Z0-9_\-\.]/g, '_') // only alphanumeric, _, -, .
}

// Fixed width padding for the Código column (13 characters)
function padCode(code: string): string {
  return code.padEnd(13, ' ')
}

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

  // 3. Group items into chapters
  type ChapterItem = {
    code: string
    unit: string
    summary: string
    pvp: number
    quantity: number
  }

  type Chapter = {
    code: string
    title: string
    items: ChapterItem[]
  }

  const chapters: Chapter[] = []
  let currentChapter: Chapter | null = null
  let chapterCounter = 1

  for (const item of items) {
    if (item.type === 'section_header') {
      const rawCode = sanitizeCode(`C${String(chapterCounter++).padStart(2, '0')}`)
      currentChapter = {
        code: rawCode,
        title: sanitizeField(item.description || `Capítulo ${chapterCounter - 1}`),
        items: []
      }
      chapters.push(currentChapter)
    } else if (item.type === 'article' || item.type === 'external') {
      if (!currentChapter) {
        currentChapter = {
          code: 'C01',
          title: 'Presupuesto',
          items: []
        }
        chapters.push(currentChapter)
        chapterCounter = 2
      }
      const rawRef = item.product?.referencia || item.external_ref || item.custom_ref || 'ART'
      currentChapter.items.push({
        code: sanitizeCode(rawRef),
        unit: 'ud',
        summary: sanitizeField(item.description || item.product?.descripcion || 'Artículo'),
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
  const offerTitle = sanitizeField(offer.title || `Oferta ${offer.offer_number}`)

  // 5. Define Styling Configurations
  const styles = {
    // Header row (italic, bold, white background)
    header: {
      font: { name: 'Arial', sz: 10, italic: true, bold: true },
      alignment: { horizontal: 'left', vertical: 'center' }
    },
    headerCenter: {
      font: { name: 'Arial', sz: 10, italic: true, bold: true },
      alignment: { horizontal: 'center', vertical: 'center' }
    },
    headerRight: {
      font: { name: 'Arial', sz: 10, italic: true, bold: true },
      alignment: { horizontal: 'right', vertical: 'center' }
    },

    // Root Row (Light blue background #9BC2E6, bold)
    rootLeft: {
      font: { name: 'Arial', sz: 10, bold: true },
      fill: { patternType: 'solid', fgColor: { rgb: '9BC2E6' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    },
    rootYellowRight: {
      font: { name: 'Arial', sz: 10, bold: true },
      fill: { patternType: 'solid', fgColor: { rgb: 'FFF2CC' } },
      alignment: { horizontal: 'right', vertical: 'center' }
    },
    rootWhiteRight: {
      font: { name: 'Arial', sz: 10, bold: true },
      alignment: { horizontal: 'right', vertical: 'center' }
    },

    // Chapter Row (Light green background #C6E0B4, bold)
    capLeft: {
      font: { name: 'Arial', sz: 10, bold: true },
      fill: { patternType: 'solid', fgColor: { rgb: 'C6E0B4' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    },
    capYellowRight: {
      font: { name: 'Arial', sz: 10, bold: true },
      fill: { patternType: 'solid', fgColor: { rgb: 'FFF2CC' } },
      alignment: { horizontal: 'right', vertical: 'center' }
    },
    capWhiteRight: {
      font: { name: 'Arial', sz: 10, bold: true },
      alignment: { horizontal: 'right', vertical: 'center' }
    },

    // Material Row (White background, normal font, yellow prices/imports)
    matLeft: {
      font: { name: 'Arial', sz: 10 },
      alignment: { horizontal: 'left', vertical: 'center' }
    },
    matCenter: {
      font: { name: 'Arial', sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center' }
    },
    matRight: {
      font: { name: 'Arial', sz: 10 },
      alignment: { horizontal: 'right', vertical: 'center' }
    },
    matYellowRight: {
      font: { name: 'Arial', sz: 10 },
      fill: { patternType: 'solid', fgColor: { rgb: 'FFF2CC' } },
      alignment: { horizontal: 'right', vertical: 'center' }
    },

    // Subtotal Rows (Bold, yellow prices, code right-aligned in J)
    subCodeRight: {
      font: { name: 'Arial', sz: 10, bold: true },
      alignment: { horizontal: 'right', vertical: 'center' }
    },
    subWhiteRight: {
      font: { name: 'Arial', sz: 10, bold: true },
      alignment: { horizontal: 'right', vertical: 'center' }
    },
    subYellowRight: {
      font: { name: 'Arial', sz: 10, bold: true },
      fill: { patternType: 'solid', fgColor: { rgb: 'FFF2CC' } },
      alignment: { horizontal: 'right', vertical: 'center' }
    },

    // Presupuesto Title (Arial 11, bold)
    presupuestoTitle: {
      font: { name: 'Arial', sz: 11, bold: true },
      alignment: { horizontal: 'left', vertical: 'center' }
    },
    empty: {}
  }

  // 6. Build sheet data (AOA format with cell objects for formatting)
  const data: any[][] = []

  // Cell helpers
  const sCell = (v: string, style?: any) => ({
    v,
    t: 's',
    ...(style ? { s: style } : {})
  })
  
  const nCell = (v: number, z: string, style?: any) => ({
    v,
    t: 'n',
    z,
    ...(style ? { s: style } : {})
  })
  
  // Create a row with exactly 13 columns
  const makeRow = (cells: any[]): any[] => {
    const row = new Array(13).fill(null).map(() => sCell(''))
    for (let i = 0; i < Math.min(cells.length, 13); i++) {
      if (cells[i] !== null && cells[i] !== undefined) {
        row[i] = cells[i]
      }
    }
    return row
  }

  // Row 1: empty row
  data.push(makeRow([]))

  // Row 2: Presupuesto
  data.push(makeRow([sCell('Presupuesto', styles.presupuestoTitle)]))

  // Row 3: Column headers
  data.push(makeRow([
    sCell('Código', styles.header),
    sCell('Nat', styles.header),
    sCell('Ud', styles.headerCenter),
    sCell('Resumen', styles.header),
    sCell('Comentario', styles.header),
    sCell('N', styles.headerRight),
    sCell('Longitud', styles.headerRight),
    sCell('Anchura', styles.headerRight),
    sCell('Altura', styles.headerRight),
    sCell('Parcial', styles.headerRight),
    sCell('CanPres', styles.headerRight),
    sCell('PrPres', styles.headerRight),
    sCell('ImpPres', styles.headerRight)
  ]))

  // Row 4: Root row
  data.push(makeRow([
    sCell(padCode(offerCode), styles.rootLeft),
    sCell('Capítulo', styles.rootLeft),
    sCell('', styles.rootLeft),
    sCell(offerTitle, styles.rootLeft),
    sCell('', styles.rootLeft),
    sCell('', styles.rootLeft),
    sCell('', styles.rootLeft),
    sCell('', styles.rootLeft),
    sCell('', styles.rootLeft),
    sCell('', styles.rootLeft),
    nCell(1, '0', styles.rootWhiteRight),
    nCell(rootTotal, '#,##0.00', styles.rootYellowRight),
    nCell(rootTotal, '#,##0.00', styles.rootYellowRight)
  ]))

  // Row 5: empty row
  data.push(makeRow([]))

  // 7. Chapters & Materials
  for (const cap of chapters) {
    const capTotal = chapterTotal(cap)

    // Chapter row
    data.push(makeRow([
      sCell(padCode(cap.code), styles.capLeft),
      sCell('Capítulo', styles.capLeft),
      sCell('', styles.capLeft),
      sCell(cap.title, styles.capLeft),
      sCell('', styles.capLeft),
      sCell('', styles.capLeft),
      sCell('', styles.capLeft),
      sCell('', styles.capLeft),
      sCell('', styles.capLeft),
      sCell('', styles.capLeft),
      nCell(1, '#,##0.00', styles.capWhiteRight),
      nCell(capTotal, '#,##0.00', styles.capYellowRight),
      nCell(capTotal, '#,##0.00', styles.capYellowRight)
    ]))
    data.push(makeRow([]))

    // Chapter items
    for (const art of cap.items) {
      data.push(makeRow([
        sCell(padCode(art.code), styles.matLeft),
        sCell('Material', styles.matLeft),
        sCell(art.unit, styles.matCenter),
        sCell(art.summary, styles.matLeft),
        sCell('', styles.matLeft),
        sCell('', styles.matLeft),
        sCell('', styles.matLeft),
        sCell('', styles.matLeft),
        sCell('', styles.matLeft),
        sCell('', styles.matLeft),
        nCell(art.quantity, '#,##0.00', styles.matRight),
        nCell(art.pvp, '#,##0.00', styles.matYellowRight),
        nCell(art.pvp * art.quantity, '#,##0.00', styles.matYellowRight)
      ]))
      data.push(makeRow([]))
    }

    // Chapter subtotal row
    data.push(makeRow([
      sCell('', styles.empty),
      sCell('', styles.empty),
      sCell('', styles.empty),
      sCell('', styles.empty),
      sCell('', styles.empty),
      sCell('', styles.empty),
      sCell('', styles.empty),
      sCell('', styles.empty),
      sCell('', styles.empty),
      sCell(cap.code, styles.subCodeRight),
      nCell(1, '#,##0.00', styles.subWhiteRight),
      nCell(capTotal, '#,##0.00', styles.subYellowRight),
      nCell(capTotal, '#,##0.00', styles.subYellowRight)
    ]))
    data.push(makeRow([]))
  }

  // Offer subtotal row
  data.push(makeRow([
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell(offerCode, styles.subCodeRight),
    nCell(1, '0', styles.subWhiteRight),
    nCell(rootTotal, '#,##0.00', styles.subYellowRight),
    nCell(rootTotal, '#,##0.00', styles.subYellowRight)
  ]))
  data.push(makeRow([]))

  // Project subtotal row
  data.push(makeRow([
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('', styles.empty),
    sCell('PROYECTO_02', styles.subCodeRight),
    nCell(1, '0', styles.subWhiteRight),
    nCell(rootTotal, '#,##0.00', styles.subYellowRight),
    nCell(rootTotal, '#,##0.00', styles.subYellowRight)
  ]))
  data.push(makeRow([]))

  // 8. Write to workbook & generate buffer
  const ws = XLSX.utils.aoa_to_sheet(data)

  // Configure column widths roughly
  ws['!cols'] = [
    { wch: 15 }, // Código
    { wch: 10 }, // Nat
    { wch: 6 },  // Ud
    { wch: 50 }, // Resumen
    { wch: 12 }, // Comentario
    { wch: 6 },  // N
    { wch: 10 }, // Longitud
    { wch: 10 }, // Anchura
    { wch: 10 }, // Altura
    { wch: 15 }, // Parcial
    { wch: 12 }, // CanPres
    { wch: 12 }, // PrPres
    { wch: 12 }  // ImpPres
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  // 9. Send response
  const safeClient = (offer.customer?.company_name || 'Cliente')
    .replace(/[^\w\s\-ñáéíóúÑÁÉÍÓÚ]/g, '').trim().replace(/\s+/g, '_')
  const filename = `OFERTA_${offer.offer_number}_${safeClient}.xlsx`

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
