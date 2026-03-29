'use client'

import React from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet } from 'lucide-react'

interface ExportItemsExcelButtonProps {
  items: any[]
  offerNumber?: number | string
  customerName?: string
  disabled?: boolean
}

export function ExportItemsExcelButton({ 
  items, 
  offerNumber, 
  customerName, 
  disabled 
}: ExportItemsExcelButtonProps) {
  
  const handleExport = () => {
    if (!items || items.length === 0) return

    // Prepare data for Excel
    const data = items.map((item) => {
      // Header/Summary rows
      if (item.type === 'header' || item.type === 'summary') {
        return {
          'Referencia': '',
          'Descripción': (item.description || item.product?.descripcion || '').toUpperCase(),
          'Cantidad': null,
          'PVP Unit.': null,
          'Desc %': null,
          'Total Neto': null,
        }
      }

      const pvp = Number(item.pvp_unit || 0)
      const qty = Number(item.quantity || 1)
      const descuento = Number(item.discount || 0)
      const netoTotal = Number(item.neto_total2 || 0)

      return {
        'Referencia': item.product?.referencia || item.external_ref || '',
        'Descripción': item.description || item.product?.descripcion || '',
        'Cantidad': qty,
        'PVP Unit.': pvp,
        'Desc %': descuento,
        'Total Neto': netoTotal,
      }
    })

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data)
    
    // Set column widths
    const maxWidths = [
      { wch: 20 }, // Referencia
      { wch: 60 }, // Descripción
      { wch: 10 }, // Cantidad
      { wch: 12 }, // PVP Unit.
      { wch: 10 }, // Desc %
      { wch: 15 }, // Total Neto
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
