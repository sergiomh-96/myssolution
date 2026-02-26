import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'PDF generation not available' }, { status: 501 })
}
