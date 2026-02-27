'use client'

import * as XLSX from 'xlsx'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ParsedRow { [key: string]: string }

interface ImportResult {
  inserted: number
  errors?: string[]
}

export function ProductImport() {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function parseFile(f: File) {
    setError(null)
    setResult(null)
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
    e.preventDefault()
    setDragging(false)
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
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/import/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error desconocido')
      setResult({ inserted: data.inserted })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error importando')
    } finally {
      setLoading(false)
    }
  }

  function downloadTemplate() {
    const template = [
      {
        referencia: 'REF-001',
        descripcion: 'Descripción del artículo',
        familia: 'REJILLAS',
        subfamilia: 'LINEALES',
        modelo_nombre: 'Modelo A',
        acabado: 'Blanco RAL 9010',
        fijacion: 'Tornillo',
        compuerta: 'No',
        tipo_deflexion: 'Simple',
        regulacion_compuerta: 'Manual',
        ancho: '200',
        alto: '100',
        largo: '',
        area_efectiva: '0.018',
        volumen: '',
        larguero_alto: '',
        larguero_largo: '',
        motorizada: 'No',
        art_personalizado: 'No',
        status: 'active',
        texto_prescripcion: '',
        ficha_tecnica: '',
      }
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
    XLSX.writeFile(wb, 'plantilla_productos.xlsx')
  }

  const requiredCols = ['referencia', 'descripcion']
  const hasRequired = headers.some(h => h.toLowerCase() === 'referencia') &&
    headers.some(h => h.toLowerCase() === 'descripcion' || h.toLowerCase() === 'descripción')

  return (
    <div className="space-y-4">
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
            <p className="font-medium text-sm">Arrastra tu archivo Excel o CSV aquí</p>
            <p className="text-xs text-muted-foreground mt-1">Formatos: .xlsx, .xls, .csv</p>
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {/* File info + preview */}
      {file && rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border rounded-lg px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{rows.length} filas detectadas</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={reset}><X className="h-4 w-4" /></Button>
          </div>

          {/* Column validation */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Columnas detectadas</p>
            <div className="flex flex-wrap gap-1.5">
              {headers.map(h => (
                <Badge key={h} variant={requiredCols.includes(h.toLowerCase()) ? 'default' : 'secondary'} className="text-xs">
                  {h}
                </Badge>
              ))}
            </div>
          </div>

          {!hasRequired && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Faltan columnas obligatorias: <strong>referencia</strong>, <strong>descripcion</strong>
            </div>
          )}

          {/* Preview table */}
          <div className="border rounded-lg overflow-auto max-h-52">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  {headers.slice(0, 6).map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                  {headers.length > 6 && <th className="px-3 py-2 text-muted-foreground">+{headers.length - 6} más</th>}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t">
                    {headers.slice(0, 6).map(h => (
                      <td key={h} className="px-3 py-1.5 truncate max-w-[120px]">{row[h]}</td>
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
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{result.inserted} artículos importados/actualizados correctamente.</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 text-destructive bg-destructive/10 rounded-md px-4 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Descargar plantilla
        </Button>
        {file && hasRequired && !result && (
          <Button onClick={handleImport} disabled={loading}>
            <Upload className="h-4 w-4 mr-2" />
            {loading ? 'Importando...' : `Importar ${rows.length} artículos`}
          </Button>
        )}
        {result && (
          <Button variant="outline" onClick={reset}>Importar otro archivo</Button>
        )}
      </div>
    </div>
  )
}
