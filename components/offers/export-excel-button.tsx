'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface ExportExcelButtonProps {
  offers: Array<{
    id: string
    title: string
    offer_number: number
    created_at: string
    status: string
    customer?: { company_name: string }
    pvp_total?: number
    neto_total?: number
    created_by_profile?: { full_name: string; email: string }
  }>
}

export function ExportExcelButton({ offers }: ExportExcelButtonProps) {
  const handleExport = () => {
    if (!offers || offers.length === 0) {
      alert('No hay ofertas para exportar')
      return
    }

    // Prepare data for Excel
    const data = offers.map((offer) => ({
      'Nº Oferta': `${offer.offer_number}/${new Date(offer.created_at).getFullYear()}`,
      'Título': offer.title,
      'Cliente': offer.customer?.company_name || 'Desconocido',
      'PVP Total': offer.pvp_total || 0,
      'Neto Total': offer.neto_total || 0,
      'Estado': offer.status,
      'Creado por': offer.created_by_profile?.full_name || 'Desconocido',
      'Email': offer.created_by_profile?.email || '',
      'Fecha': new Date(offer.created_at).toLocaleDateString('es-ES'),
    }))

    // Convert to CSV
    const headers = Object.keys(data[0])
    const csv = [
      headers.join(','),
      ...data.map(row =>
        headers
          .map(header => {
            const value = row[header as keyof typeof row]
            // Escape quotes and wrap in quotes if contains comma
            const stringValue = String(value || '')
            return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue
          })
          .join(',')
      ),
    ].join('\n')

    // Create blob and download
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `ofertas_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      title="Exportar ofertas a Excel"
    >
      <Download className="w-4 h-4 mr-2" />
      Exportar Excel
    </Button>
  )
}
