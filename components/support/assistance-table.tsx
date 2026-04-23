'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import { Search, Filter, RotateCcw } from 'lucide-react'
import type { SupportAssistance, UserRole } from '@/lib/types/database'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface AssistanceTableProps {
  assistances: (SupportAssistance & {
    customer: { company_name: string } | null
    employee: { full_name: string | null } | null
  })[]
  userRole: UserRole
  userId: string
}

const statusColors: Record<string, string> = {
  'ABIERTA': 'bg-info/10 text-info border-info/20',
  'CERRADA': 'bg-success/10 text-success border-success/20',
  'PENDIENTE': 'bg-warning/10 text-warning-foreground border-warning/20',
}

export function AssistanceTable({ assistances, userRole, userId }: AssistanceTableProps) {
  const [filters, setFilters] = useState({
    search: '',
    externalId: '',
    estado: 'all',
    provincia: 'all',
    tipo: 'all',
    responsable: 'all',
  })

  const resetFilters = () => {
    setFilters({
      search: '',
      externalId: '',
      estado: 'all',
      provincia: 'all',
      tipo: 'all',
      responsable: 'all',
    })
  }

  const filteredData = assistances.filter((item) => {
    const matchesSearch = !filters.search || item.customer?.company_name.toLowerCase().includes(filters.search.toLowerCase())
    const matchesId = !filters.externalId || item.external_id?.toLowerCase().includes(filters.externalId.toLowerCase())
    const matchesStatus = filters.estado === 'all' || item.estado === filters.estado
    const matchesTipo = filters.tipo === 'all' || item.tipo_incidencia === filters.tipo
    const matchesProvincia = filters.provincia === 'all' || item.provincia === filters.provincia
    const matchesResponsable = filters.responsable === 'all' || item.empleado_id === filters.responsable

    return matchesSearch && matchesId && matchesStatus && matchesTipo && matchesProvincia && matchesResponsable
  })

  // Get unique values for filters
  const provincias = Array.from(new Set(assistances.map(a => a.provincia).filter(Boolean)))
  const tipos = Array.from(new Set(assistances.map(a => a.tipo_incidencia).filter(Boolean)))
  const responsables = Array.from(new Set(assistances.map(a => ({ id: a.empleado_id, name: a.employee?.full_name })).filter(r => r.id)))

  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">Empresa</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">ID Incidencia</label>
            <Input
              placeholder="Ej: IN00817"
              value={filters.externalId}
              onChange={(e) => setFilters({ ...filters, externalId: e.target.value })}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">Estado</label>
            <Select value={filters.estado} onValueChange={(v) => setFilters({ ...filters, estado: v })}>
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

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">Provincia</label>
            <Select value={filters.provincia} onValueChange={(v) => setFilters({ ...filters, provincia: v })}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {provincias.map(p => (
                  <SelectItem key={p} value={p!}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase">Responsable</label>
            <Select value={filters.responsable} onValueChange={(v) => setFilters({ ...filters, responsable: v })}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {responsables.map(r => (
                  <SelectItem key={r.id} value={r.id!}>{r.name || 'Sin nombre'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end pb-0.5">
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
                <TableHead className="min-w-[200px]">Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No se encontraron incidencias.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      {item.external_id}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground line-clamp-1">{item.titulo}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {item.tipo_incidencia || 'Sin tipo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{item.customer?.company_name || 'Particular'}</span>
                        <span className="text-xs text-muted-foreground">{item.ciudad}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(item.fecha), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.employee?.full_name || 'No asignado'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-semibold text-[10px] px-2 py-0 h-5", statusColors[item.estado] || "bg-muted text-muted-foreground")}>
                        {item.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild className="h-8 px-2">
                        <Link href={`/dashboard/requests/${item.id}`}>Gestionar</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
