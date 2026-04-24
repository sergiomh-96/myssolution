'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Filter, RotateCcw, Check, ChevronsUpDown, RefreshCw, Copy, Trash2, Loader2, Forward } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import type { SupportAssistance, UserRole } from '@/lib/types/database'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface AssistanceTableProps {
  assistances: (SupportAssistance & {
    customer: { company_name: string } | null
    employee: { full_name: string | null } | null
    creator: { full_name: string | null } | null
    assignments?: { user_id: string }[] | null
  })[]
  userRole: UserRole
  userId: string
}

const statusColors: Record<string, string> = {
  'ABIERTA': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  'CERRADA': 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700',
}

const PROVINCIAS = [
  "Ávila", "Albacete", "Alicante/Alacant", "Almería", "Araba/Álava", "Asturias", "Badajoz", "Balears, Illes", "Barcelona", "Bizkaia", "Burgos", "Cáceres", "Cádiz", "Cantabria", "Castellón/Castelló", "Ceuta", "Ciudad Real", "Córdoba", "Coruña, A", "Cuenca", "Gipuzkoa", "Girona", "Granada", "Guadalajara", "Huelva", "Huesca", "Jaén", "León", "Lleida", "Lugo", "Madrid", "Málaga", "Melilla", "Murcia", "Navarra", "Ourense", "Palencia", "Palmas, Las", "Pontevedra", "Rioja, La", "Salamanca", "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia/València", "Valladolid", "Zamora", "Zaragoza"
].sort()

