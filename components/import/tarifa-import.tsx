'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  total: number
  tarifaName?: string
  errors?: string[]
  error?: string
}

export function TarifaImport() {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [tarifaName, setTarifaName] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
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
    if (rows.length === 0 || !tarifaName.trim()) return
    setIsLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/import/tarifas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tarifaName: tarifaName.trim(), fechaInicio: fechaInicio || undefined, fechaFin: fechaFin || undefined, rows }),
      })
      const data = await res.json()
      if (!res.ok) setResult({ success: false, imported: 0, skipped: 0, total: rows.length, error: data.error })
      else setResult({ success: true, imported: data.imported, skipped: data.skipped, total: data.total, tarifaName: data.tarifaName, errors: data.errors })
    } catch {
      setResult({ success: false, imported: 0, skipped: 0, total: rows.length, error: 'Error de red al importar.' })
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
      ['referencia', 'precio'],
      ['REF-001', 125.50],
      ['REF-002', 89.00],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tarifa')
    XLSX.writeFile(wb, 'plantilla_tarifa.xlsx')
  }

  const hasRequiredCols = headers.some(h => ['referencia', 'Referencia'].includes(h)) &&
    headers.some(h => ['precio', 'Precio', 'pvp', 'PVP'].includes(h))

  return (
    <div className="space-y-4">
      {/* Tarifa metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="tarifa-name">Nombre de la tarifa <span className="text-destructive">*</span></Label>
          <Input
            id="tarifa-name"
            value={tarifaName}
            onChange={e => setTarifaName(e.target.value)}
            placeholder="Ej: Tarifa 2025"
          />
          <p className="text-xs text-muted-foreground">Si ya existe, se actualizará. Si no, se creará.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fecha-inicio">Fecha de inicio</Label>
          <Input id="fecha-inicio" type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fecha-fin">Fecha de fin</Label>
          <Input id="fecha-fin" type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
        </div>
      </div>

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
              <p className="text-xs text-muted-foreground">{rows.length} artículos detectados</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Columnas detectadas:</p>
            <div className="flex flex-wrap gap-1.5">
              {headers.map(h => (
                <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
              ))}
            </div>
            {!hasRequiredCols && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Se requieren las columnas <strong>referencia</strong> y <strong>precio</strong> (o pvp).
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Button
            onClick={handleImport}
            disabled={isLoading || !hasRequiredCols || !tarifaName.trim()}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isLoading ? 'Importando...' : `Importar ${rows.length} precios a "${tarifaName || '...'}"`}
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
        <div className="space-y-2">
          <Alert variant={result.success ? 'default' : 'destructive'}>
            {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>
              {result.success
                ? `Importación completada: ${result.imported} precios importados, ${result.skipped} omitidos de ${result.total} filas.`
                : `Error: ${result.error}`}
            </AlertDescription>
          </Alert>
          {result.errors && result.errors.length > 0 && (
            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="text-xs font-medium text-destructive">Filas con errores:</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-muted-foreground">{e}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
