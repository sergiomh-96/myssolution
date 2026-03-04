import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import fs from 'fs'
import path from 'path'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: offer, error } = await supabase
    .from('offers')
    .select(`
      *,
      customer:customers!customer_id(id, company_name),
      contact:clients_contacts!contact_id(id, nombre, apellidos, email, telefono),
      created_by_profile:profiles!created_by(full_name, email)
    `)
    .eq('id', id)
    .single()

  if (error || !offer) {
    return NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 })
  }

  const { data: items } = await supabase
    .from('offer_items')
    .select(`*, product:products!product_id(id, referencia, descripcion)`)
    .eq('offer_id', id)
    .order('id')

  const offerItems = items || []

  // ---- PDF setup ----
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const marginL = 14
  const marginR = 14

  // Palette matching the "Ver" page
  const blue: [number, number, number] = [41, 128, 185]
  const headerBg: [number, number, number] = [214, 234, 248]
  const borderColor: [number, number, number] = [189, 215, 238]
  const textDark: [number, number, number] = [25, 25, 25]
  const textMuted: [number, number, number] = [110, 110, 110]
  const rowAlt: [number, number, number] = [246, 249, 252]
  const totalBg: [number, number, number] = [232, 240, 248]

  // ---- Logo (maintain 1:1 native aspect ratio) ----
  try {
    const logoPath = path.join(process.cwd(), 'public', 'mysair-logo.png')
    if (fs.existsSync(logoPath)) {
      const base64 = fs.readFileSync(logoPath).toString('base64')
      // Read native dimensions to preserve aspect ratio
      const imgData = `data:image/png;base64,${base64}`
      // Use a target height of 11mm (half of 22mm) and compute width from native ratio
      const targetH = 11
      // jsPDF getImageProperties gives us the pixel dims
      const props = doc.getImageProperties(imgData)
      const targetW = (props.width / props.height) * targetH
      doc.addImage(imgData, 'PNG', marginL, 6, targetW, targetH)
    }
  } catch {
    doc.setFontSize(20).setFont('helvetica', 'bold').setTextColor(...blue)
    doc.text('MYSair', marginL, 22)
  }

  // ---- Thin rule under logo area ----
  const ruleY = 20
  doc.setDrawColor(...borderColor).setLineWidth(0.5)
  doc.line(marginL, ruleY, pageW - marginR, ruleY)

  // ---- Two-column header info ----
  const colMid = pageW / 2 + 2
  const infoTop = ruleY + 2  // shifted up 3mm to centre between the two horizontal rules

  // Vertical separator
  doc.setDrawColor(...borderColor).setLineWidth(0.3)
  doc.line(colMid - 3, ruleY, colMid - 3, ruleY + 43)

  const offerYear = new Date(offer.created_at).getFullYear()
  const offerNum = `${offerYear}-${String(offer.offer_number).padStart(4, '0')}`
  const offerDate = new Date(offer.created_at).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  const writeField = (x: number, y: number, label: string, value: string, bold = false, big = false) => {
    doc.setFontSize(6).setFont('helvetica', 'bold').setTextColor(...textMuted)
    doc.text(label, x, y)
    doc.setFontSize(big ? 11 : 8)
      .setFont('helvetica', bold ? 'bold' : 'normal')
      .setTextColor(...textDark)
    doc.text(value || '-', x, y + 4.8)
  }

  const hr = (y: number, x1 = marginL, x2 = colMid - 5) => {
    doc.setDrawColor(...borderColor).setLineWidth(0.2)
    doc.line(x1, y, x2, y)
  }

  let ly = infoTop + 5
  writeField(marginL, ly, 'Nº OFERTA', offerNum, true, true)
  hr(ly + 5.5)
  ly += 9
  writeField(marginL, ly, 'REFERENCIA', offer.title || '-')
  hr(ly + 5.5)
  ly += 9
  writeField(marginL, ly, 'CLIENTE', offer.customer?.company_name || '-')
  hr(ly + 5.5)
  ly += 9
  const contacto = offer.contact
    ? `${offer.contact.nombre || ''} ${offer.contact.apellidos || ''}`.trim()
    : '-'
  writeField(marginL, ly, 'CONTACTO', contacto)

  let ry = infoTop + 5
  writeField(colMid, ry, 'FECHA', offerDate, true, true)
  hr(ry + 5.5, colMid, pageW - marginR)
  ry += 9
  const realizaPor = offer.created_by_profile?.email || offer.created_by_profile?.full_name || '-'
  writeField(colMid, ry, 'REALIZA POR', realizaPor)
  hr(ry + 5.5, colMid, pageW - marginR)
  ry += 9
  writeField(colMid, ry, 'PLAZO DE ENTREGA', 'A consultar')
  hr(ry + 5.5, colMid, pageW - marginR)
  ry += 9
  writeField(colMid, ry, 'PRECIO', 'NETO', true)

  const tableTop = ruleY + 47

  // Rule above table (with 5mm gap before it)
  doc.setDrawColor(...borderColor).setLineWidth(0.5)
  doc.line(marginL, tableTop - 5, pageW - marginR, tableTop - 5)

  // Colors for special row types
  const navyBg: [number, number, number] = [26, 46, 74]
  const navyText: [number, number, number] = [255, 255, 255]
  const yellowBg: [number, number, number] = [255, 251, 204]
  const yellowText: [number, number, number] = [120, 90, 10]
  const blackBg: [number, number, number] = [10, 10, 10]
  const whiteText: [number, number, number] = [255, 255, 255]

  // ---- Articles table ----
  const tableRows = offerItems.map((item) => {
    if (item.type === 'summary') {
      return [
        { content: item.description || 'Resumen', colSpan: 2, styles: { fontStyle: 'bold' as const, textColor: navyText, fillColor: navyBg } },
        { content: '', styles: { textColor: navyText, fillColor: navyBg } },
        { content: '', styles: { textColor: navyText, fillColor: navyBg } },
        { content: `€${Number(item.neto_total2 || 0).toFixed(2)}`, styles: { fontStyle: 'bold' as const, halign: 'right' as const, textColor: navyText, fillColor: navyBg } },
      ]
    }
    if (item.type === 'section_header') {
      return [
        { content: item.description || '', colSpan: 5, styles: { fontStyle: 'bold' as const, textColor: whiteText, fillColor: blackBg } },
      ]
    }
    if (item.type === 'note') {
      return [
        { content: item.description || '', colSpan: 5, styles: { fontStyle: 'italic' as const, textColor: yellowText, fillColor: yellowBg } },
      ]
    }
    return [
      item.product?.referencia || '-',
      item.description || item.product?.descripcion || '-',
      String(item.quantity ?? 1),
      `€${Number(item.pvp || 0).toFixed(2)}`,
      `€${Number(item.neto_total2 || 0).toFixed(2)}`,
    ]
  })

  const total = offerItems
    .filter(i => i.type === 'article' || !i.type)
    .reduce((s, i) => s + Number(i.neto_total2 || 0), 0)

  autoTable(doc, {
    startY: tableTop,
    margin: { left: marginL, right: marginR },
    head: [['Referencia', 'Descripción', 'Cantidad', 'Neto', 'Neto Total']],
    body: tableRows,
    foot: [['', '', '', 'TOTAL:', `€${total.toFixed(2)}`]],
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      textColor: textDark,
      lineWidth: 0,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: headerBg,
      textColor: textDark,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      lineWidth: 0,
    },
    footStyles: {
      fillColor: totalBg,
      textColor: textDark,
      fontStyle: 'bold',
      fontSize: 8.5,
      lineWidth: 0,
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: rowAlt },
    showFoot: 'lastPage',
  })

  // ---- Footer ----
  const pageH = doc.internal.pageSize.getHeight()
  const finalY: number = (doc as any).lastAutoTable?.finalY ?? pageH - 30
  doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(...textMuted)
  doc.text('Precios en €, IVA no incluido. Oferta sujeta a disponibilidad de stock.', marginL, finalY + 9)
  doc.setDrawColor(...borderColor).setLineWidth(0.3)
  doc.line(marginL, finalY + 11, pageW - marginR, finalY + 11)
  doc.text('Página 1 de 1', pageW / 2, pageH - 7, { align: 'center' })

  // ---- Return PDF ----
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
  const filename = `oferta-${offerNum}.pdf`

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

