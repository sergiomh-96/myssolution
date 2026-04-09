import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { downloadPublicDriveFile } from '@/lib/google-drive'

const SISTEMAS_COVER_URL = 'https://itzohkwuqmkzatmbrfgr.supabase.co/storage/v1/object/sign/Dossier_portadas/Dossier_Sistemas_Difusion_Portada.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84Mjc5NjQ5NC1mNTRiLTRmZTQtYWZmZS01M2NkYTVjMGYwNTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb3NzaWVyX3BvcnRhZGFzL0Rvc3NpZXJfU2lzdGVtYXNfRGlmdXNpb25fUG9ydGFkYS5wZGYiLCJpYXQiOjE3NzU3MzczNzQsImV4cCI6MjQwNjQ1NzM3NH0.Euauwc7VX8uGR7dD4LS9n_ioFe9vdzCfQme_sidCroc'
const DIFUSION_COVER_URL = 'https://itzohkwuqmkzatmbrfgr.supabase.co/storage/v1/object/sign/Dossier_portadas/Dossier_Difusion_Portada%20(1).pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84Mjc5NjQ5NC1mNTRiLTRmZTQtYWZmZS01M2NkYTVjMGYwNTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb3NzaWVyX3BvcnRhZGFzL0Rvc3NpZXJfRGlmdXNpb25fUG9ydGFkYSAoMSkucGRmIiwiaWF0IjoxNzc1NzM3NDAyLCJleHAiOjI0MDY0NTc0MDJ9.9AWmeMKyNxFvIYEuS-nnL9OkwRyfEvIa0goBqOG1ftk'
const OFFER_COVER_URL = 'https://itzohkwuqmkzatmbrfgr.supabase.co/storage/v1/object/sign/Dossier_portadas/Dossier_Ofertas_Portada.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84Mjc5NjQ5NC1mNTRiLTRmZTQtYWZmZS01M2NkYTVjMGYwNTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb3NzaWVyX3BvcnRhZGFzL0Rvc3NpZXJfT2ZlcnRhc19Qb3J0YWRhLnBkZiIsImlhdCI6MTc3NTczNzU4NiwiZXhwIjoyNDA2NDU3NTg2fQ.01jcrj1RVTSBdNNlQ1gbPAhfpgXPqAkl2yMqq33rGF4'
const FT_COVER_URL = 'https://itzohkwuqmkzatmbrfgr.supabase.co/storage/v1/object/sign/Dossier_portadas/Dossier_Fichas_Tecnicas_Portada.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84Mjc5NjQ5NC1mNTRiLTRmZTQtYWZmZS01M2NkYTVjMGYwNTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb3NzaWVyX3BvcnRhZGFzL0Rvc3NpZXJfRmljaGFzX1RlY25pY2FzX1BvcnRhZGEucGRmIiwiaWF0IjoxNzc1NzM3Mjc0LCJleHAiOjI0MDY0NTcyNzR9.TuVs6VQC6rOkWCWTfKq-5jRNnzeLTMeNOg1fy2bhoY0'
const ESQUEMAS_COVER_URL = 'https://itzohkwuqmkzatmbrfgr.supabase.co/storage/v1/object/sign/Dossier_portadas/Dossier_Esquemas_Conexion_Portada.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84Mjc5NjQ5NC1mNTRiLTRmZTQtYWZmZS01M2NkYTVjMGYwNTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb3NzaWVyX3BvcnRhZGFzL0Rvc3NpZXJfRXNxdWVtYXNfQ29uZXhpb25fUG9ydGFkYS5wZGYiLCJpYXQiOjE3NzU3Mzc4MjIsImV4cCI6MjQwNjQ1NzgyMn0.HGAOKUjj-1CXCyty5AdV--lrtySkUErwmMo81iWWXuo'
const BACK_COVER_URL = 'https://itzohkwuqmkzatmbrfgr.supabase.co/storage/v1/object/sign/Dossier_portadas/Dossier_Contraportada.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84Mjc5NjQ5NC1mNTRiLTRmZTQtYWZmZS01M2NkYTVjMGYwNTgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJEb3NzaWVyX3BvcnRhZGFzL0Rvc3NpZXJfQ29udHJhcG9ydGFkYS5wZGYiLCJpYXQiOjE3NzU3Mzg5MDUsImV4cCI6MjQwNjQ1ODkwNX0.9sjPSIqEJpQ6d4_XsFXkesXNN4chHHZjxi5s_JIjfQw'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = new URL(req.url)
  const company = url.searchParams.get('company') || 'mysair'
  const priceType = url.searchParams.get('priceType') || 'pvp'
  const dossierType = url.searchParams.get('dossierType') || 'sistemas'
  const includeFT = url.searchParams.get('includeFT') === 'true'
  const includeCert = url.searchParams.get('includeCert') === 'true'
  const includeES = url.searchParams.get('includeES') === 'true'
  const selectedSchemasRaw = url.searchParams.get('selectedSchemas')
  let selectedSchemas: string[] = []
  try {
    if (selectedSchemasRaw) selectedSchemas = JSON.parse(selectedSchemasRaw)
  } catch (e) {
    console.error('Error parsing selectedSchemas:', e)
  }

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
    .select(`*, product:products!product_id(id, referencia, descripcion, ficha_tecnica)`)
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
        primary: [220, 20, 20] as [number, number, number],      // Red for AGFRI
        headerBg: [255, 200, 200] as [number, number, number],
        borderColor: [255, 150, 150] as [number, number, number],
        textDark: [25, 25, 25] as [number, number, number],
        textMuted: [110, 110, 110] as [number, number, number],
        rowAlt: [255, 245, 245] as [number, number, number],
        totalBg: [255, 220, 220] as [number, number, number],
      }
    : {
        primary: [41, 128, 185] as [number, number, number],      // Blue for MYSAIR
        headerBg: [214, 234, 248] as [number, number, number],
        borderColor: [189, 215, 238] as [number, number, number],
        textDark: [25, 25, 25] as [number, number, number],
        textMuted: [110, 110, 110] as [number, number, number],
        rowAlt: [246, 249, 252] as [number, number, number],
        totalBg: [232, 240, 248] as [number, number, number],
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
      const logoBuffer = fs.readFileSync(logoPath)
      const compressedBuffer = await sharp(logoBuffer)
        .png({ compressionLevel: 9 })
        .toBuffer()
      
      const base64 = compressedBuffer.toString('base64')
      const imgData = `data:image/png;base64,${base64}`
      const targetH = 10
      const props = doc.getImageProperties(imgData)
      const targetW = (props.width / props.height) * targetH
      doc.addImage(imgData, 'PNG', marginL, 6, targetW, targetH)
    }
  } catch (err) {
    console.error('Logo error:', err)
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
  const priceLabel = priceType === 'neto' ? 'NETO' : priceType === 'all' ? 'PVP + DESCUENTO + NETO' : 'PVP'
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
  const priceHeader = priceType === 'neto' ? 'Neto Total' : priceType === 'all' ? 'PVP Total' : 'PVP Total'
  const descuentoHeader = priceType === 'all' ? 'Descuento' : ''
  const netoHeader = priceType === 'all' ? 'Neto Total' : ''

  // Formatting helper for currency in PDF
  const formatCurrency = (val: number) => {
    return val.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + '€'
  }

  const tableRows = offerItems.map((item) => {
    const pvpTotalNum = Number(item.pvp_total || 0)
    const netoTotalNum = Number(item.neto_total2 || 0)
    const discountNum = item.type === 'article' ? (item.discount1 || 0) : 0
    
    // Unit price calculation
    let unitPriceNum = 0
    if (priceType === 'neto') {
      unitPriceNum = (netoTotalNum / Math.max(Number(item.quantity || 1), 1))
    } else {
      unitPriceNum = Number(item.pvp || 0)
    }

    if (item.type === 'summary') {
      if (priceType === 'all') {
        return [
          { content: item.description || 'Resumen', colSpan: 3, styles: { fontStyle: 'bold' as const, textColor: navyText, fillColor: navyBg } },
          { content: '', styles: { textColor: navyText, fillColor: navyBg } },
          { content: '', styles: { textColor: navyText, fillColor: navyBg } },
          { content: formatCurrency(netoTotalNum), styles: { fontStyle: 'bold' as const, halign: 'right' as const, textColor: navyText, fillColor: navyBg } },
        ]
      }
      return [
        { content: item.description || 'Resumen', colSpan: 2, styles: { fontStyle: 'bold' as const, textColor: navyText, fillColor: navyBg } },
        { content: '', styles: { textColor: navyText, fillColor: navyBg } },
        { content: '', styles: { textColor: navyText, fillColor: navyBg } },
        { content: formatCurrency(priceType === 'neto' ? netoTotalNum : pvpTotalNum), styles: { fontStyle: 'bold' as const, halign: 'right' as const, textColor: navyText, fillColor: navyBg } },
      ]
    }
    if (item.type === 'section_header') {
      return [
        { content: item.description || '', colSpan: priceType === 'all' ? 6 : 5, styles: { fontStyle: 'bold' as const, textColor: navyText, fillColor: navyBg } },
      ]
    }
    if (item.type === 'note') {
      return [
        { content: item.description || '', colSpan: priceType === 'all' ? 6 : 5, styles: { fontStyle: 'italic' as const, textColor: yellowText, fillColor: yellowBg } },
      ]
    }
    
    if (priceType === 'all') {
      return [
        item.product?.referencia || item.external_ref || '-',
        item.description || item.product?.descripcion || '-',
        String(item.quantity ?? 1),
        formatCurrency(unitPriceNum),
        `${discountNum.toFixed(2)}%`,
        formatCurrency(netoTotalNum),
      ]
    }
    
    return [
      item.product?.referencia || item.external_ref || '-',
      item.description || item.product?.descripcion || '-',
      String(item.quantity ?? 1),
      formatCurrency(unitPriceNum),
      formatCurrency(priceType === 'neto' ? netoTotalNum : pvpTotalNum),
    ]
  })

  const totalPVP = offerItems
    .filter(i => i.type === 'article' || i.type === 'external' || !i.type)
    .reduce((s, i) => s + Number(i.pvp_total || 0), 0)

  const totalNeto = offerItems
    .filter(i => i.type === 'article' || i.type === 'external' || !i.type)
    .reduce((s, i) => s + Number(i.neto_total2 || 0), 0)

  const tableHead = priceType === 'all'
    ? ['Referencia', 'Observaciones', 'Cant.', 'PVP', 'Desc%', 'Neto Total']
    : ['Referencia', 'Observaciones', 'Cant.', priceType === 'neto' ? 'Neto' : 'PVP', priceType === 'neto' ? 'Neto Total' : 'PVP Total']

  const tableFoot = priceType === 'all'
    ? [
        ['', '', '', '', { content: 'TOTAL PVP:', halign: 'right' }, { content: formatCurrency(totalPVP), halign: 'center' }],
        ['', '', '', '', { content: 'TOTAL NETO:', halign: 'right' }, { content: formatCurrency(totalNeto), halign: 'center' }]
      ]
    : [['', '', '', { content: 'TOTAL:', halign: 'center' }, { content: formatCurrency(priceType === 'neto' ? totalNeto : totalPVP), halign: 'center' }]]

  autoTable(doc, {
    startY: tableTop,
    margin: { left: marginL, right: marginR },
    head: [tableHead],
    body: tableRows,
    foot: tableFoot,
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
      halign: 'center',
      lineWidth: 0,
    },
    footStyles: {
      fillColor: palette.totalBg,
      textColor: palette.textDark,
      fontStyle: 'bold',
      fontSize: 8.5,
      lineWidth: 0,
    },
    columnStyles: priceType === 'all' ? {
      0: { cellWidth: 28, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
    } : {
      0: { cellWidth: 32, halign: 'left', fontStyle: 'bold' },
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
    doc.text('OBSERVACIONES', marginL, descY)
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

  // ---- Return PDF (Base or Merged) ----
  let finalPdfBuffer = Buffer.from(doc.output('arraybuffer'))

  if (includeFT || includeCert || includeES) {
    try {
      const mergedPdf = await PDFDocument.create()
      
      // 1. ADD DOSSIER COVER (AS THE VERY FIRST PAGE)
      try {
        const coverUrl = dossierType === 'difusion' ? DIFUSION_COVER_URL : SISTEMAS_COVER_URL
        const coverBuffer = await downloadPublicDriveFile(coverUrl)
        if (coverBuffer) {
          const coverPdf = await PDFDocument.load(coverBuffer)
          const [coverPage] = await mergedPdf.copyPages(coverPdf, [0])
          
          // Draw dynamic text on the cover (Right justified)
          const { width, height } = coverPage.getSize()
          const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold)
          const textColor = rgb(0.1, 0.2, 0.3)
          const fontSize = 18 // Slightly smaller for better fit
          const rightMarginX = width * 0.91 // X position for the right end of the text

          // Client name
          const clientText = offer.customer?.company_name || '-'
          const clientWidth = font.widthOfTextAtSize(clientText, fontSize)
          coverPage.drawText(clientText, {
            x: rightMarginX - clientWidth,
            y: height * 0.585,
            size: fontSize,
            font: font,
            color: textColor,
          })

          // Reference / Title
          const refText = offer.title || '-'
          const refWidth = font.widthOfTextAtSize(refText, fontSize)
          coverPage.drawText(refText, {
            x: rightMarginX - refWidth,
            y: height * 0.495,
            size: fontSize,
            font: font,
            color: textColor,
          })

          mergedPdf.addPage(coverPage)
          
          // Add remaining pages if cover has more than 1
          if (coverPdf.getPageCount() > 1) {
            const extraPages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices().slice(1))
            extraPages.forEach(p => mergedPdf.addPage(p))
          }
        }
      } catch (error) {
        console.error('Error adding Dossier cover page:', error)
      }

      // 2. ADD OFFER COVER PAGE
      try {
        const coverBuffer = await downloadPublicDriveFile(OFFER_COVER_URL)
        if (coverBuffer) {
          const coverPdf = await PDFDocument.load(coverBuffer)
          const pages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices())
          pages.forEach(p => mergedPdf.addPage(p))
        }
      } catch (error) {
        console.error('Error adding Offer cover page:', error)
      }

      // 3. ADD ORIGINAL OFFER PAGES (EXCLUDING COVER FOR MYSAIR)
      const basePdf = await PDFDocument.load(finalPdfBuffer)
      let indices = basePdf.getPageIndices()
      
      // If it's a MYSAIR dossier, skip the first page (which is the standard cover)
      if (company === 'mysair') {
        indices = indices.slice(1)
      }
      
      const copiedPages = await mergedPdf.copyPages(basePdf, indices)
      copiedPages.forEach((page) => mergedPdf.addPage(page))

      // Identify unique references from items
      const uniqueRefs = Array.from(new Set(
        offerItems
          .map(item => item.product?.referencia || item.external_ref)
          .filter(Boolean)
      ))

      const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '1wPRWvGGlTOmo-nKRBAKatRlLqwkFGxg4'

      // 4. ADD SCHEMAS SECTION (IF REQUESTED)
      if (includeES) {
        try {
          const coverBuffer = await downloadPublicDriveFile(ESQUEMAS_COVER_URL)
          if (coverBuffer) {
            const coverPdf = await PDFDocument.load(coverBuffer)
            const pages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices())
            pages.forEach(p => mergedPdf.addPage(p))
          }
        } catch (error) {
          console.error('Error adding Schemas cover page:', error)
        }
        
        // Add manually selected schemas from the dialog
        for (const schemaUrl of selectedSchemas) {
          const fileBuffer = await downloadPublicDriveFile(schemaUrl)
          if (fileBuffer) {
            const esPdf = await PDFDocument.load(fileBuffer)
            const pages = await mergedPdf.copyPages(esPdf, esPdf.getPageIndices())
            pages.forEach(p => mergedPdf.addPage(p))
          }
        }

        // Also add schemas associated with specific products if any
        for (const item of offerItems) {
          if ((item.product as any)?.url_esquema) {
            const url = (item.product as any).url_esquema
            const fileBuffer = await downloadPublicDriveFile(url)
            if (fileBuffer) {
              const esPdf = await PDFDocument.load(fileBuffer)
              const pages = await mergedPdf.copyPages(esPdf, esPdf.getPageIndices())
              pages.forEach(p => mergedPdf.addPage(p))
            }
          }
        }
      }

      // 5. ADD TECHNICAL SHEETS SECTION (IF REQUESTED)
      if (includeFT) {
        try {
          const coverBuffer = await downloadPublicDriveFile(FT_COVER_URL)
          if (coverBuffer) {
            const coverPdf = await PDFDocument.load(coverBuffer)
            const pages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices())
            pages.forEach(p => mergedPdf.addPage(p))
          }
        } catch (error) {
          console.error('Error adding FT cover page:', error)
        }

        for (const item of offerItems) {
          if ((item.product as any)?.ficha_tecnica) {
            const url = (item.product as any).ficha_tecnica
            const fileBuffer = await downloadPublicDriveFile(url)
            if (fileBuffer) {
              const ftPdf = await PDFDocument.load(fileBuffer)
              const pages = await mergedPdf.copyPages(ftPdf, ftPdf.getPageIndices())
              pages.forEach(p => mergedPdf.addPage(p))
            }
          }
        }
      }

      // 6. ADD BACK COVER (AS THE VERY LAST PAGE)
      try {
        const coverBuffer = await downloadPublicDriveFile(BACK_COVER_URL)
        if (coverBuffer) {
          const coverPdf = await PDFDocument.load(coverBuffer)
          const pages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices())
          pages.forEach(p => mergedPdf.addPage(p))
        }
      } catch (error) {
        console.error('Error adding Dossier back cover page:', error)
      }

      finalPdfBuffer = Buffer.from(await mergedPdf.save())
    } catch (mergeError) {
      console.error('Error merging PDFs for dossier:', mergeError)
      // Fallback to base PDF if merge fails
    }
  }

  const filename = `oferta-${offerNum}${includeFT || includeCert || includeES ? '-dossier' : ''}.pdf`

  return new NextResponse(finalPdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

