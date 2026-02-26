import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

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
        tarifa:tarifas!tarifa_id(id_tarifa, nombre),
        created_by_profile:profiles!created_by(full_name, email),
        approved_by_profile:profiles!approved_by(full_name, email)
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

    // Generate HTML for PDF
    const offerYear = new Date(offer.created_at).getFullYear()
    const offerNumberFormatted = `${offerYear}-${String(offer.offer_number).padStart(4, '0')}`
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    body { 
      font-family: Arial, sans-serif; 
      padding: 40px; 
      color: #333;
      line-height: 1.4;
    }
    @page { 
      size: A4; 
      margin: 20mm;
    }
    .logo-container { 
      position: absolute; 
      top: 20px; 
      left: 20px; 
      width: 120px; 
      height: auto; 
    }
    .logo-container img { 
      width: 100%; 
      height: auto; 
    }
    .header-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      margin-top: 40px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #ddd;
    }
    .header-left {
      border-right: 2px solid #ddd;
      padding-right: 20px;
    }
    .header-right {
      padding-left: 20px;
    }
    .info-row {
      display: grid;
      grid-template-columns: 1fr;
      border-bottom: 1px solid #ddd;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .info-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
    .label { 
      font-weight: bold; 
      font-size: 9px; 
      color: #666; 
      text-transform: uppercase; 
      margin-bottom: 2px;
    }
    .value { 
      font-size: 11px; 
      font-weight: 500;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 12px;
      margin-bottom: 20px; 
    }
    thead { 
      background-color: #b3d9ff; 
      border: 2px solid #0066cc;
    }
    th { 
      padding: 8px; 
      text-align: left; 
      font-size: 11px; 
      font-weight: bold; 
      border: 1px solid #0066cc;
    }
    td { 
      padding: 8px; 
      font-size: 10px; 
      border: 1px solid #ddd;
    }
    tbody tr:nth-child(even) { 
      background-color: #f9f9f9; 
    }
    tbody tr:nth-child(odd) { 
      background-color: #ffffff; 
    }
    .total-row { 
      background-color: #e8e8e8; 
      font-weight: bold;
      border: 1px solid #999;
    }
    .total-row td {
      border: 1px solid #999;
    }
    .footer { 
      text-align: center; 
      font-size: 9px; 
      color: #999; 
      margin-top: 16px; 
      padding-top: 8px; 
      border-top: 1px solid #ddd; 
    }
  </style>
</head>
<body>
  <div class="logo-container">
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="MYS air logo" />
  </div>

  <div class="header-info">
    <div class="header-left">
      <div class="info-row">
        <div class="label">Nº Oferta</div>
        <div class="value">${offerNumberFormatted}</div>
      </div>
      <div class="info-row">
        <div class="label">Referencia</div>
        <div class="value">${offer.title || '-'}</div>
      </div>
      <div class="info-row">
        <div class="label">Cliente</div>
        <div class="value">${offer.customer?.company_name || '-'}</div>
      </div>
      <div class="info-row">
        <div class="label">Contacto</div>
        <div class="value">${offer.contact ? offer.contact.nombre + ' ' + offer.contact.apellidos : '-'}</div>
      </div>
    </div>
    <div class="header-right">
      <div class="info-row">
        <div class="label">Fecha</div>
        <div class="value">${new Date(offer.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
      </div>
      <div class="info-row">
        <div class="label">Realiza por</div>
        <div class="value">${offer.created_by_profile?.full_name || '-'}</div>
      </div>
      <div class="info-row">
        <div class="label">Plazo de Entrega</div>
        <div class="value">A consultar</div>
      </div>
      <div class="info-row">
        <div class="label">Precio</div>
        <div class="value">NETO</div>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Referencia</th>
        <th>Descripción</th>
        <th style="text-align: center;">Cantidad</th>
        <th style="text-align: right;">Neto</th>
        <th style="text-align: right;">Neto Total</th>
      </tr>
    </thead>
    <tbody>
      ${items?.map((item) => `
        <tr>
          <td>${item.product?.referencia || '-'}</td>
          <td>${item.description || item.product?.descripcion || '-'}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">€${(item.pvp || 0).toFixed(2)}</td>
          <td style="text-align: right;">€${(item.neto_total2 || 0).toFixed(2)}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="4" style="text-align: right;">TOTAL:</td>
        <td style="text-align: right;">€${(items?.reduce((sum, item) => sum + Number(item.neto_total2 || 0), 0) || 0).toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>Página 1 de 1</p>
  </div>
</body>
</html>
    `

    // Return HTML as response with PDF headers
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="Oferta-${offer.offer_number}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return new Response('Error generando PDF', { status: 500 })
  }
}
