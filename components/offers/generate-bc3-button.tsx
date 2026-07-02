'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileCode2, Loader2, ChevronDown, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface GenerateBc3ButtonProps {
  offerId: string
  offerNumber: number
  customerName?: string
  disabled?: boolean
  className?: string
}

export function GenerateBc3Button({
  offerId,
  offerNumber,
  customerName = '',
  disabled = false,
  className
}: GenerateBc3ButtonProps) {
  const [loading, setLoading] = useState(false)

  const safeClient = customerName
    ? customerName.replace(/[^\w\s\-ñáéíóúÑÁÉÍÓÚ]/g, '').trim().replace(/\s+/g, '_')
    : 'Cliente'

  const handleExport = async (format: 'bc3' | 'xlsx' | 'xls') => {
    setLoading(true)
    try {
      const endpoint = format === 'bc3'
        ? `/api/offers/${offerId}/bc3`
        : `/api/offers/${offerId}/excel-presto?format=${format}`

      const ext      = format === 'bc3' ? '.bc3' : format === 'xls' ? '.xls' : '.xlsx'
      const mime     = format === 'bc3'
        ? 'text/plain'
        : format === 'xls'
          ? 'application/vnd.ms-excel'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      const label    = format === 'bc3' ? 'BC3' : format === 'xls' ? 'Excel XLS' : 'Excel XLSX'
      const filename = `OFERTA_${offerNumber}_${safeClient}${ext}`

      const response = await fetch(endpoint)
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Error generando el archivo ${label}`)
      }

      const blob = await response.blob()

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{ description: `Archivo ${label}`, accept: { [mime]: [ext] } }],
          })
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
          toast.success(`Archivo ${label} guardado correctamente`)
        } catch (err: any) {
          if (err.name !== 'AbortError') saveAsFallback(blob, filename, label)
        }
      } else {
        saveAsFallback(blob, filename, label)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error generando el archivo')
    } finally {
      setLoading(false)
    }
  }

  const saveAsFallback = (blob: Blob, filename: string, label: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 500)
    toast.success(`Archivo ${label} generado correctamente`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={loading || disabled}
          className={className || 'h-8 text-xs'}
          title="Exportar oferta en formato BC3"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
          ) : (
            <FileCode2 className="h-3 w-3 mr-1.5 text-green-600" />
          )}
          {loading ? 'Generando...' : 'Exportar BC3'}
          <ChevronDown className="h-3 w-3 ml-1.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={() => handleExport('bc3')} disabled={loading}>
          <FileCode2 className="h-3.5 w-3.5 mr-2 text-green-600" />
          Exportar como .bc3
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('xlsx')} disabled={loading}>
          <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-emerald-600" />
          Exportar como .xlsx
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('xls')} disabled={loading}>
          <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-emerald-600" />
          Exportar como .xls
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
