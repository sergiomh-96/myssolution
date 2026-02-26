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

    // Generate offer number format
    const offerYear = new Date(offer.created_at).getFullYear()
    const offerNumberFormatted = `${offerYear}-${String(offer.offer_number).padStart(4, '0')}`

    // Generate HTML for printing/PDF
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Oferta ${offerNumberFormatted}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 20mm;
      }
      .no-print {
        display: none;
      }
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .container {
      max-width: 210mm;
      height: 297mm;
      background: white;
      margin: 20px auto;
      padding: 20mm;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      position: relative;
    }
    
    .logo {
      position: absolute;
      top: 20px;
      left: 20px;
      height: 60px;
      width: auto;
    }
    
    .header-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      margin-top: 80px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .header-left {
      border-right: 2px solid #e0e0e0;
      padding-right: 16px;
    }
    
    .header-right {
      padding-left: 16px;
    }
    
    .info-row {
      margin-bottom: 4px;
      padding-bottom: 4px;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .info-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    
    .info-label {
      font-size: 9px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 2px;
      letter-spacing: 0.5px;
    }
    
    .info-value {
      font-size: 12px;
      color: #333;
      font-weight: 500;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      margin-bottom: 16px;
      font-size: 11px;
    }
    
    thead {
      background-color: #b3d9ff;
      border-top: 2px solid #0066cc;
      border-bottom: 2px solid #0066cc;
    }
    
    th {
      padding: 8px;
      text-align: left;
      font-weight: 600;
      color: #003d99;
      border: 1px solid #0066cc;
      font-size: 10px;
    }
    
    td {
      padding: 8px;
      border: 1px solid #ddd;
      color: #333;
    }
    
    tbody tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    tbody tr:nth-child(odd) {
      background-color: white;
    }
    
    .total-row {
      background-color: #e8e8e8;
      font-weight: 600;
      border: 1px solid #999;
    }
    
    .total-row td {
      border: 1px solid #999;
      color: #333;
    }
    
    .text-center {
      text-align: center;
    }
    
    .text-right {
      text-align: right;
    }
    
    .footer {
      text-align: center;
      font-size: 9px;
      color: #999;
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #ddd;
    }
    
    .print-button {
      background: #0066cc;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-bottom: 20px;
    }
    
    .print-button:hover {
      background: #0052a3;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">Guardar como PDF</button>
  
  <div class="container">
    <div class="logo">
      <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMjQwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==" alt="MYS air logo" style="width: 100%; height: auto;">
    </div>

    <div class="header-info">
      <div class="header-left">
        <div class="info-row">
          <div class="info-label">Nº Oferta</div>
          <div class="info-value">${offerNumberFormatted}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Referencia</div>
          <div class="info-value">${escapeHtml(offer.title || '-')}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Cliente</div>
          <div class="info-value">${escapeHtml(offer.customer?.company_name || '-')}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Contacto</div>
          <div class="info-value">${escapeHtml(offer.contact ? offer.contact.nombre + ' ' + offer.contact.apellidos : '-')}</div>
        </div>
      </div>

      <div class="header-right">
        <div class="info-row">
          <div class="info-label">Fecha</div>
          <div class="info-value">${new Date(offer.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Realiza por</div>
          <div class="info-value">${escapeHtml(offer.created_by_profile?.full_name || '-')}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Plazo de Entrega</div>
          <div class="info-value">A consultar</div>
        </div>
        <div class="info-row">
          <div class="info-label">Precio</div>
          <div class="info-value">NETO</div>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Referencia</th>
          <th>Descripción</th>
          <th class="text-center" style="width: 60px;">Cantidad</th>
          <th class="text-right" style="width: 70px;">Neto</th>
          <th class="text-right" style="width: 80px;">Neto Total</th>
        </tr>
      </thead>
      <tbody>
        ${items?.map(item => `
          <tr>
            <td>${escapeHtml(item.product?.referencia || '-')}</td>
            <td>${escapeHtml(item.description || item.product?.descripcion || '-')}</td>
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

    <div class="footer">
      <p>Página 1 de 1</p>
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      console.log('Documento cargado. Usa el botón para guardar como PDF o Ctrl+P');
    });
  </script>
</body>
</html>`

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'inline',
      },
    })
  } catch (error) {
    console.error('Error generating offer HTML:', error)
    return new Response('Error al generar la oferta', { status: 500 })
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
