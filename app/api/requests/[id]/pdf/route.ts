import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

const palette = {
  primary: [41, 128, 185] as [number, number, number]
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Fetch assistance data
  const { data: assistance, error } = await supabase
    .from('support_assistances')
    .select(`
      *,
      customer:customers!customer_id(id, company_name),
      creator:profiles!created_by(full_name),
      assignments:support_assistance_assignments(
        profile:user_id(full_name)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !assistance) {
    return NextResponse.json({ error: 'Asistencia no encontrada' }, { status: 404 })
  }

  // 2. Fetch items
  const { data: items } = await supabase
    .from('support_assistance_items')
    .select('*')
    .eq('assistance_id', id)
    .order('created_at')

  // 3. Prepare base PDF with jsPDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  })

  const pageW = doc.internal.pageSize.getWidth()
  const margin = 12
  const contentW = pageW - (margin * 2)

  // ---- HEADER & FOOTER CONSTANTS ----
  const yellowHeader = [255, 215, 64] as [number, number, number]
  const lightGray = [245, 245, 245] as [number, number, number]
  const darkGray = [60, 60, 60] as [number, number, number]
  const borderColor = [200, 200, 200] as [number, number, number]

  // Get assignees names safely
  const assignmentList = assistance.assignments as any[] || []
  const assigneesNames = assignmentList.map((a: any) => a.profile?.full_name).filter(Boolean).join(', ')
  const atendidoPor = (assigneesNames || assistance.creator?.full_name || '-').substring(0, 25)
  
  // Date formatting with fallback
  const rawDate = assistance.fecha || assistance.created_at || ''
  const dateStr = String(rawDate).split('T')[0] // Get YYYY-MM-DD part
  const formattedDate = dateStr.includes('-') ? dateStr.split('-').reverse().join('/') : '-'

  // Pre-load logo buffer
  let logoBuffer: Buffer | null = null
  let logoData = ''
  try {
    const logoPath = path.join(process.cwd(), 'public', 'mysair-logo.png')
    if (fs.existsSync(logoPath)) {
      logoBuffer = fs.readFileSync(logoPath)
      const compressedBuffer = await sharp(logoBuffer).png().toBuffer()
      logoData = `data:image/png;base64,${compressedBuffer.toString('base64')}`
    }
  } catch (e) { console.error('Logo error:', e) }

  const drawHeader = (d: typeof doc) => {
    d.setFillColor(...yellowHeader)
    d.rect(0, 0, pageW, 28, 'F')

    if (logoData) {
      const props = d.getImageProperties(logoData)
      const targetH = 12
      const targetW = (props.width / props.height) * targetH
      d.addImage(logoData, 'PNG', margin, 8, targetW, targetH)
    }

    d.setFontSize(18).setFont('helvetica', 'bold').setTextColor(41, 128, 185)
    d.text('INFORME DE ASISTENCIA TÉCNICA', pageW - margin, 16, { align: 'right' })

    // Section 1: Info
    const hy = 35
    d.setDrawColor(...borderColor).setLineWidth(0.2)
    
    // Nº Incidencia
    d.rect(margin, hy, 50, 10)
    d.setFillColor(...lightGray)
    d.rect(margin, hy, 30, 10, 'F')
    d.rect(margin, hy, 30, 10, 'S')
    d.setFontSize(8).setFont('helvetica', 'normal').setTextColor(...darkGray)
    d.text('Nº Incidencia', margin + 2, hy + 6.5)
    d.setFontSize(12).setFont('helvetica', 'bold').setTextColor(0, 0, 0)
    d.text(assistance.external_id || assistance.id.toString(), margin + 32, hy + 6.5)

    // Atendido por
    d.setFontSize(8).setFont('helvetica', 'normal').setTextColor(...darkGray)
    d.text('Atendido por:', 105, hy + 6.5)
    d.rect(125, hy + 2, 40, 7)
    d.setFontSize(8).setFont('helvetica', 'normal').setTextColor(0, 0, 0)
    d.text(atendidoPor, 127, hy + 6.5)

    // Fecha (Aligned to right border)
    const dateBoxW = 22
    const dateBoxX = pageW - margin - dateBoxW
    d.setFontSize(8).setFont('helvetica', 'normal').setTextColor(...darkGray)
    d.text('Fecha:', dateBoxX - 10, hy + 6.5)
    d.rect(dateBoxX, hy + 2, dateBoxW, 7)
    d.text(formattedDate, dateBoxX + 2, hy + 6.5)

    // Motivo (Multiline support)
    const my = hy + 12
    const labelW = 30
    const textW = contentW - labelW - 15
    const motivoLines = d.splitTextToSize(assistance.titulo || '-', textW)
    const rowH = Math.max(8, motivoLines.length * 4 + 4)
    
    d.setDrawColor(...borderColor)
    d.rect(margin, my, contentW, rowH)
    d.setFillColor(...lightGray)
    d.rect(margin, my, labelW, rowH, 'F')
    d.rect(margin, my, labelW, rowH, 'S')
    
    d.setFontSize(8).setFont('helvetica', 'normal').setTextColor(...darkGray)
    d.text('Motivo', margin + 2, my + 5)
    d.setFontSize(9).setFont('helvetica', 'normal').setTextColor(0, 0, 0)
    d.text(motivoLines, margin + labelW + 4, my + 5)
    
    return my + rowH + 12
  }

  // Initial Header for Main Report
  const nextY = drawHeader(doc)
  let y = nextY

  // ---- SECTION 2: DATOS DEL CLIENTE ----
  const colW1 = contentW * 0.58
  const colW2 = contentW * 0.42
  const rightX = margin + colW1

  const drawGridItem = (x: number, y: number, w: number, label: string, value: string, labelW = 20) => {
    doc.setDrawColor(...borderColor).setLineWidth(0.1)
    doc.rect(x, y, w, 7)
    doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(...darkGray)
    doc.text(label, x + 2, y + 5)
    doc.line(x + labelW, y, x + labelW, y + 7)
    doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(0, 0, 0)
    
    const valStr = String(value || '-').trim()
    const maxValW = w - labelW - 3
    const truncated = doc.splitTextToSize(valStr, maxValW)[0] || '-'
    doc.text(truncated, x + labelW + 2, y + 5)
  }

  drawGridItem(margin, y, colW1, 'Empresa', assistance.customer?.company_name, 20)
  drawGridItem(rightX, y, colW2, 'Tipo Incidencia', assistance.tipo_incidencia, 25)
  y += 7
  drawGridItem(margin, y, colW1, 'Contacto', assistance.contacto_nombre, 20)
  drawGridItem(rightX, y, colW2, 'Estado', assistance.estado, 20)
  y += 7
  drawGridItem(margin, y, colW1, 'Cargo', assistance.tipo_cliente, 20)
  drawGridItem(rightX, y, colW2, 'Subestado', assistance.subestado, 20)
  y += 7
  drawGridItem(margin, y, colW1, 'Teléfono', assistance.contacto_telefono, 20)
  drawGridItem(rightX, y, colW2, 'Distribuidor', assistance.distribuidor, 20)
  y += 7
  drawGridItem(margin, y, colW1, 'Email', assistance.contacto_email, 20)
  drawGridItem(rightX, y, colW2, 'Sat', assistance.sat, 20)
  y += 7
  drawGridItem(margin, y, contentW, 'Dirección', assistance.direccion, 20)
  y += 7
  drawGridItem(margin, y, colW1, 'Provincia', assistance.provincia, 20)
  drawGridItem(rightX, y, colW2, 'RMA', String(assistance.rma_number || 0), 20)
  y += 7
  const pobW = colW1 * 0.72
  const cpW = colW1 * 0.28
  drawGridItem(margin, y, pobW, 'Población', assistance.ciudad, 20)
  drawGridItem(margin + pobW, y, cpW, 'CP', assistance.codigo_postal, 10)
  drawGridItem(rightX, y, colW2, 'Tiempo Llamada', String(assistance.duracion_llamada || 0), 28)
  
  y += 12

  // ---- SECTION 3: ARTICULOS RELACIONADOS ----
  doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(...palette.primary)
  doc.text('Artículos relacionados', margin, y)
  y += 4

  const tableRows = items?.map(item => [
    item.referencia || '-',
    item.cantidad || 1,
    item.observacion || '-',
    item.en_garantia ? '[X]' : '[ ]'
  ]) || []

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, top: 65 },
    head: [['Referencias', 'Cantidad', 'Observaciones', 'Garantía']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [189, 215, 238], textColor: [0, 0, 0], fontSize: 9, halign: 'center' },
    styles: { fontSize: 8, cellPadding: 2 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawHeader(doc)
    }
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // ---- SECTION 3.5: DATOS DE FACTURA DE JUSTIFICACIÓN ----
  if (assistance.factura_numero || assistance.factura_fecha) {
    if (y + 20 > 270) {
      doc.addPage()
      drawHeader(doc)
      y = 65
    }

    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(...palette.primary)
    doc.text('Datos de la Factura de Justificación', margin, y)
    y += 4

    const factDateStr = assistance.factura_fecha ? String(assistance.factura_fecha).split('T')[0].split('-').reverse().join('/') : '-'

    const factColW = contentW / 2
    drawGridItem(margin, y, factColW, 'Nº Factura', assistance.factura_numero, 20)
    drawGridItem(margin + factColW, y, factColW, 'Fecha Factura', factDateStr, 22)
    y += 14
  }

  // ---- SECTION 4: OBSERVACIONES Y ANOTACIONES ----
  const drawNoteSection = (title: string, text: string, color: [number, number, number] | null = null) => {
    const lines = doc.splitTextToSize(text || (color ? '' : '-'), contentW - 4)
    const rectH = Math.max(8, lines.length * 4 + 4)
    const neededH = rectH + 10
    
    if (y + neededH > 270) {
      doc.addPage()
      drawHeader(doc)
      y = 65
    }
    
    doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(...darkGray)
    doc.text(title, margin, y)
    y += 2
    
    if (color) {
      doc.setFillColor(...color)
      doc.rect(margin, y, contentW, rectH, 'F')
      doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(0, 0, 0)
      doc.text(lines, margin + 2, y + 5)
      y += rectH + 5
    } else {
      doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(0, 0, 0)
      doc.text(lines, margin, y + 4)
      y += (lines.length * 4) + 8
    }
  }

  drawNoteSection('Observaciones', assistance.incidencia_desc, [245, 245, 245])
  drawNoteSection('Solución', assistance.solucion_desc, [232, 245, 233])
  drawNoteSection('Observaciones Administración', assistance.comentarios_admin)

  // Output base PDF to Buffer
  const basePdfBuffer = Buffer.from(doc.output('arraybuffer'))

  // Load into pdf-lib to merge attached documents page-by-page
  const mainPdfDoc = await PDFDocument.load(basePdfBuffer)
  const helvetica = await mainPdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await mainPdfDoc.embedFont(StandardFonts.HelveticaBold)

  let embeddedLogo: any = null
  if (logoBuffer) {
    try {
      embeddedLogo = await mainPdfDoc.embedPng(logoBuffer)
    } catch (e) {
      console.warn('Error embedding logo in pdf-lib:', e)
    }
  }

  // Helper to draw standard Header on attached pages in pdf-lib
  const drawPdfLibHeader = (page: any) => {
    // Top yellow bar (0 to 28mm -> y = 762.52 pt to 841.89 pt)
    page.drawRectangle({
      x: 0,
      y: 762.52,
      width: 595.28,
      height: 79.37,
      color: rgb(1, 0.843, 0.251)
    })

    if (embeddedLogo) {
      const targetH = 34
      const targetW = (embeddedLogo.width / embeddedLogo.height) * targetH
      page.drawImage(embeddedLogo, {
        x: 34,
        y: 785,
        width: targetW,
        height: targetH
      })
    }

    page.drawText('INFORME DE ASISTENCIA TÉCNICA', {
      x: 310,
      y: 795,
      size: 13,
      font: helveticaBold,
      color: rgb(0.16, 0.50, 0.72)
    })

    // Info Section Outer Box
    page.drawRectangle({
      x: 34,
      y: 720,
      width: 527,
      height: 26,
      borderColor: rgb(0.78, 0.78, 0.78),
      borderWidth: 0.5
    })
    page.drawRectangle({
      x: 34,
      y: 720,
      width: 90,
      height: 26,
      color: rgb(0.96, 0.96, 0.96)
    })
    page.drawText('Nº Incidencia', {
      x: 40,
      y: 730,
      size: 8,
      font: helvetica,
      color: rgb(0.24, 0.24, 0.24)
    })
    page.drawText(String(assistance.external_id || assistance.id), {
      x: 130,
      y: 730,
      size: 11,
      font: helveticaBold,
      color: rgb(0, 0, 0)
    })

    page.drawText(`Atendido por: ${atendidoPor}`, {
      x: 270,
      y: 730,
      size: 8,
      font: helvetica,
      color: rgb(0, 0, 0)
    })

    page.drawText(`Fecha: ${formattedDate}`, {
      x: 460,
      y: 730,
      size: 8,
      font: helvetica,
      color: rgb(0, 0, 0)
    })

    // Motivo Box
    page.drawRectangle({
      x: 34,
      y: 686,
      width: 527,
      height: 26,
      borderColor: rgb(0.78, 0.78, 0.78),
      borderWidth: 0.5
    })
    page.drawRectangle({
      x: 34,
      y: 686,
      width: 90,
      height: 26,
      color: rgb(0.96, 0.96, 0.96)
    })
    page.drawText('Motivo', {
      x: 40,
      y: 696,
      size: 8,
      font: helvetica,
      color: rgb(0.24, 0.24, 0.24)
    })
    page.drawText(String(assistance.titulo || '-').substring(0, 75), {
      x: 130,
      y: 696,
      size: 9,
      font: helvetica,
      color: rgb(0, 0, 0)
    })
  }

  // Gather all attachments
  const facturasList: any[] = assistance.adjuntos_facturas || []
  const defectosList: any[] = assistance.adjuntos_defectos || []
  const legacyAdjuntos: any[] = assistance.adjuntos || []

  const allAttachments = [
    ...facturasList.map(f => ({ ...f, sectionTitle: 'Factura / Doc. Administrativo' })),
    ...defectosList.map(f => ({ ...f, sectionTitle: 'Evidencia Defecto Material' })),
    ...legacyAdjuntos.map(f => ({ ...f, sectionTitle: 'Adjunto' }))
  ]

  // Process attachments page by page
  for (const file of allAttachments) {
    const category = getFileTypeCategory(file)
    const sectionLabel = file.sectionTitle || 'Adjunto'
    const fileName = file.name || 'Archivo adjunto'
    const fileSizeStr = formatFileSize(file.size)

    if (!file.url) continue

    if (category === 'pdf') {
      try {
        const res = await fetch(file.url)
        if (res.ok) {
          const pdfBytes = await res.arrayBuffer()
          const attachedDoc = await PDFDocument.load(pdfBytes)
          const attachedPages = attachedDoc.getPages()
          const totalAttachedPages = attachedPages.length

          for (let pIdx = 0; pIdx < totalAttachedPages; pIdx++) {
            const embeddedPage = await mainPdfDoc.embedPage(attachedPages[pIdx])
            const newPage = mainPdfDoc.addPage([595.28, 841.89]) // A4

            // Draw Header
            drawPdfLibHeader(newPage)

            // Title Banner above content
            newPage.drawRectangle({
              x: 34,
              y: 654,
              width: 527,
              height: 20,
              color: rgb(0.94, 0.94, 0.94),
              borderColor: rgb(0.8, 0.8, 0.8),
              borderWidth: 0.5
            })
            const labelText = `[${sectionLabel.toUpperCase()}] ${fileName.substring(0, 50)} (Página ${pIdx + 1} de ${totalAttachedPages})`
            newPage.drawText(labelText, {
              x: 40,
              y: 660,
              size: 8,
              font: helveticaBold,
              color: rgb(0.16, 0.50, 0.72)
            })

            // Calculate scale to fit inside usable content box (527 pt x 580 pt)
            const maxW = 527
            const maxH = 580
            const scale = Math.min(maxW / embeddedPage.width, maxH / embeddedPage.height, 1)
            const w = embeddedPage.width * scale
            const h = embeddedPage.height * scale
            const x = 34 + (maxW - w) / 2
            const y = 50 + (maxH - h) / 2

            // Draw embedded page
            newPage.drawPage(embeddedPage, { x, y, width: w, height: h })

            // Frame border
            newPage.drawRectangle({
              x,
              y,
              width: w,
              height: h,
              borderColor: rgb(0.85, 0.85, 0.85),
              borderWidth: 0.5
            })
          }
          continue
        }
      } catch (err) {
        console.error('Error embedding PDF file in report:', file.url, err)
      }
    }

    if (category === 'image') {
      try {
        const res = await fetch(file.url)
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const processed = await sharp(buffer)
            .rotate()
            .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
            .toBuffer({ resolveWithObject: true })

          const isJpeg = processed.info.format === 'jpeg'
          const embeddedImg = isJpeg
            ? await mainPdfDoc.embedJpg(processed.data)
            : await mainPdfDoc.embedPng(processed.data)

          const newPage = mainPdfDoc.addPage([595.28, 841.89]) // A4
          drawPdfLibHeader(newPage)

          // Title Banner
          newPage.drawRectangle({
            x: 34,
            y: 654,
            width: 527,
            height: 20,
            color: rgb(0.94, 0.94, 0.94),
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 0.5
          })
          newPage.drawText(`[${sectionLabel.toUpperCase()}] ${fileName.substring(0, 60)}`, {
            x: 40,
            y: 660,
            size: 8,
            font: helveticaBold,
            color: rgb(0.16, 0.50, 0.72)
          })

          const maxW = 527
          const maxH = 580
          const scale = Math.min(maxW / embeddedImg.width, maxH / embeddedImg.height, 1)
          const w = embeddedImg.width * scale
          const h = embeddedImg.height * scale
          const x = 34 + (maxW - w) / 2
          const y = 50 + (maxH - h) / 2

          newPage.drawImage(embeddedImg, { x, y, width: w, height: h })
          newPage.drawRectangle({
            x,
            y,
            width: w,
            height: h,
            borderColor: rgb(0.85, 0.85, 0.85),
            borderWidth: 0.5
          })

          continue
        }
      } catch (err) {
        console.error('Error embedding image in report:', file.url, err)
      }
    }

    // Fallback for Word, Video, or un-parseable files
    const newPage = mainPdfDoc.addPage([595.28, 841.89])
    drawPdfLibHeader(newPage)

    // Title Card
    newPage.drawRectangle({
      x: 34,
      y: 580,
      width: 527,
      height: 90,
      color: rgb(0.98, 0.98, 0.98),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5
    })

    newPage.drawRectangle({
      x: 46,
      y: 630,
      width: 60,
      height: 24,
      color: rgb(0.16, 0.50, 0.72)
    })
    newPage.drawText(category.toUpperCase(), {
      x: 52,
      y: 638,
      size: 8,
      font: helveticaBold,
      color: rgb(1, 1, 1)
    })

    newPage.drawText(`[${sectionLabel}] ${fileName.substring(0, 60)}`, {
      x: 120,
      y: 642,
      size: 10,
      font: helveticaBold,
      color: rgb(0, 0, 0)
    })

    newPage.drawText(`Tamaño del archivo: ${fileSizeStr}`, {
      x: 120,
      y: 622,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4)
    })

    newPage.drawText(`URL de acceso: ${file.url.substring(0, 85)}`, {
      x: 46,
      y: 595,
      size: 8,
      font: helvetica,
      color: rgb(0.16, 0.50, 0.72)
    })
  }

  // Footer & Page Numbering across ALL pages in the document
  const totalPages = mainPdfDoc.getPageCount()
  for (let i = 0; i < totalPages; i++) {
    const page = mainPdfDoc.getPage(i)
    
    // Draw footer yellow bar
    page.drawRectangle({
      x: 34,
      y: 15,
      width: 527,
      height: 22,
      color: rgb(1, 0.843, 0.251)
    })

    const footerText = `Página ${i + 1} de ${totalPages}`
    const textWidth = helvetica.widthOfTextAtSize(footerText, 9)
    page.drawText(footerText, {
      x: (595.28 - textWidth) / 2,
      y: 22,
      size: 9,
      font: helvetica,
      color: rgb(0, 0, 0)
    })
  }

  const finalPdfBytes = await mainPdfDoc.save()
  const incidenceId = assistance.external_id || assistance.id
  const filename = `${incidenceId} - Informe Asistencia.pdf`

  return new NextResponse(Buffer.from(finalPdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function getFileTypeCategory(file: any): 'image' | 'video' | 'pdf' | 'word' | 'other' {
  const type = (file?.type || '').toLowerCase()
  const name = (file?.name || '').toLowerCase()

  if (type.includes('image') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(name)) {
    return 'image'
  }
  if (type.includes('video') || /\.(mp4|webm|mov|avi|mkv|wmv)$/i.test(name)) {
    return 'video'
  }
  if (type.includes('pdf') || /\.pdf$/i.test(name)) {
    return 'pdf'
  }
  if (type.includes('word') || type.includes('officedocument') || /\.(doc|docx)$/i.test(name)) {
    return 'word'
  }
  return 'other'
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return 'Desconocido'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function calculateElapsedTime(facturaFechaStr?: string, incidenciaFechaStr?: string): string {
  if (!facturaFechaStr) return ''

  try {
    const start = new Date(facturaFechaStr + 'T00:00:00')
    const end = incidenciaFechaStr ? new Date(String(incidenciaFechaStr).split('T')[0] + 'T00:00:00') : new Date()

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return ''

    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return 'Fecha posterior'
    }
    if (diffDays === 0) {
      return 'Mismo día'
    }
    if (diffDays < 30) {
      return `${diffDays} día${diffDays === 1 ? '' : 's'}`
    }

    const years = Math.floor(diffDays / 365)
    const remDaysAfterYears = diffDays % 365
    const months = Math.floor(remDaysAfterYears / 30)
    const remainingDays = remDaysAfterYears % 30

    const parts: string[] = []
    if (years > 0) parts.push(`${years}a`)
    if (months > 0) parts.push(`${months}m`)
    if (remainingDays > 0 && years === 0) parts.push(`${remainingDays}d`)

    return `${parts.join(' ')} (${diffDays}d)`
  } catch {
    return ''
  }
}
