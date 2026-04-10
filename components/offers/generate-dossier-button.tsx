'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileStack, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface GenerateDossierButtonProps {
  offerId: string
  offerNumber: number
  customerName?: string
  offerTitle?: string
  disabled?: boolean
}

type Company = 'mysair' | 'agfri'
type PriceType = 'pvp' | 'neto' | 'all'
type DossierType = 'sistemas' | 'difusion'

const CERT_OPTIONS = [
  { label: 'Certificado Difusión (no motorizada)', url: 'https://drive.google.com/open?id=1wOG32ieG-SLb9sJjg31NZgwFis1nzn2l' },
  { label: 'Certificado Sistemas', url: 'https://drive.google.com/open?id=1qbMf8fZtNCTY2f2hJeLUDiSSuKr6auhI' },
  { label: 'Certificado Recuperador Doble Flujo', url: 'https://drive.google.com/open?id=1KbvGX7zjEY6Rkt_IHAdl16q1lviwjVdl' },
]

const SCHEMAS_OPTIONS = [
  { label: 'SISTEMA ZONIFICADO PARA EQUIPOS DX (1 U.I.)', url: 'https://drive.google.com/open?id=1JsuggzHVfjhzvTcnnmuVHJkdOCvSdZUw' },
  { label: 'SISTEMA ZONIFICADO PARA EQUIPOS DX (2 U.I.)', url: 'https://drive.google.com/open?id=1Mj4yBr9hIBPSmdA9RhdNTYWHSJTMbMRr' },
  { label: 'SISTEMA EQUIPO POR ESTANCIA (HASTA 14 U.I.)', url: 'https://drive.google.com/open?id=1-CBM1q4fBpIY8Wx55yrvIYMDewjUMhph' },
  { label: 'SISTEMA ZONIFICADO MEDIANTE PLENUM MOTORIZADO (AIRKIT)', url: 'https://drive.google.com/open?id=1WyVb22ulfjQp7OAmAtfVWiPb5SdRD-Bj' },
  { label: 'SISTEMA ZONIFICADO PARA EQUIPOS DX (1 U.I) Y ELEMENTOS RAD/REF.', url: 'https://drive.google.com/open?id=1zZHFgvsMhaLgQhQA3JKTzqtMTTYAvkYF' },
  { label: 'SISTEMA ZONIFICADO PARA EQUIPOS DX (2 U.I) Y ELEMENTOS RAD/REF.', url: 'https://drive.google.com/open?id=1d8KCMHPZa0fLdQRKNcWAXV4x_M5qoUb8' },
  { label: 'SISTEMA POR ESTANCIA PARA EQUIPOS DX (HASTA 14 U.I) Y ELEMENTOS RAD/REF.', url: 'https://drive.google.com/open?id=1-NdjL1gRrsQR8V23av7sJVlQcbAFI74D' },
  { label: 'SISTEMA ZONIFICADO PARA EQUIPOS FANCOIL (1 U.I) Y ELEMENTOS RAD/REF.', url: 'https://drive.google.com/open?id=1RiAFO7nyTHJaWZd4gyqH4-Y1dmuWG-mc' },
  { label: 'SISTEMA ZONIFICADO PARA EQUIPOS FANCOIL (2 U.I) Y ELEMENTOS RAD/REF.', url: 'https://drive.google.com/open?id=1mt-3hIJC-NGcI1tB-UIE6UDUAOgfixek' },
  { label: 'SISTEMA ZONIFICADO DE ELEMENTOS RADIANTES/REFRESCANTE (HASTA 7 ZONAS)', url: 'https://drive.google.com/open?id=1cJcT7xYYLC3F-5L6Bzsi6H5mrNBx54kG' },
  { label: 'SISTEMA ZONIFICADO DE ELEMENTOS RADIANTES/REFRESCANTE (HASTA 14 ZONAS)', url: 'https://drive.google.com/open?id=1DvkcmUTYXDKgs6FVjv1BEA0CALRkJjC0' },
]

export function GenerateDossierButton({ offerId, offerNumber, customerName = '', offerTitle = '', disabled = false }: GenerateDossierButtonProps) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  
  const [company, setCompany] = useState<Company>('mysair')
  const [priceType, setPriceType] = useState<PriceType>('pvp')
  const [dossierType, setDossierType] = useState<DossierType>('sistemas')
  const [includeFT, setIncludeFT] = useState(true) 
  const [includeCert, setIncludeCert] = useState(false)
  const [includeES, setIncludeES] = useState(false)
  const [includeGarantia, setIncludeGarantia] = useState(true)
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>([])
  const [selectedCerts, setSelectedCerts] = useState<string[]>([])

  const handleToggleSchema = (url: string) => {
    setSelectedSchemas(prev => 
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    )
  }

  const handleToggleCert = (url: string) => {
    setSelectedCerts(prev => 
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    )
  }

  const handleGenerateDossier = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        company,
        priceType,
        dossierType,
        includeFT: String(includeFT),
        includeCert: String(includeCert),
        includeES: String(includeES),
        includeGarantia: String(includeGarantia),
        selectedSchemas: JSON.stringify(selectedSchemas),
        selectedCerts: JSON.stringify(selectedCerts),
      })

      const response = await fetch(`/api/offers/${offerId}/pdf?${params.toString()}`)
