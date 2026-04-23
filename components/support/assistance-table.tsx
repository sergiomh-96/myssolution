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
import { Search, Filter, RotateCcw, Check, ChevronsUpDown } from 'lucide-react'
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
  })[]
  userRole: UserRole
  userId: string
}

const statusColors: Record<string, string> = {
  'ABIERTA': 'bg-info/10 text-info border-info/20',
  'CERRADA': 'bg-success/10 text-success border-success/20',
  'PENDIENTE': 'bg-warning/10 text-warning-foreground border-warning/20',
}

const PROVINCIAS = [
  "Ávila", "Albacete", "Alicante/Alacant", "Almería", "Araba/Álava", "Asturias", "Badajoz", "Balears, Illes", "Barcelona", "Bizkaia", "Burgos", "Cáceres", "Cádiz", "Cantabria", "Castellón/Castelló", "Ceuta", "Ciudad Real", "Córdoba", "Coruña, A", "Cuenca", "Gipuzkoa", "Girona", "Granada", "Guadalajara", "Huelva", "Huesca", "Jaén", "León", "Lleida", "Lugo", "Madrid", "Málaga", "Melilla", "Murcia", "Navarra", "Ourense", "Palencia", "Palmas, Las", "Pontevedra", "Rioja, La", "Salamanca", "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia/València", "Valladolid", "Zamora", "Zaragoza"
].sort()

export function AssistanceTable({ assistances, userRole, userId }: AssistanceTableProps) {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  const [filters, setFilters] = useState({
    search: '',
    externalId: '',
    estado: 'all',
    provincias: [] as string[],
    tipo: 'all',
  })

  const resetFilters = () => {
    setFilters({
      search: '',
      externalId: '',
      estado: 'all',
      provincias: [],
      tipo: 'all',
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

  const filteredData = assistances.filter((item) => {
    const matchesSearch = !filters.search || 
      item.customer?.company_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.contacto_nombre?.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.contacto_telefono?.toLowerCase().includes(filters.search.toLowerCase())
    const matchesId = !filters.externalId || item.external_id?.toLowerCase().includes(filters.externalId.toLowerCase())
    const matchesStatus = filters.estado === 'all' || item.estado === filters.estado
    const matchesTipo = filters.tipo === 'all' || item.tipo_incidencia === filters.tipo
    const matchesProvincia = filters.provincias.length === 0 || (item.provincia && filters.provincias.includes(item.provincia))

    return matchesSearch && matchesId && matchesStatus && matchesTipo && matchesProvincia
  })

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Get unique values for filters
  const tipos = Array.from(new Set(assistances.map(a => a.tipo_incidencia).filter(Boolean)))

  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-end gap-2 mb-6">
          <div className="space-y-1.5 w-full md:w-64">
            <label className="text-xs font-medium text-muted-foreground uppercase">Empresa</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5 w-full md:w-40">
            <label className="text-xs font-medium text-muted-foreground uppercase">ID Incidencia</label>
            <Input
              placeholder="Ej: IN00817"
              value={filters.externalId}
              onChange={(e) => handleFilterChange('externalId', e.target.value)}
              className="h-9"
            />
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
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
              </SelectContent>
            </Select>
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

          <div className="flex items-end pb-0.5 w-full md:w-fit">
            <Button variant="outline" size="sm" onClick={resetFilters} className="w-full gap-2 h-9">
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar
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
                <TableHead>Email</TableHead>
                <TableHead>Provincia</TableHead>
                <TableHead>Creado por</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
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
                      {item.external_id}
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
                      {item.contacto_email || '-'}
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
