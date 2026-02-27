import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    await requireRole(['admin'])
    const supabase = await createClient()

    const body = await request.json()
    const { rows } = body as { rows: Record<string, unknown>[] }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    // Map Excel rows to products table columns
    const products = rows.map((row) => ({
      referencia: String(row['referencia'] ?? row['Referencia'] ?? '').trim(),
      descripcion: String(row['descripcion'] ?? row['Descripcion'] ?? row['Descripción'] ?? '').trim(),
      familia: String(row['familia'] ?? row['Familia'] ?? '').trim() || null,
      subfamilia: String(row['subfamilia'] ?? row['Subfamilia'] ?? '').trim() || null,
      modelo_nombre: String(row['modelo_nombre'] ?? row['Modelo'] ?? row['modelo'] ?? '').trim() || null,
      acabado: String(row['acabado'] ?? row['Acabado'] ?? '').trim() || null,
      fijacion: String(row['fijacion'] ?? row['Fijacion'] ?? row['Fijación'] ?? '').trim() || null,
      tipo_deflexion: String(row['tipo_deflexion'] ?? row['Tipo_Deflexion'] ?? row['Deflexion'] ?? '').trim() || null,
      compuerta: String(row['compuerta'] ?? row['Compuerta'] ?? '').trim() || null,
      regulacion_compuerta: String(row['regulacion_compuerta'] ?? row['Regulacion_Compuerta'] ?? '').trim() || null,
      texto_prescripcion: String(row['texto_prescripcion'] ?? row['Prescripcion'] ?? row['texto_Prescripcion'] ?? '').trim() || null,
      ficha_tecnica: String(row['ficha_tecnica'] ?? row['Ficha_Tecnica'] ?? '').trim() || null,
      ancho: row['ancho'] != null ? Number(row['ancho'] ?? row['Ancho']) : null,
      alto: row['alto'] != null ? Number(row['alto'] ?? row['Alto']) : null,
      largo: row['largo'] != null ? Number(row['largo'] ?? row['Largo']) : null,
      area_efectiva: row['area_efectiva'] != null ? Number(row['area_efectiva'] ?? row['Area_Efectiva']) : null,
      volumen: row['volumen'] != null ? Number(row['volumen'] ?? row['Volumen']) : null,
      larguero_alto: row['larguero_alto'] != null ? Number(row['larguero_alto'] ?? row['Larguero_Alto']) : null,
      larguero_largo: row['larguero_largo'] != null ? Number(row['larguero_largo'] ?? row['Larguero_Largo']) : null,
      motorizada: String(row['motorizada'] ?? row['Motorizada'] ?? 'false').toLowerCase() === 'true' || String(row['motorizada'] ?? row['Motorizada'] ?? '0') === '1',
      art_personalizado: String(row['art_personalizado'] ?? row['Art_Personalizado'] ?? 'false').toLowerCase() === 'true' || String(row['art_personalizado'] ?? row['Art_Personalizado'] ?? '0') === '1',
      status: String(row['status'] ?? row['Status'] ?? 'active').trim(),
    })).filter(p => p.referencia) // referencia is required

    if (products.length === 0) {
      return NextResponse.json({ error: 'No valid products found. Ensure "referencia" column is present.' }, { status: 400 })
    }

    // Upsert by referencia to handle updates of existing products
    const { data, error } = await supabase
      .from('products')
      .upsert(products, { onConflict: 'referencia', ignoreDuplicates: false })
      .select('id, referencia')

    if (error) {
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imported: data?.length ?? products.length,
      total: products.length,
    })
  } catch (error) {
    return NextResponse.json({ error: `Server error: ${error instanceof Error ? error.message : 'Unknown'}` }, { status: 500 })
  }
}
