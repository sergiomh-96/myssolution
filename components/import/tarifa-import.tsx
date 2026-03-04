'use client'

import * as XLSX from 'xlsx'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ParsedRow { [key: string]: string }

interface Tarifa {
  id_tarifa: bigint
  nombre: string
  fecha_inicio: string | null
  fecha_fin: string | null
}

interface ImportResult {
  tarifaId: number
  inserted: number
  updated: number
  notFound: string[]
}

export function TarifaImport() {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [tarifas, setTarifas] = useState<Tarifa[]>([])
  const [selectedTarifaId, setSelectedTarifaId] = useState<string>('')
  const [tarifaNombre, setTarifaNombre] = useState('')
  const [createNewTarifa, setCreateNewTarifa] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load existing tarifas on mount
  useEffect(() => {
    const fetchTarifas = async () => {
      try {
        const res = await fetch('/api/tarifas')
        if (res.ok) {
          const data = await res.json()
          setTarifas(data)
        }
      } catch (err) {
        console.error('[v0] Error loading tarifas:', err)
      }
    }
    fetchTarifas()
  }, [])

  function parseFile(f: File) {
    setError(null); setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const wb = XLSX.read(data, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json: ParsedRow[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
        if (json.length === 0) { setError('El archivo está vacío'); return }
        setHeaders(Object.keys(json[0]))
        setRows(json)
        setFile(f)
      } catch {
        setError('No se pudo leer el archivo. Usa formato .xlsx o .csv')
      }
    }
    reader.readAsBinaryString(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) parseFile(f)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) parseFile(f)
  }

  function reset() {
    setFile(null); setRows([]); setHeaders([])
    setResult(null); setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleImport() {
    if (!rows.length) return
    
    // Determine which tarifa to use
    let tarifaToSubmit = ''
    if (createNewTarifa) {
      if (!tarifaNombre.trim()) {
        setError('Introduce el nombre de la nueva tarifa')
        return
      }
      tarifaToSubmit = tarifaNombre.trim()
    } else {
      if (!selectedTarifaId) {
        setError('Selecciona una tarifa')
        return
      }
      const tarifa = tarifas.find(t => t.id_tarifa.toString() === selectedTarifaId)
      if (!tarifa) {
        setError('Tarifa no válida')
        return
      }
      tarifaToSubmit = tarifa.nombre
    }

    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/import/tarifas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tarifaNombre: tarifaToSubmit,
          rows,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error desconocido')
      setResult({ tarifaId: data.tarifaId, inserted: data.inserted, updated: data.updated, notFound: data.notFound ?? [] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error importando')
    } finally {
      setLoading(false)
    }
  }

  function downloadTemplate() {
    const template = [
      { referencia: 'REF-001', precio: '125.50' },
      { referencia: 'REF-002', precio: '87.00' },
      { referencia: 'REF-003', precio: '310.75' },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tarifa')
    XLSX.writeFile(wb, 'plantilla_tarifa.xlsx')
  }

  const hasRequired = headers.some(h => h.toLowerCase() === 'referencia') &&
    headers.some(h => h.toLowerCase() === 'precio')
  const canImport = hasRequired && (selectedTarifaId || (createNewTarifa && tarifaNombre.trim().length > 0)) && !result

  return (
    <div className="space-y-4">
      {/* Tarifa selector */}
      <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Seleccionar tarifa <span className="text-destructive">*</span></Label>
          <Select value={selectedTarifaId} onValueChange={(v) => { setSelectedTarifaId(v); setCreateNewTarifa(false) }} disabled={createNewTarifa}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Elige una tarifa existente..." />
            </SelectTrigger>
            <SelectContent>
              {tarifas.map(t => (
                <SelectItem key={t.id_tarifa.toString()} value={t.id_tarifa.toString()}>
                  {t.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-muted/20 text-muted-foreground">o</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="create-new"
              checked={createNewTarifa}
              onChange={(e) => { setCreateNewTarifa(e.target.checked); if (e.target.checked) setSelectedTarifaId('') }}
              className="w-4 h-4 rounded border-input"
            />
            <Label htmlFor="create-new" className="text-xs font-medium cursor-pointer">Crear nueva tarifa</Label>
          </div>
          {createNewTarifa && (
            <Input
              placeholder="Nombre de la nueva tarifa (ej: TARIFA 2025)"
              value={tarifaNombre}
              onChange={e => setTarifaNombre(e.target.value)}
              className="text-sm"
            />
          )}
        </div>
      </div>

      {/* Drop zone */}
      {!file && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/30'
          )}
        >
          <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium text-sm">Arrastra el archivo de precios aquí</p>
            <p className="text-xs text-muted-foreground mt-1">Formatos: .xlsx, .xls, .csv — Máx 50.000 artículos</p>
            <p className="text-xs text-muted-foreground">Columnas requeridas: <strong>referencia</strong>, <strong>precio</strong></p>
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {/* File preview */}
      {file && rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border rounded-lg px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{rows.length} precios detectados</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={reset}><X className="h-4 w-4" /></Button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Columnas detectadas</p>
            <div className="flex flex-wrap gap-1.5">
              {headers.map(h => (
                <Badge
                  key={h}
                  variant={['referencia', 'precio'].includes(h.toLowerCase()) ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {h}
                </Badge>
              ))}
            </div>
          </div>

          {!hasRequired && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Faltan columnas: <strong>referencia</strong> y <strong>precio</strong>
            </div>
          )}

          <div className="border rounded-lg overflow-auto max-h-48">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  {headers.map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t">
                    {headers.map(h => (
                      <td key={h} className="px-3 py-1.5 truncate max-w-[150px]">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 5 && (
            <p className="text-xs text-muted-foreground text-right">Mostrando 5 de {rows.length} filas</p>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">
              {result.inserted + result.updated} precios importados/actualizados en la tarifa (ID: {result.tarifaId}).
            </span>
          </div>
          {result.notFound.length > 0 && (
            <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="text-sm">
                <strong>{result.notFound.length} referencias no encontradas:</strong>
                <span className="ml-1 font-mono text-xs">{result.notFound.slice(0, 20).join(', ')}{result.notFound.length > 20 ? '...' : ''}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-destructive bg-destructive/10 rounded-md px-4 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Descargar plantilla
        </Button>
        {file && canImport && (
          <Button onClick={handleImport} disabled={loading}>
            <Upload className="h-4 w-4 mr-2" />
            {loading ? 'Importando...' : `Importar ${rows.length} precios`}
          </Button>
        )}
        {!canImport && file && (
          <p className="text-xs text-muted-foreground">Selecciona o crea una tarifa para continuar</p>
        )}
        {result && (
          <Button variant="outline" onClick={reset}>Importar otra tarifa</Button>
        )}
      </div>
    </div>
  )
}

