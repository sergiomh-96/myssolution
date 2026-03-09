import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = new URL(req.url)
  const company = (url.searchParams.get('company') || 'mysair') as 'mysair' | 'agfri'
  const priceType = (url.searchParams.get('priceType') || 'pvp') as 'pvp' | 'neto'

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

  // ---- PDF setup with compression ----
  const doc = new jsPDF({ 
    orientation: 'portrait', 
    unit: 'mm', 
    format: 'a4',
    compress: true
  })
  const pageW = doc.internal.pageSize.getWidth()
  const marginL = 14
  const marginR = 14

  // Palette based on company
  const palette = company === 'agfri' 
    ? {
        primary: [220, 20, 20],      // Red for AGFRI
        headerBg: [255, 200, 200],
        borderColor: [255, 150, 150],
        textDark: [25, 25, 25],
        textMuted: [110, 110, 110],
        rowAlt: [255, 245, 245],
        totalBg: [255, 220, 220],
      }
    : {
        primary: [41, 128, 185],      // Blue for MYSAIR
        headerBg: [214, 234, 248],
        borderColor: [189, 215, 238],
        textDark: [25, 25, 25],
        textMuted: [110, 110, 110],
        rowAlt: [246, 249, 252],
        totalBg: [232, 240, 248],
      }

  // ---- Pre-calculate offer number and date (used in cover + header) ----
  const offerYear = new Date(offer.created_at).getFullYear()
  const offerNum = `${offerYear}-${String(offer.offer_number).padStart(4, '0')}`
  const offerDate = new Date(offer.created_at).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  // ---- Cover page (MYSAIR only) ----
  if (company === 'mysair') {
    const coverW = pageW
    const coverH = doc.internal.pageSize.getHeight()

    // Use the PNG as a full-page background image
    try {
      const coverPath = path.join(process.cwd(), 'public', 'portada-mysair.png')
      if (fs.existsSync(coverPath)) {
        const coverBuffer = await sharp(coverPath)
          .resize(Math.round(coverW * 3.78), Math.round(coverH * 3.78), { fit: 'fill' })
          .png({ compressionLevel: 6 })
          .toBuffer()
        const base64 = coverBuffer.toString('base64')
        const imgData = `data:image/png;base64,${base64}`
        doc.addImage(imgData, 'PNG', 0, 0, coverW, coverH)
      }
    } catch (e) {
      console.error('Cover image error:', e)
    }

    // Overlay dynamic data — positions calibrated to match the template layout
    const labelColor: [number, number, number] = [100, 110, 120]
    const valueColor: [number, number, number] = [50, 60, 80]
    const fieldX = coverW * 0.085
    const labelSize = 9
    const valueSize = 18  // Increased from 11 to 18

    // "OFERTA DE VENTAS" title — large centered text
    doc.setFontSize(26).setFont('helvetica', 'bold').setTextColor(50, 60, 80)
    doc.text('OFERTA DE VENTAS', fieldX, coverH * 0.38)

    // Cliente
    doc.setFontSize(labelSize).setFont('helvetica', 'normal').setTextColor(...labelColor)
    doc.text('Cliente', fieldX, coverH * 0.455)
    doc.setFontSize(valueSize).setFont('helvetica', 'bold').setTextColor(...valueColor)
    doc.text(offer.customer?.company_name || '-', fieldX, coverH * 0.495)

    // Referencia
    doc.setFontSize(labelSize).setFont('helvetica', 'normal').setTextColor(...labelColor)
    doc.text('Referencia', fieldX, coverH * 0.535)
    doc.setFontSize(valueSize).setFont('helvetica', 'bold').setTextColor(...valueColor)
    doc.text(offer.title || '-', fieldX, coverH * 0.575)

    // Nº Oferta
    doc.setFontSize(labelSize).setFont('helvetica', 'normal').setTextColor(...labelColor)
    doc.text('Nº Oferta', fieldX, coverH * 0.615)
    doc.setFontSize(valueSize).setFont('helvetica', 'bold').setTextColor(...valueColor)
    doc.text(offerNum, fieldX, coverH * 0.655)

    // Now add a new page for the offer content
    doc.addPage()
  }

  // ---- Logo (maintain 1:1 native aspect ratio, high quality) ----
  try {
    const logoFilename = company === 'agfri' ? 'agfri-logo.png' : 'mysair-logo.png'
    const logoPath = path.join(process.cwd(), 'public', logoFilename)
    if (fs.existsSync(logoPath)) {
      const compressedBuffer = await sharp(logoPath)
        .resize(280, 280, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toBuffer()
      
      const base64 = compressedBuffer.toString('base64')
      const imgData = `data:image/png;base64,${base64}`
      const targetH = 11
      const props = doc.getImageProperties(imgData)
      const targetW = (props.width / props.height) * targetH
      doc.addImage(imgData, 'PNG', marginL, 6, targetW, targetH)
    }
  } catch {
    doc.setFontSize(20).setFont('helvetica', 'bold').setTextColor(...palette.primary)
    const companyText = company === 'agfri' ? 'AGFRI' : 'MYSair'
    doc.text(companyText, marginL, 22)
  }

  // ---- Thin rule under logo area ----
  const ruleY = 20
  doc.setDrawColor(...palette.borderColor).setLineWidth(0.5)
  doc.line(marginL, ruleY, pageW - marginR, ruleY)

  // ---- Two-column header info ----
  const colMid = pageW / 2 + 2
  const infoTop = ruleY + 2

  // Vertical separator
  doc.setDrawColor(...palette.borderColor).setLineWidth(0.3)
  doc.line(colMid - 3, ruleY, colMid - 3, ruleY + 43)



  const writeField = (x: number, y: number, label: string, value: string, bold = false, big = false) => {
    doc.setFontSize(6).setFont('helvetica', 'bold').setTextColor(...palette.textMuted)
    doc.text(label, x, y)
    doc.setFontSize(big ? 11 : 8)
      .setFont('helvetica', bold ? 'bold' : 'normal')
      .setTextColor(...palette.textDark)
    doc.text(value || '-', x, y + 4.8)
  }

  const hr = (y: number, x1 = marginL, x2 = colMid - 5) => {
    doc.setDrawColor(...palette.borderColor).setLineWidth(0.2)
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
  const priceLabel = priceType === 'neto' ? 'NETO' : 'PVP'
  writeField(colMid, ry, 'PRECIO', priceLabel, true)

  const tableTop = ruleY + 47

  // Rule above table (with 5mm gap before it)
  doc.setDrawColor(...palette.borderColor).setLineWidth(0.5)
  doc.line(marginL, tableTop - 5, pageW - marginR, tableTop - 5)

  // Colors for special row types
  const navyBg: [number, number, number] = [26, 46, 74]
  const navyText: [number, number, number] = [255, 255, 255]
  const yellowBg: [number, number, number] = [255, 251, 204]
  const yellowText: [number, number, number] = [120, 90, 10]

  // ---- Articles table ----
  const priceColumn = priceType === 'neto' ? 'neto_total2' : 'pvp_total'
  const priceHeader = priceType === 'neto' ? 'Neto Total' : 'PVP Total'

  const tableRows = offerItems.map((item) => {
    const priceValue = priceType === 'neto' 
      ? Number(item.neto_total2 || 0).toFixed(2)
      : Number(item.pvp_total || 0).toFixed(2)

    // Calculate unit price: if neto, show neto_unit = neto_total2 / quantity
    const unitPrice = priceType === 'neto'
      ? (Number(item.neto_total2 || 0) / Math.max(Number(item.quantity || 1), 1)).toFixed(2)
      : Number(item.pvp || 0).toFixed(2)

    if (item.type === 'summary') {
      return [
        { content: item.description || 'Resumen', colSpan: 2, styles: { fontStyle: 'bold' as const, textColor: navyText, fillColor: navyBg } },
        { content: '', styles: { textColor: navyText, fillColor: navyBg } },
        { content: '', styles: { textColor: navyText, fillColor: navyBg } },
        { content: `€${priceValue}`, styles: { fontStyle: 'bold' as const, halign: 'right' as const, textColor: navyText, fillColor: navyBg } },
      ]
    }
    if (item.type === 'section_header') {
      return [
        { content: item.description || '', colSpan: 5, styles: { fontStyle: 'bold' as const, textColor: navyText, fillColor: navyBg } },
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
      `€${unitPrice}`,
      `€${priceValue}`,
    ]
  })

  const total = offerItems
    .filter(i => i.type === 'article' || !i.type)
    .reduce((s, i) => {
      const value = priceType === 'neto' ? Number(i.neto_total2 || 0) : Number(i.pvp_total || 0)
      return s + value
    }, 0)

  autoTable(doc, {
    startY: tableTop,
    margin: { left: marginL, right: marginR },
    head: [['Referencia', 'Descripción', 'Cantidad', priceType === 'neto' ? 'Neto' : 'PVP', priceHeader]],
    body: tableRows,
    foot: [['', '', '', 'TOTAL:', `€${total.toFixed(2)}`]],
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      textColor: palette.textDark,
      lineWidth: 0,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: palette.headerBg,
      textColor: palette.textDark,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      lineWidth: 0,
    },
    footStyles: {
      fillColor: palette.totalBg,
      textColor: palette.textDark,
      fontStyle: 'bold',
      fontSize: 8.5,
      lineWidth: 0,
    },
    columnStyles: {
      0: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: palette.rowAlt },
    showFoot: 'lastPage',
  })

  // ---- Descripción visible en oferta (below table) ----
  const pageH = doc.internal.pageSize.getHeight()
  const finalY: number = (doc as any).lastAutoTable?.finalY ?? pageH - 30
  const descriptionText = (offer as any).description?.trim()
  let descriptionEndY = finalY
  if (descriptionText) {
    const descY = finalY + 7
    doc.setFontSize(7).setFont('helvetica', 'bold').setTextColor(...palette.textMuted)
    doc.text('DESCRIPCIÓN', marginL, descY)
    doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(...palette.textDark)
    const lines = doc.splitTextToSize(descriptionText, pageW - marginL - marginR)
    doc.text(lines, marginL, descY + 4.5)
    descriptionEndY = descY + 4.5 + lines.length * 4
    doc.setDrawColor(...palette.borderColor).setLineWidth(0.2)
    doc.line(marginL, descriptionEndY + 2, pageW - marginR, descriptionEndY + 2)
  }

  // ---- Footer ----
  doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(...palette.textMuted)
  doc.text('Precios en €, IVA no incluido. Oferta sujeta a disponibilidad de stock.', marginL, descriptionEndY + 9)
  doc.text('Portes no incluidos', marginL, descriptionEndY + 13)
  doc.text('El plazo de entrega se confirmará tras la aceptación del pedido.', marginL, descriptionEndY + 17)
  doc.setDrawColor(...palette.borderColor).setLineWidth(0.3)
  doc.line(marginL, descriptionEndY + 19, pageW - marginR, descriptionEndY + 19)
  const totalPages = company === 'mysair' ? 2 : 1
  const offerPageNum = company === 'mysair' ? 2 : 1
  doc.text(`Página ${offerPageNum} de ${totalPages}`, pageW / 2, pageH - 7, { align: 'center' })

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