// ... (rest of logic unchanged)
// ... (rest of function unchanged, just showing context)
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Error generando el Dossier')
      }

      const blob = await response.blob()
      
      const year = new Date().getFullYear()
      const offerNum = String(offerNumber).padStart(4, '0')
      const client = customerName 
        ? customerName.replace(/[^\w\s\-ñáéíóúÑÁÉÍÓÚ]/g, '').trim().replace(/\s+/g, '-') 
        : 'Cliente'
      const title = offerTitle 
        ? offerTitle.replace(/[^\w\s\-ñáéíóúÑÁÉÍÓÚ]/g, '').trim().replace(/\s+/g, '-') 
        : 'Oferta'
      const type = priceType === 'neto' ? 'Neto' : priceType === 'all' ? 'Completo' : 'PVP'
      const dType = dossierType === 'sistemas' ? 'Sist' : 'Dif'
      const filename = `${year}-${offerNum}-${client}-${title}-${type}-Dossier-${dType}.pdf`
      
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'Archivo PDF',
              accept: { 'application/pdf': ['.pdf'] },
            }],
          })
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
          toast.success('Dossier guardado correctamente')
          setOpen(false)
        } catch (err: any) {
          if (err.name !== 'AbortError') saveAsFallback(blob, filename)
        }
      } else {
        saveAsFallback(blob, filename)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error generando el Dossier')
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
    toast.success('Dossier generado correctamente')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={loading || disabled}
          className="h-8 text-xs border-primary/50 hover:bg-primary/5 text-primary font-bold"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
          ) : (
            <FileStack className="h-3 w-3 mr-2" />
          )}
          {loading ? 'Generando...' : 'Generar Dossier'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generar Dossier de Oferta</DialogTitle>
          <DialogDescription>
            Crea un documento único que incluye la oferta y documentación técnica.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Empresa</Label>
              <Select value={company} onValueChange={(v) => setCompany(v as Company)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mysair">MYSAIR</SelectItem>
                  <SelectItem value="agfri">AGFRI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tipo de Precio</Label>
              <Select value={priceType} onValueChange={(v) => setPriceType(v as PriceType)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pvp">PVP</SelectItem>
                  <SelectItem value="neto">Neto</SelectItem>
                  <SelectItem value="all">Completo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Tipo de Dossier (Portada)</Label>
            <Select value={dossierType} onValueChange={(v) => setDossierType(v as DossierType)}>
              <SelectTrigger className="h-9 font-semibold text-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sistemas">Dossier Sistemas</SelectItem>
                <SelectItem value="difusion">Dossier Difusión</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Documentación a Incluir
            </Label>
            
            <div className="grid gap-3 p-4 border rounded-xl bg-muted/30">
              <div className="flex items-start gap-3">
                <Checkbox id="d-ft" checked={includeFT} onCheckedChange={(v) => setIncludeFT(!!v)} />
                <Label htmlFor="d-ft" className="text-sm cursor-pointer">Fichas Técnicas</Label>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="d-ce" 
                    checked={includeCert} 
                    onCheckedChange={(checked) => {
                      setIncludeCert(checked === true)
                      if (!checked) setSelectedCerts([])
                    }} 
                  />
                  <Label htmlFor="d-ce" className="text-sm cursor-pointer font-medium">Certificados de Conformidad</Label>
                </div>
                
                {includeCert && (
                  <div className="ml-7 space-y-2 max-h-[140px] overflow-y-auto border rounded-lg p-2 bg-white">
                    {CERT_OPTIONS.map((opt) => (
                      <div key={opt.url} className="flex items-start gap-2 py-1">
                        <Checkbox 
                          id={opt.url} 
                          checked={selectedCerts.includes(opt.url)}
                          onCheckedChange={() => handleToggleCert(opt.url)}
                          className="mt-0.5"
                        />
                        <Label 
                          htmlFor={opt.url} 
                          className="text-[10px] leading-tight cursor-pointer font-normal text-muted-foreground hover:text-foreground"
                        >
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="d-es" 
                    checked={includeES} 
                    onCheckedChange={(checked) => {
                      setIncludeES(checked === true)
                      if (!checked) setSelectedSchemas([])
                    }} 
                  />
                  <Label htmlFor="d-es" className="text-sm cursor-pointer font-medium">Esquemas Técnicos</Label>
                </div>
                
                {includeES && (
                  <div className="ml-7 space-y-2 max-h-[160px] overflow-y-auto border rounded-lg p-2 bg-white">
                    {SCHEMAS_OPTIONS.map((opt) => (
                      <div key={opt.url} className="flex items-start gap-2 py-1">
                        <Checkbox 
                          id={opt.url} 
                          checked={selectedSchemas.includes(opt.url)}
                          onCheckedChange={() => handleToggleSchema(opt.url)}
                          className="mt-0.5"
                        />
                        <Label 
                          htmlFor={opt.url} 
                          className="text-[10px] leading-tight cursor-pointer font-normal text-muted-foreground hover:text-foreground"
                        >
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="d-ga" checked={includeGarantia} onCheckedChange={(v) => setIncludeGarantia(!!v)} />
                <Label htmlFor="d-ga" className="text-sm cursor-pointer font-medium">Condiciones de Garantía</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button className="w-full" onClick={handleGenerateDossier} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileStack className="mr-2 h-4 w-4" />}
            Empezar Generación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
