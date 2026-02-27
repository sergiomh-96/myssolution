import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    await requireRole(['admin'])
    const supabase = await createClient()

    const body = await request.json()
    const { rows } = body as { rows: Record<string, string>[] }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No hay filas para importar' }, { status: 400 })
    }

    const products = rows.map((row) => ({
      referencia: (row['referencia'] ?? row['REFERENCIA'] ?? '').toString().trim(),
      descripcion: (row['descripcion'] ?? row['DESCRIPCION'] ?? row['descripción'] ?? '').toString().trim(),
      familia: (row['familia'] ?? row['FAMILIA'] ?? '').toString().trim() || null,
      subfamilia: (row['subfamilia'] ?? row['SUBFAMILIA'] ?? '').toString().trim() || null,
      modelo_nombre: (row['modelo_nombre'] ?? row['MODELO_NOMBRE'] ?? row['modelo'] ?? '').toString().trim() || null,
      acabado: (row['acabado'] ?? row['ACABADO'] ?? '').toString().trim() || null,
      fijacion: (row['fijacion'] ?? row['FIJACION'] ?? row['fijación'] ?? '').toString().trim() || null,
      compuerta: (row['compuerta'] ?? row['COMPUERTA'] ?? '').toString().trim() || null,
      tipo_deflexion: (row['tipo_deflexion'] ?? row['TIPO_DEFLEXION'] ?? '').toString().trim() || null,
      regulacion_compuerta: (row['regulacion_compuerta'] ?? row['REGULACION_COMPUERTA'] ?? '').toString().trim() || null,
      ancho: parseFloatOrNull(row['ancho'] ?? row['ANCHO']),
      alto: parseFloatOrNull(row['alto'] ?? row['ALTO']),
      largo: parseFloatOrNull(row['largo'] ?? row['LARGO']),
      area_efectiva: parseFloatOrNull(row['area_efectiva'] ?? row['AREA_EFECTIVA']),
      volumen: parseFloatOrNull(row['volumen'] ?? row['VOLUMEN']),
      larguero_alto: parseFloatOrNull(row['larguero_alto'] ?? row['LARGUERO_ALTO']),
      larguero_largo: parseFloatOrNull(row['larguero_largo'] ?? row['LARGUERO_LARGO']),
      motorizada: parseBool(row['motorizada'] ?? row['MOTORIZADA']),
      art_personalizado: parseBool(row['art_personalizado'] ?? row['ART_PERSONALIZADO']),
      status: (row['status'] ?? row['STATUS'] ?? 'active').toString().trim() || 'active',
      texto_prescripcion: (row['texto_prescripcion'] ?? row['TEXTO_PRESCRIPCION'] ?? '').toString().trim() || null,
      ficha_tecnica: (row['ficha_tecnica'] ?? row['FICHA_TECNICA'] ?? '').toString().trim() || null,
    })).filter(p => p.referencia.length > 0)

    if (products.length === 0) {
      return NextResponse.json({ error: 'Ninguna fila tiene referencia válida' }, { status: 400 })
    }

    // Upsert by referencia
    const { data, error } = await supabase
      .from('products')
      .upsert(products, { onConflict: 'referencia', ignoreDuplicates: false })
      .select('id')

    if (error) {
      console.error('[v0] Products import error:', error)
      return NextResponse.json({ error: `Error en base de datos: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, inserted: data?.length ?? 0 })
  } catch (err) {
    console.error('[v0] Products import unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

function parseFloatOrNull(val: string | undefined): number | null {
  if (!val) return null
  const n = parseFloat(val.toString().replace(',', '.'))
  return isNaN(n) ? null : n
}

function parseBool(val: string | undefined): boolean {
  if (!val) return false
  return ['true', '1', 'si', 'sí', 'yes', 'x'].includes(val.toString().toLowerCase().trim())
}
