'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileCode2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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

  const handleGenerateBc3 = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/offers/${offerId}/bc3`)

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Error generando el archivo Presto')
      }

      const blob = await response.blob()
      
      const safeClient = customerName 
        ? customerName.replace(/[^\w\s\-ñáéíóúÑÁÉÍÓÚ]/g, '').trim().replace(/\s+/g, '_') 
        : 'Cliente'
      const filename = `OFERTA_${offerNumber}_${safeClient}.bc3`
      
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'Archivo Presto BC3',
              accept: { 'text/plain': ['.bc3'] },
            }],
          })
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
          toast.success('Archivo Presto (.bc3) guardado correctamente')
        } catch (err: any) {
          if (err.name !== 'AbortError') saveAsFallback(blob, filename)
        }
      } else {
        saveAsFallback(blob, filename)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error generando el archivo Presto')
    } finally {
      setLoading(false)
    }
  }

  const saveAsFallback = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 500)
    toast.success('Archivo Presto (.bc3) generado correctamente')
  }

  return (
    <Button
      variant="outline"
      disabled={loading || disabled}
      onClick={handleGenerateBc3}
      className={className || "h-8 text-xs"}
      title="Descargar oferta en formato Presto (.bc3)"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
      ) : (
        <FileCode2 className="h-3 w-3 mr-2 text-green-600" />
      )}
      {loading ? 'Generando...' : 'Exportar BC3'}
    </Button>
  )
}
