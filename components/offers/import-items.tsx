'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Download, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ImportItemsProps {
  offerId: string
  onSuccess?: (count: number) => void
}

export function ImportItemsDialog({ offerId, onSuccess }: ImportItemsProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [preview, setPreview] = useState<any[] | null>(null)
  const [itemsToImport, setItemsToImport] = useState<any[] | null>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')

  const downloadTemplate = () => {
    const template = [
      {
        referencia: 'REF001',
        description: 'Descripción del artículo',
        quantity: 1,
        pvp: 100.00,
        pvp_total: 100.00,
        discount1: 0,
        discount2: 0,
        neto_total1: 100.00,
        neto_total2: 100.00,
      },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Items')
    XLSX.writeFile(wb, 'plantilla_articulos_oferta.xlsx')
  }

  const handleFileUpload = async (file: File) => {
    try {
      setMessage(null)
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)

      if (rows.length === 0) {
        setMessage({ type: 'error', text: 'El archivo está vacío' })
        return
      }

      setPreview(rows.slice(0, 5))
      setItemsToImport(rows)
      setStep('preview')
    } catch (error) {
      setMessage({ type: 'error', text: `Error procesando archivo: ${error instanceof Error ? error.message : 'Desconocido'}` })
    }
  }

  const handleConfirmImport = async () => {
    if (!itemsToImport) return
    await importItems(itemsToImport)
  }

  const handleClose = () => {
    setOpen(false)
    setStep('upload')
    setPreview(null)
    setItemsToImport(null)
    setMessage(null)
  }

  const importItems = async (items: any[]) => {
    setLoading(true)
    try {
      const response = await fetch('/api/import/offer-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, offerId }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage({
          type: 'error',
          text: `${result.error}${result.notFound?.length > 0 ? ` - No encontradas: ${result.notFound.slice(0, 5).join(', ')}` : ''}`,
        })
        return
      }

      setMessage({
        type: 'success',
        text: 'Artículos cargados correctamente',
      })
      
      setStep('done')
      setTimeout(() => {
        handleClose()
        onSuccess?.(result.inserted)
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs">
          <Upload className="w-3 h-3 mr-1" />
          Importar desde Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Artículos</DialogTitle>
          <DialogDescription>
            Carga un archivo Excel con los artículos que deseas añadir a la oferta
          </DialogDescription>
        </DialogHeader>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Artículos</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Carga un archivo Excel con los artículos que deseas añadir a la oferta'}
            {step === 'preview' && 'Revisa los artículos y confirma la importación'}
            {step === 'done' && 'Proceso completado'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <div className="flex items-center gap-2">
                {message.type === 'error' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <AlertDescription>{message.text}</AlertDescription>
              </div>
            </Alert>
          )}

          {step === 'upload' && (
            <>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla
                </Button>

                <div className="border-2 border-dashed border-input rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files[0]
                    if (file) handleFileUpload(file)
                  }}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                    disabled={loading}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium">Arrastra archivo aquí o haz clic</p>
                      <p className="text-xs">.xlsx, .xls, .csv</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="font-medium">Formato esperado:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><strong>referencia</strong>: código del artículo (obligatorio)</li>
                  <li><strong>description</strong>: descripción del artículo</li>
                  <li><strong>quantity</strong>: cantidad</li>
                  <li><strong>pvp</strong>: precio de venta al público</li>
                  <li><strong>pvp_total</strong>: PVP × Cantidad</li>
                  <li><strong>discount1, discount2</strong>: descuentos en %</li>
                  <li><strong>neto_total1, neto_total2</strong>: totales netos</li>
                </ul>
              </div>
            </>
          )}

          {step === 'preview' && preview && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium">Vista previa (primeros {preview.length} de {itemsToImport?.length}):</p>
                <div className="text-xs border border-input rounded overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        {Object.keys(preview[0] || {}).map((key) => (
                          <th key={key} className="px-2 py-1 text-left border-r">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-t">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-2 py-1 border-r text-xs">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('upload')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    'Aceptar e Importar'
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
              <p className="text-sm font-medium">Artículos cargados correctamente</p>
            </div>
          )}
        </div>
      </DialogContent>
      </DialogContent>
    </Dialog>
  )
}
