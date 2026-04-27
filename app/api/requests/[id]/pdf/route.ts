import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'

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

  // 3. Prepare PDF
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

  // Pre-load logo
  let logoData = ''
  try {
    const logoPath = path.join(process.cwd(), 'public', 'mysair-logo.png')
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath)
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
    const textW = contentW - labelW - 15 // Very conservative width to prevent any overflow
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

  // Initial Header
  const nextY = drawHeader(doc)
  let y = nextY

  // ---- SECTION 2: DATOS DEL CLIENTE ----
  const colW = contentW / 2
  const drawGridItem = (x: number, y: number, w: number, label: string, value: string, labelW = 35) => {
    doc.setDrawColor(...borderColor).setLineWidth(0.1)
    doc.rect(x, y, w, 7)
    doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(...darkGray)
    doc.text(label, x + 2, y + 5)
    doc.line(x + labelW, y, x + labelW, y + 7)
    doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(0, 0, 0)
    doc.text(String(value || '-').substring(0, 70), x + labelW + 2, y + 5)
  }

  drawGridItem(margin, y, colW, 'Empresa', assistance.customer?.company_name)
  drawGridItem(margin + colW, y, colW, 'Tipo Incidencia', assistance.tipo_incidencia)
  y += 7
  drawGridItem(margin, y, colW, 'Contacto', assistance.contacto_nombre)
  drawGridItem(margin + colW, y, colW, 'Estado', assistance.estado)
  y += 7
  drawGridItem(margin, y, colW, 'Cargo', assistance.tipo_cliente)
  drawGridItem(margin + colW, y, colW, 'Subestado', assistance.subestado)
  y += 7
  drawGridItem(margin, y, colW, 'Teléfono/email', `${assistance.contacto_telefono || ''} ${assistance.contacto_email || ''}`)
  drawGridItem(margin + colW, y, colW, 'Distribuidor', assistance.distribuidor)
  y += 7
  drawGridItem(margin, y, contentW, 'Dirección', assistance.direccion)
  y += 7
  drawGridItem(margin, y, colW, 'Provincia', assistance.provincia)
  drawGridItem(margin + colW, y, colW, 'Sat', assistance.sat)
  y += 7
  const pobW = colW * 0.7
  const cpW = colW * 0.3
  drawGridItem(margin, y, pobW, 'Población', assistance.ciudad, 25)
  drawGridItem(margin + pobW, y, cpW, 'CP', assistance.codigo_postal, 10)
  drawGridItem(margin + colW, y, colW, 'RMA', String(assistance.rma_number || 0))
  y += 7
  drawGridItem(margin + colW, y, colW, 'Tiempo Llamada', String(assistance.duracion_llamada || 0))
  
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
    margin: { left: margin, right: margin, top: 65 }, // Increased top margin to 65
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

  // ---- SECTION 4: OBSERVACIONES Y ANOTACIONES ----
  const drawNoteSection = (title: string, text: string, color: [number, number, number] | null = null) => {
    const lines = doc.splitTextToSize(text || (color ? '' : '-'), contentW - 4)
    const rectH = Math.max(8, lines.length * 4 + 4)
    const neededH = rectH + 10
    
    if (y + neededH > 270) {
      doc.addPage()
      drawHeader(doc)
      y = 65 // Increased y after page break to 65
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

  // ---- FINAL PAGINATION & FOOTERS ----
  const totalPages = (doc as any).internal.getNumberOfPages()
  const pageH = doc.internal.pageSize.getHeight()
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(...yellowHeader)
    doc.rect(margin, pageH - 15, contentW, 8, 'F')
    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(0, 0, 0)
    doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 9.5, { align: 'center' })
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
  const incidenceId = assistance.external_id || assistance.id
  const filename = `${incidenceId} - Informe Asistencia.pdf`

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