export function AssistanceTable({ assistances, userRole, userId }: AssistanceTableProps) {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const itemsPerPage = 50

  const [filters, setFilters] = useState({
    search: '',
    estado: 'all',
    provincias: [] as string[],
    tipo: 'all',
    startDate: '',
    endDate: '',
    creadoPor: 'all',
  })

  const resetFilters = () => {
    setFilters({
      search: '',
      estado: 'all',
      provincias: [],
      tipo: 'all',
      startDate: '',
      endDate: '',
      creadoPor: 'all',
    })
    setCurrentPage(1)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const toggleProvince = (province: string) => {
    setFilters(prev => {
      const current = prev.provincias
      const next = current.includes(province)
        ? current.filter(p => p !== province)
        : [...current, province]
      return { ...prev, provincias: next }
    })
    setCurrentPage(1)
  }

  const handleDuplicate = async (e: React.MouseEvent, assistance: any) => {
    e.stopPropagation()
    if (!confirm('¿Deseas duplicar esta incidencia?')) return

    setLoadingId(`dup-${assistance.id}`)
    try {
      const supabase = createClient()
      const { data: fullAssistance } = await supabase
        .from('support_assistances')
        .select('*, items:support_assistance_items(*)')
        .eq('id', assistance.id)
        .single()

      if (!fullAssistance) throw new Error('No se pudo cargar la incidencia')

      const { id, external_id, created_at, updated_at, items, ...rest } = fullAssistance
      const newAssistance = {
        ...rest,
        titulo: `${rest.titulo} (COPIA)`,
        created_by: userId,
        estado: 'ABIERTA',
        fecha: new Date().toISOString().split('T')[0]
      }

      const { data: created, error } = await supabase
        .from('support_assistances')
        .insert(newAssistance)
        .select()
        .single()

      if (error) throw error

      if (items && items.length > 0) {
        const newItems = items.map((it: any) => ({
          assistance_id: created.id,
          marca: it.marca,
          referencia: it.referencia,
          cantidad: it.cantidad,
          descripcion: it.descripcion,
          en_garantia: it.en_garantia,
          observacion: it.observacion
        }))
        await supabase.from('support_assistance_items').insert(newItems)
      }

      toast.success('Incidencia duplicada correctamente')
      router.refresh()
    } catch (err: any) {
      toast.error('Error al duplicar: ' + err.message)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('¿Estás seguro de que deseas eliminar esta incidencia? Esta acción no se puede deshacer.')) return

    setLoadingId(`del-${id}`)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('support_assistances')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Incidencia eliminada')
      router.refresh()
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message)
    } finally {
      setLoadingId(null)
    }
  }

  const filteredData = assistances.filter((item) => {
    const searchLower = filters.search.toLowerCase()
    const matchesSearch = !filters.search || 
      item.customer?.company_name.toLowerCase().includes(searchLower) ||
      item.contacto_nombre?.toLowerCase().includes(searchLower) ||
      item.contacto_telefono?.toLowerCase().includes(searchLower) ||
      item.external_id?.toLowerCase().includes(searchLower) ||
      item.titulo.toLowerCase().includes(searchLower)
      
    const matchesStatus = filters.estado === 'all' || item.estado === filters.estado
    const matchesTipo = filters.tipo === 'all' || item.tipo_incidencia === filters.tipo
    const matchesProvincia = filters.provincias.length === 0 || (item.provincia && filters.provincias.includes(item.provincia))

    let matchesDate = true
    if (filters.startDate || filters.endDate) {
      const itemDate = new Date(item.created_at)
      if (filters.startDate) {
        const start = new Date(filters.startDate)
        start.setHours(0, 0, 0, 0)
        if (itemDate < start) matchesDate = false
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate)
        end.setHours(23, 59, 59, 999)
        if (itemDate > end) matchesDate = false
      }
    }

    const matchesCreadoPor = filters.creadoPor === 'all' || item.creator?.full_name === filters.creadoPor

    return matchesSearch && matchesStatus && matchesTipo && matchesProvincia && matchesDate && matchesCreadoPor
  })

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const tipos = Array.from(new Set(assistances.map(a => a.tipo_incidencia).filter(Boolean)))
  const creators = Array.from(new Set(assistances.map(a => a.creator?.full_name).filter(Boolean))).sort() as string[]

  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-end gap-2 mb-6">
          <div className="space-y-1.5 w-full md:w-96">
            <label className="text-xs font-medium text-muted-foreground uppercase">Buscador global</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, título, cliente o teléfono..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5 w-full md:w-40">
            <label className="text-xs font-medium text-muted-foreground uppercase">Estado</label>
            <Select value={filters.estado} onValueChange={(v) => handleFilterChange('estado', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ABIERTA">Abierta</SelectItem>
                <SelectItem value="CERRADA">Cerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 w-full md:w-40">
            <label className="text-xs font-medium text-muted-foreground uppercase">Desde</label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5 w-full md:w-40">
            <label className="text-xs font-medium text-muted-foreground uppercase">Hasta</label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5 w-full md:w-48">
            <label className="text-xs font-medium text-muted-foreground uppercase">Provincia</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full h-9 justify-between font-normal",
                    filters.provincias.length === 0 && "text-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-1 overflow-hidden">
                    {filters.provincias.length === 0 ? (
                      "Todas las provincias"
                    ) : filters.provincias.length <= 2 ? (
                      filters.provincias.join(", ")
                    ) : (
                      <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                        {filters.provincias.length}
                      </Badge>
                    )}
                    {filters.provincias.length > 2 && (
                      <span className="hidden lg:inline">
                        {filters.provincias.length} seleccionadas
                      </span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar provincia..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No se encontró la provincia.</CommandEmpty>
                    <CommandGroup>
                      {filters.provincias.length > 0 && (
                        <>
                          <CommandItem
                            onSelect={() => {
                              setFilters(prev => ({ ...prev, provincias: [] }))
                              setCurrentPage(1)
                            }}
                            className="justify-center text-center font-medium text-primary"
                          >
                            Limpiar selección
                          </CommandItem>
                          <CommandSeparator />
                        </>
                      )}
                      {PROVINCIAS.map((p) => (
                        <CommandItem
                          key={p}
                          value={p}
                          onSelect={() => toggleProvince(p)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.provincias.includes(p) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {p}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5 w-full md:w-48">
            <label className="text-xs font-medium text-muted-foreground uppercase">Creado por</label>
            <Select value={filters.creadoPor} onValueChange={(v) => handleFilterChange('creadoPor', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {creators.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end pb-0.5 w-full md:w-fit gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters} className="w-full gap-2 h-9">
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar
            </Button>
          </div>

          <div className="flex items-end pb-0.5 ml-auto">
            <Button variant="outline" size="sm" onClick={() => router.refresh()} className="gap-2 h-9">
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead className="w-[465px] max-w-[465px]">Título</TableHead>
                <TableHead className="w-[175px] max-w-[175px]">Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Provincia</TableHead>
                <TableHead>Creado por</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[80px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No se encontraron incidencias.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow 
                    key={item.id} 
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/requests/${item.id}`)}
                  >
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      <div className="flex items-center gap-1.5">
                        <span>{item.external_id}</span>
                        {(item.assignments || []).some(a => a.user_id === userId) && (
                          <Forward className="h-3 w-3 text-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="w-[465px] max-w-[465px]">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground line-clamp-1">{item.titulo}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {item.tipo_incidencia || 'Sin tipo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="w-[175px] max-w-[175px]">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium line-clamp-1">{item.customer?.company_name || 'Particular'}</span>
                        <span className="text-xs text-muted-foreground truncate">{item.ciudad}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.contacto_nombre || '-'}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {item.contacto_telefono || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.provincia || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.creator?.full_name || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(item.created_at), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-semibold text-[10px] px-2 py-0 h-5", statusColors[item.estado] || "bg-muted text-muted-foreground")}>
                        {item.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          onClick={(e) => handleDuplicate(e, item)}
                          disabled={!!loadingId}
                          title="Duplicar incidencia"
                        >
                          {loadingId === `dup-${item.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        {(userRole === 'admin' || userRole === 'manager') && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={(e) => handleDelete(e, item.id)}
                            disabled={!!loadingId}
                            title="Eliminar incidencia"
                          >
                            {loadingId === `del-${item.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-2">
            <div className="text-sm text-muted-foreground">
              Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> de <span className="font-medium">{filteredData.length}</span> incidencias
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3"
              >
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, i, arr) => (
                    <div key={p} className="flex items-center">
                      {i > 0 && arr[i-1] !== p - 1 && <span className="px-2 text-muted-foreground">...</span>}
                      <Button
                        variant={currentPage === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(p)}
                        className={cn(
                          "h-8 w-8 p-0 text-xs font-medium transition-all",
                          currentPage === p ? "shadow-md scale-105" : "hover:bg-muted"
                        )}
                      >
                        {p}
                      </Button>
                    </div>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-3"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
