'use client'

import React from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet } from 'lucide-react'

interface ExportItemsExcelButtonProps {
  items: any[]
  products?: any[]
  offerNumber?: number | string
  customerName?: string
  disabled?: boolean
}

export function ExportItemsExcelButton({ 
  items, 
  products,
  offerNumber, 
  customerName, 
  disabled 
}: ExportItemsExcelButtonProps) {
  
  const handleExport = () => {
    if (!items || items.length === 0) return

    // Prepare data for Excel
    const data = items.map((item) => {
      // Header/Summary rows
      if (item.type === 'section_header' || item.type === 'note' || item.type === 'summary') {
        const typeLabel = item.type === 'section_header' ? 'TÍTULO' : (item.type === 'note' ? 'ANOTACIÓN' : 'RESUMEN')
        return {
          'Referencia': typeLabel,
          'Descripción': (item.description || '').toUpperCase(),
          'Cantidad': null,
          'PVP Unit.': null,
          'PVP Total': item.type === 'summary' ? item.pvp_total : null,
          'Desc 1 %': null,
          'Desc 2 %': null,
          'Neto Total 1': item.type === 'summary' ? item.neto_total1 : null,
          'Neto Total 2': item.type === 'summary' ? item.neto_total2 : null,
        }
      }

      const pvp = Number(item.pvp || 0)
      const pvpTotal = Number(item.pvp_total || 0)
      const qty = Number(item.quantity || 1)
      const descuento1 = Number(item.discount1 || 0)
      const descuento2 = Number(item.discount2 || 0)
      const netoTotal1 = Number(item.neto_total1 || 0)
      const netoTotal2 = Number(item.neto_total2 || 0)

      // Find product reference if we have the products catalog
      let reference = item.external_ref || item.custom_ref || ''
      if (!reference && item.product_id && products) {
        const product = products.find(p => String(p.id) === String(item.product_id))
        reference = product?.referencia || ''
      }

      return {
        'Referencia': reference,
        'Descripción': item.description || '',
        'Cantidad': qty,
        'PVP Unit.': pvp,
        'PVP Total': pvpTotal,
        'Desc 1 %': descuento1,
        'Desc 2 %': descuento2,
        'Neto Total 1': netoTotal1,
        'Neto Total 2': netoTotal2,
      }
    })

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data)
    
    // Set column widths
    const maxWidths = [
      { wch: 15 }, // Referencia
      { wch: 60 }, // Descripción
      { wch: 10 }, // Cantidad
      { wch: 12 }, // PVP Unit.
      { wch: 12 }, // PVP Total
      { wch: 10 }, // Desc 1 %
      { wch: 10 }, // Desc 2 %
      { wch: 15 }, // Neto Total 1
      { wch: 15 }, // Neto Total 2
    ]
    ws['!cols'] = maxWidths

    // Create workbook and append worksheet
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Partidas')

    // Filename: OFERTA_123_CLIENTE_FECHA.xlsx
    const dateStr = new Date().toISOString().split('T')[0]
    const safeCustomer = (customerName || 'Cliente').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_')
    const filename = `OFERTA_${offerNumber || 'NUEVA'}_${safeCustomer}_${dateStr}.xlsx`
    
    // Download
    XLSX.writeFile(wb, filename)
  }

  return (
    <Button 
      type="button" 
      variant="outline" 
      size="sm" 
      onClick={handleExport}
      disabled={disabled || items.length === 0}
      className="h-7 text-xs"
      title="Exportar partidas a Excel"
    >
      <FileSpreadsheet className="w-3 h-3 mr-1" />
      Exportar a Excel
    </Button>
  )
}
