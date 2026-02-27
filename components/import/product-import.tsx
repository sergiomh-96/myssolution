'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImportResult {
  success: boolean
  imported: number
  total: number
  error?: string
}

const REQUIRED_COLUMNS = ['referencia']
const OPTIONAL_COLUMNS = [
  'descripcion', 'familia', 'subfamilia', 'modelo_nombre', 'acabado',
  'fijacion', 'tipo_deflexion', 'compuerta', 'regulacion_compuerta',
  'texto_prescripcion', 'ficha_tecnica', 'ancho', 'alto', 'largo',
  'area_efectiva', 'volumen', 'larguero_alto', 'larguero_largo',
  'motorizada', 'art_personalizado', 'status',
]

export function ProductImport() {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const parseFile = (f: File) => {
    setParseError(null)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
        if (json.length === 0) { setParseError('El archivo está vacío o no tiene filas de datos.'); return }
        setHeaders(Object.keys(json[0]))
        setRows(json)
      } catch {
        setParseError('Error al leer el archivo. Asegúrate de que es un .xlsx o .xls válido.')
      }
    }
    reader.readAsArrayBuffer(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); parseFile(f) }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); parseFile(f) }
  }

  const handleImport = async () => {
    if (rows.length === 0) return
    setIsLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/import/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) setResult({ success: false, imported: 0, total: rows.length, error: data.error })
      else setResult({ success: true, imported: data.imported, total: data.total })
    } catch {
      setResult({ success: false, imported: 0, total: rows.length, error: 'Error de red al importar.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null); setRows([]); setHeaders([]); setResult(null); setParseError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS],
      ['REF-001', 'Rejilla de ventilación 400x200', 'Difusión', 'Rejillas', 'Modelo A', 'Blanco', 'Tornillo', 'Simple', '', '', '', '', 400, 200, null, null, null, null, null, false, false, 'active'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
    XLSX.writeFile(wb, 'plantilla_productos.xlsx')
  }

  const missingRequired = rows.length > 0
    ? REQUIRED_COLUMNS.filter(col => !headers.some(h => h.toLowerCase() === col.toLowerCase()))
    : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Descargar Plantilla
        </Button>
        {file && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <X className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Drop zone */}
      {!file && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40'
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground mb-1">Arrastra tu archivo Excel aquí</p>
          <p className="text-xs text-muted-foreground">o haz clic para seleccionar (.xlsx, .xls)</p>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {/* File loaded */}
      {file && !parseError && rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{rows.length} filas detectadas</p>
            </div>
          </div>

          {/* Column validation */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Columnas detectadas:</p>
            <div className="flex flex-wrap gap-1.5">
              {headers.map(h => (
                <Badge
                  key={h}
                  variant={REQUIRED_COLUMNS.includes(h.toLowerCase()) ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {h}
                </Badge>
              ))}
            </div>
            {missingRequired.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Columnas obligatorias faltantes: <strong>{missingRequired.join(', ')}</strong>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Preview */}
          <div className="text-xs text-muted-foreground">
            Vista previa: primera fila → {JSON.stringify(rows[0]).slice(0, 120)}...
          </div>

          <Button
            onClick={handleImport}
            disabled={isLoading || missingRequired.length > 0}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isLoading ? 'Importando...' : `Importar ${rows.length} artículos`}
          </Button>
        </div>
      )}

      {parseError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>
            {result.success
              ? `Importación completada: ${result.imported} de ${result.total} artículos procesados correctamente.`
              : `Error: ${result.error}`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
