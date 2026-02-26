import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import PDFDocument from 'pdfkit'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireProfile()
    const { id } = await params
    const supabase = await createClient()

    // Fetch offer with related data
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
      return new Response('Oferta no encontrada', { status: 404 })
    }

    // Fetch offer items
    const { data: items } = await supabase
      .from('offer_items')
      .select(`
        *,
        product:products!product_id(id, referencia, modelo_nombre, descripcion)
      `)
      .eq('offer_id', id)
      .order('id')

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
    })

    // Generate offer number format
    const offerYear = new Date(offer.created_at).getFullYear()
    const offerNumberFormatted = `${offerYear}-${String(offer.offer_number).padStart(4, '0')}`

    // Add logo image (placeholder - using text instead)
    doc.fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#003D7A')
      .text('MYS air', 50, 50)
    
    doc.fontSize(10)
      .fillColor('#999999')
      .text('sistema de zonas y difusión', 50, 75)

    // Add header information in two columns
    doc.fontSize(9)
      .fillColor('#333333')

    // Left column
    const leftX = 50
    const rightX = 310
    let y = 120

    // Left column - Nº Oferta
    doc.font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#666666')
      .text('Nº OFERTA', leftX, y)
    doc.font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#333333')
      .text(offerNumberFormatted, leftX, y + 15)
    
    y += 40

    // Left column - Referencia
    doc.font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#666666')
      .text('REFERENCIA', leftX, y)
    doc.font('Helvetica')
      .fontSize(9)
      .fillColor('#333333')
      .text(offer.title || '-', leftX, y + 15)
    
    y += 35

    // Left column - Cliente
    doc.font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#666666')
      .text('CLIENTE', leftX, y)
    doc.font('Helvetica')
      .fontSize(9)
      .fillColor('#333333')
      .text(offer.customer?.company_name || '-', leftX, y + 15)
    
    y += 35

    // Left column - Contacto
    doc.font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#666666')
      .text('CONTACTO', leftX, y)
    const contactName = offer.contact 
      ? `${offer.contact.nombre} ${offer.contact.apellidos}`
      : '-'
    doc.font('Helvetica')
      .fontSize(9)
      .fillColor('#333333')
      .text(contactName, leftX, y + 15)

    // Right column
    y = 120

    // Right column - Fecha
    doc.font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#666666')
      .text('FECHA', rightX, y)
    doc.font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#333333')
      .text(new Date(offer.created_at).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }), rightX, y + 15)
    
    y += 40

    // Right column - Realiza por
    doc.font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#666666')
      .text('REALIZA POR', rightX, y)
    doc.font('Helvetica')
      .fontSize(9)
      .fillColor('#333333')
      .text(offer.created_by_profile?.full_name || '-', rightX, y + 15)
    
    y += 35

    // Right column - Plazo de Entrega
    doc.font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#666666')
      .text('PLAZO DE ENTREGA', rightX, y)
    doc.font('Helvetica')
      .fontSize(9)
      .fillColor('#333333')
      .text('A consultar', rightX, y + 15)
    
    y += 35

    // Right column - Precio
    doc.font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#666666')
      .text('PRECIO', rightX, y)
    doc.font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#333333')
      .text('NETO', rightX, y + 15)

    // Draw header border
    doc.strokeColor('#CCCCCC')
      .lineWidth(1)
      .moveTo(50, 240)
      .lineTo(550, 240)
      .stroke()

    // Add table header
    const tableTop = 260
    const colWidths = [80, 200, 60, 70, 80]
    const headers = ['Referencia', 'Descripción', 'Cantidad', 'Neto', 'Neto Total']
    
    // Header background
    doc.rect(50, tableTop, 500, 20)
      .fillAndStroke('#B3D9FF', '#0066CC')

    // Header text
    doc.fillColor('#000000')
      .font('Helvetica-Bold')
      .fontSize(9)

    let xPos = 50
    headers.forEach((header, i) => {
      const align = i > 1 ? 'right' : 'left'
      const padding = align === 'right' ? 5 : 5
      doc.text(header, xPos + padding, tableTop + 5, { 
        width: colWidths[i] - 10, 
        align 
      })
      xPos += colWidths[i]
    })

    // Add table rows
    let tableY = tableTop + 25
    const rowHeight = 20
    let totalAmount = 0

    if (items && items.length > 0) {
      items.forEach((item, index) => {
        const isEven = index % 2 === 0
        
        // Row background
        if (isEven) {
          doc.rect(50, tableY - 5, 500, rowHeight)
            .fill('#F9F9F9')
        }

        // Row border
        doc.strokeColor('#EEEEEE')
          .lineWidth(0.5)
          .moveTo(50, tableY + rowHeight - 5)
          .lineTo(550, tableY + rowHeight - 5)
          .stroke()

        // Row data
        doc.fillColor('#333333')
          .font('Helvetica')
          .fontSize(9)

        const rowData = [
          item.product?.referencia || '-',
          item.description || item.product?.descripcion || '-',
          String(item.quantity),
          `€${(item.pvp || 0).toFixed(2)}`,
          `€${(item.neto_total2 || 0).toFixed(2)}`
        ]

        xPos = 50
        rowData.forEach((data, i) => {
          const align = i > 1 ? 'right' : 'left'
          const padding = align === 'right' ? 5 : 5
          doc.text(data, xPos + padding, tableY, { 
            width: colWidths[i] - 10, 
            align 
          })
          xPos += colWidths[i]
        })

        totalAmount += Number(item.neto_total2 || 0)
        tableY += rowHeight
      })

      // Total row
      doc.rect(50, tableY - 5, 500, rowHeight)
        .fillAndStroke('#E8E8E8', '#999999')

      doc.fillColor('#000000')
        .font('Helvetica-Bold')
        .fontSize(9)

      xPos = 50
      const totalRowData = ['', '', '', 'TOTAL:', `€${totalAmount.toFixed(2)}`]
      totalRowData.forEach((data, i) => {
        const align = i > 1 ? 'right' : 'left'
        const padding = align === 'right' ? 5 : 5
        doc.text(data, xPos + padding, tableY, { 
          width: colWidths[i] - 10, 
          align 
        })
        xPos += colWidths[i]
      })
    }

    // Add footer
    doc.fontSize(9)
      .fillColor('#999999')
      .text('Página 1 de 1', 50, 750, { align: 'center' })

    // Finalize PDF
    const chunks: Buffer[] = []
    
    return new Promise((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        resolve(new Response(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Oferta-${offerNumberFormatted}.pdf"`,
            'Content-Length': pdfBuffer.length.toString(),
          },
        }))
      })

      doc.on('error', (err) => {
        reject(err)
      })

      doc.end()
    })
  } catch (error) {
    console.error('[v0] Error generating PDF:', error)
    return new Response('Error al generar el PDF', { status: 500 })
  }
}
