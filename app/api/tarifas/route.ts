import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: tarifas, error } = await supabase
      .from('tarifas')
      .select('id_tarifa, nombre, fecha_inicio, fecha_fin')
      .order('nombre', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(tarifas || [])
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[v0] Error fetching tarifas:', errorMessage)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
