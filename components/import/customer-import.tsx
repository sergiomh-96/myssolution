'use client'

import * as XLSX from 'xlsx'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ParsedRow { [key: string]: string }

interface ImportResult {
  inserted: number
  updated: number
  errors?: string[]
  notFound?: string[]
}

// ── Sub-component: shared drop zone + preview ──────────────────────────────
function FileDropZone({
  file, rows, headers, error, dragging, inputRef,
  onDrop, onDragOver, onDragLeave, onFileChange, onReset,
  requiredCols,
}: {
  file: File | null
  rows: ParsedRow[]
  headers: string[]
  error: string | null
  dragging: boolean
  inputRef: React.RefObject<HTMLInputElement>
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onReset: () => void
  requiredCols: string[]
}) {
  const missingCols = requiredCols.filter(c => !headers.map(h => h.toLowerCase()).includes(c))

  return (
    <div className="space-y-3">
      {!file && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
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
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
        </div>
      )}

      {file && rows.length > 0 && (
        <>
          <div className="flex items-center justify-between border rounded-lg px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{rows.length} filas detectadas</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onReset}><X className="h-4 w-4" /></Button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Columnas detectadas</p>
            <div className="flex flex-wrap gap-1.5">
              {headers.map(h => (
                <Badge
                  key={h}
                  variant={requiredCols.includes(h.toLowerCase()) ? 'default' : 'secondary'}
                  className="text-xs font-mono"
                >
                  {h}
                </Badge>
              ))}
            </div>
          </div>

          {missingCols.length > 0 && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-md px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Faltan columnas obligatorias: {missingCols.map(c => <strong key={c} className="mx-0.5">{c}</strong>)}
            </div>
          )}

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
                      <td key={h} className="px-3 py-1.5 truncate max-w-[140px]">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 5 && (
            <p className="text-xs text-muted-foreground text-right">Mostrando 5 de {rows.length} filas</p>
          )}
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 text-destructive bg-destructive/10 rounded-md px-4 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  )
}

// ── Customers import ───────────────────────────────────────────────────────
function CustomersImport() {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function parseFile(f: File) {
    setError(null); setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json: ParsedRow[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
        if (!json.length) { setError('El archivo está vacío'); return }
        setHeaders(Object.keys(json[0]))
        setRows(json)
        setFile(f)
      } catch { setError('No se pudo leer el archivo. Usa .xlsx o .csv') }
    }
    reader.readAsBinaryString(f)
  }

  function reset() {
    setFile(null); setRows([]); setHeaders([])
    setResult(null); setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleImport() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/import/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error desconocido')
      setResult({ inserted: data.inserted, updated: data.updated, errors: data.errors })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error importando')
    } finally { setLoading(false) }
  }

  function downloadTemplate() {
    const template = [{
      company_name: 'Empresa S.L.',
      contact_name: 'Juan García',
      contact_email: 'juan@empresa.com',
      contact_phone: '600123456',
      address: 'Calle Mayor 1',
      ciudad: 'Madrid',
      provincia: 'Madrid',
      codigo_postal: '28001',
      pais: 'España',
      nif: 'B12345678',
      industry: 'Construcción',
      website: 'https://empresa.com',
      forma_pago: '30 días',
      status: 'active',
      notas_cliente: '',
      descuento_agfri: '0',
      descuento_difusion: '0',
      descuento_sistemas: '0',
    }]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, 'plantilla_clientes.xlsx')
  }

  const requiredCols = ['company_name']
  const hasRequired = headers.map(h => h.toLowerCase()).includes('company_name')

  return (
    <div className="space-y-4">
      <FileDropZone
        file={file} rows={rows} headers={headers} error={error} dragging={dragging}
        inputRef={inputRef}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f) }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onFileChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f) }}
        onReset={reset}
        requiredCols={requiredCols}
      />

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">
              {result.inserted} clientes nuevos creados · {result.updated} actualizados.
            </span>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-md px-4 py-2 space-y-0.5">
              <p className="font-medium">Errores ({result.errors.length}):</p>
              {result.errors.slice(0, 5).map((e, i) => <p key={i}>{e}</p>)}
              {result.errors.length > 5 && <p>...y {result.errors.length - 5} más</p>}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Descargar plantilla
        </Button>
        {file && hasRequired && !result && (
          <Button onClick={handleImport} disabled={loading}>
            <Upload className="h-4 w-4 mr-2" />
            {loading ? 'Importando...' : `Importar ${rows.length} clientes`}
          </Button>
        )}
        {result && <Button variant="outline" onClick={reset}>Importar otro archivo</Button>}
      </div>
    </div>
  )
}

// ── Profile assignments import ─────────────────────────────────────────────
function AssignmentsImport() {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function parseFile(f: File) {
    setError(null); setResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json: ParsedRow[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
        if (!json.length) { setError('El archivo está vacío'); return }
        setHeaders(Object.keys(json[0]))
        setRows(json)
        setFile(f)
      } catch { setError('No se pudo leer el archivo. Usa .xlsx o .csv') }
    }
    reader.readAsBinaryString(f)
  }

  function reset() {
    setFile(null); setRows([]); setHeaders([])
    setResult(null); setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleImport() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/import/customer-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error desconocido')
      setResult({ inserted: data.inserted, updated: 0, notFound: data.notFound, errors: data.errors })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error importando')
    } finally { setLoading(false) }
  }

  function downloadTemplate() {
    const template = [
      { company_name: 'Empresa S.L.', email: 'agente@empresa.com' },
      { company_name: 'Cliente ABC', email: 'vendedor@agfri.com' },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Asignaciones')
    XLSX.writeFile(wb, 'plantilla_asignaciones.xlsx')
  }

  const requiredCols = ['company_name', 'email']
  const hasRequired = requiredCols.every(c => headers.map(h => h.toLowerCase()).includes(c))

  return (
    <div className="space-y-4">
      <FileDropZone
        file={file} rows={rows} headers={headers} error={error} dragging={dragging}
        inputRef={inputRef}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f) }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onFileChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f) }}
        onReset={reset}
        requiredCols={requiredCols}
      />

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{result.inserted} asignaciones creadas correctamente.</span>
          </div>
          {result.notFound && result.notFound.length > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-4 py-2 space-y-0.5">
              <p className="font-medium">No encontrados ({result.notFound.length}):</p>
              {result.notFound.slice(0, 8).map((e, i) => <p key={i}>{e}</p>)}
              {result.notFound.length > 8 && <p>...y {result.notFound.length - 8} más</p>}
            </div>
          )}
          {result.errors && result.errors.length > 0 && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-md px-4 py-2 space-y-0.5">
              <p className="font-medium">Errores ({result.errors.length}):</p>
              {result.errors.slice(0, 5).map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Descargar plantilla
        </Button>
        {file && hasRequired && !result && (
          <Button onClick={handleImport} disabled={loading}>
            <Upload className="h-4 w-4 mr-2" />
            {loading ? 'Importando...' : `Importar ${rows.length} asignaciones`}
          </Button>
        )}
        {result && <Button variant="outline" onClick={reset}>Importar otro archivo</Button>}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────
export function CustomerImport() {
  return (
    <Tabs defaultValue="clientes">
      <TabsList className="mb-4">
        <TabsTrigger value="clientes">Importar Clientes</TabsTrigger>
        <TabsTrigger value="asignaciones">Asignar Perfiles</TabsTrigger>
      </TabsList>
      <TabsContent value="clientes">
        <CustomersImport />
      </TabsContent>
      <TabsContent value="asignaciones">
        <AssignmentsImport />
      </TabsContent>
    </Tabs>
  )
}
