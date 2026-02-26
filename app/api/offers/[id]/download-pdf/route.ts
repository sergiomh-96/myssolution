import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

interface RequestProps {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RequestProps) {
  try {
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
      return new Response('Offer not found', { status: 404 })
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

    // Generate HTML content
    const offerYear = new Date(offer.created_at).getFullYear()
    const offerNumberFormatted = `${offerYear}-${String(offer.offer_number).padStart(4, '0')}`

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif;
      padding: 40px;
      color: #333;
      line-height: 1.4;
      background: white;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .logo-section {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #e0e0e0;
    }
    .logo-img {
      height: 80px;
      margin-bottom: 20px;
    }
    .header-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      margin-bottom: 30px;
    }
    .header-column {
      padding: 0;
    }
    .header-left {
      border-right: 2px solid #ccc;
      padding-right: 20px;
    }
    .header-right {
      padding-left: 20px;
    }
    .info-group {
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    .info-group:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .label {
      font-size: 11px;
      font-weight: bold;
      color: #0066cc;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .value {
      font-size: 13px;
      font-weight: 500;
      color: #000;
    }
    .table-section {
      margin-top: 30px;
      margin-bottom: 20px;
    }
    .table-title {
      font-size: 12px;
      font-weight: bold;
      color: #0066cc;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    thead {
      background-color: #b3d9ff;
      border: 2px solid #0066cc;
    }
    th {
      padding: 10px;
      text-align: left;
      font-weight: bold;
      color: #000;
      border: 1px solid #0066cc;
    }
    td {
      padding: 10px;
      border: 1px solid #ddd;
    }
    tbody tr:nth-child(odd) {
      background-color: #ffffff;
    }
    tbody tr:nth-child(even) {
      background-color: #f5f5f5;
    }
    .total-row {
      background-color: #e8e8e8;
      font-weight: bold;
      border: 2px solid #666;
    }
    .total-row td {
      border: 1px solid #666;
      padding: 12px 10px;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .footer {
      text-align: center;
      font-size: 10px;
      color: #999;
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
    }
    @media print {
      body { padding: 20mm; }
      .logo-section { page-break-inside: avoid; }
      .header-info { page-break-inside: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-section">
      <svg class="logo-img" viewBox="0 0 1500 200" xmlns="http://www.w3.org/2000/svg">
        <!-- Logo simplificado en SVG -->
        <text x="50" y="100" font-size="60" font-weight="bold" fill="#003d7a">MYS</text>
        <text x="400" y="100" font-size="60" font-weight="bold" fill="#1ba0d8">air</text>
        <text x="100" y="140" font-size="20" fill="#999">sistema de zonas y difusión</text>
      </svg>
    </div>

    <div class="header-info">
      <div class="header-column header-left">
        <div class="info-group">
          <div class="label">Nº Oferta</div>
          <div class="value">${offerNumberFormatted}</div>
        </div>
        <div class="info-group">
          <div class="label">Referencia</div>
          <div class="value">${offer.title || '-'}</div>
        </div>
        <div class="info-group">
          <div class="label">Cliente</div>
          <div class="value">${offer.customer?.company_name || '-'}</div>
        </div>
        <div class="info-group">
          <div class="label">Contacto</div>
          <div class="value">${offer.contact ? `${offer.contact.nombre} ${offer.contact.apellidos}` : '-'}</div>
        </div>
      </div>

      <div class="header-column header-right">
        <div class="info-group">
          <div class="label">Fecha</div>
          <div class="value">${new Date(offer.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
        </div>
        <div class="info-group">
          <div class="label">Realiza por</div>
          <div class="value">${offer.created_by_profile?.full_name || '-'}</div>
        </div>
        <div class="info-group">
          <div class="label">Plazo de Entrega</div>
          <div class="value">A consultar</div>
        </div>
        <div class="info-group">
          <div class="label">Precio</div>
          <div class="value">NETO</div>
        </div>
      </div>
    </div>

    <div class="table-section">
      <table>
        <thead>
          <tr>
            <th>Referencia</th>
            <th>Descripción</th>
            <th class="text-center">Cantidad</th>
            <th class="text-right">Neto</th>
            <th class="text-right">Neto Total</th>
          </tr>
        </thead>
        <tbody>
          ${items?.map((item) => `
            <tr>
              <td>${item.product?.referencia || '-'}</td>
              <td>${item.description || item.product?.descripcion || '-'}</td>
              <td class="text-center">${item.quantity}</td>
              <td class="text-right">€${(item.pvp || 0).toFixed(2)}</td>
              <td class="text-right">€${(item.neto_total2 || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="4" class="text-right">TOTAL:</td>
            <td class="text-right">€${(items?.reduce((sum, item) => sum + Number(item.neto_total2 || 0), 0) || 0).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Página 1 de 1</p>
    </div>
  </div>
</body>
</html>
    `

    // Return HTML for client to print/save as PDF
    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="Oferta-${offerNumberFormatted}.html"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return new Response('Error generating PDF', { status: 500 })
  }
}
