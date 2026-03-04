'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MoreHorizontal, Trash2, Edit, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Product {
  id: number
  referencia: string
  descripcion?: string
  familia?: string
  subfamilia?: string
  acabado?: string
  fijacion?: string
  largo?: number
  ancho?: number
  status?: string
  brand_id?: number
  brands?: { name: string } | null
}

interface Tarifa {
  id_tarifa: number
  nombre: string
}

interface PrecioProducto {
  id_producto: number
  precio: number
}

interface ProductsTableProps {
  products: Product[]
}

const PAGE_SIZE = 500

export function ProductsTable({ products: initialProducts }: ProductsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedTarifa, setSelectedTarifa] = useState<number | null>(null)
  const [tarifas, setTarifas] = useState<Tarifa[]>([])
  const [precios, setPrecios] = useState<Map<number, number>>(new Map())
  const [currentPage, setCurrentPage] = useState(1)
  const [products, setProducts] = useState(initialProducts)
  const supabase = createClient()

  // Load tarifas and set default from app_settings
  useEffect(() => {
    const load = async () => {
      const { data: tarifasData } = await supabase
        .from('tarifas')
        .select('id_tarifa, nombre')
        .order('nombre')
      
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('default_tarifa_id')
        .single()
      
      if (tarifasData && tarifasData.length > 0) {
        setTarifas(tarifasData)
        // Use default tarifa from settings, or fall back to first tarifa
        const defaultTarifaId = settingsData?.default_tarifa_id || tarifasData[0].id_tarifa
        setSelectedTarifa(defaultTarifaId)
      }
    }
    load()
  }, [])

  // Load precios when tarifa changes - load up to 50000 in batches of 1000
  useEffect(() => {
    if (!selectedTarifa) return
    const load = async () => {
      const allPrecios: PrecioProducto[] = []
      
      // Load in batches using range() to avoid URI too large errors
      for (let i = 0; i < 50; i++) {
        const { data, error } = await supabase
          .from('precios_producto')
          .select('id_producto, precio')
          .eq('id_tarifa', selectedTarifa)
          .order('id_producto')
          .range(i * 1000, i * 1000 + 999)
        
        if (error) break
        if (!data || data.length === 0) break
        
        allPrecios.push(...data)
        if (data.length < 1000) break // Last page
      }
      
      const map = new Map<number, number>()
      allPrecios.forEach(p => map.set(p.id_producto, p.precio))
      setPrecios(map)
    }
    load()
  }, [selectedTarifa, supabase])

  const sortedProducts = useMemo(() =>
    [...products].sort((a, b) =>
      (a.referencia || '').toLowerCase().localeCompare((b.referencia || '').toLowerCase())
    ), [products])

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return sortedProducts
    const s = search.toLowerCase()
    return sortedProducts.filter(p =>
      p.referencia?.toLowerCase().includes(s) ||
      p.descripcion?.toLowerCase().includes(s) ||
      p.familia?.toLowerCase().includes(s) ||
      p.subfamilia?.toLowerCase().includes(s)
    )
  }, [sortedProducts, search])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const pageProducts = filteredProducts.slice(pageStart, pageStart + PAGE_SIZE)

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { alert('Error al eliminar el producto'); return }
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const formatDim = (val?: number) => val ? `${val}` : '-'
  const formatPrice = (id: number) => {
    const p = precios.get(id)
    return p !== undefined ? `€${p.toFixed(2)}` : '-'
  }

  return (
    <Card>
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por referencia, descripción, familia..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              className="pl-10"
            />
          </div>

          {tarifas.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">Tarifa:</span>
              <select
                value={selectedTarifa || ''}
                onChange={(e) => setSelectedTarifa(Number(e.target.value))}
                className="border border-input bg-background px-3 py-2 text-sm rounded-md"
              >
                {tarifas.map(t => (
                  <option key={t.id_tarifa} value={t.id_tarifa}>{t.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <span className="text-sm text-muted-foreground shrink-0">{filteredProducts.length} artículos</span>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-xs">#</TableHead>
                <TableHead className="text-xs">Referencia</TableHead>
                <TableHead className="text-xs">Marca</TableHead>
                <TableHead className="text-xs">Familia</TableHead>
                <TableHead className="text-xs">Subfamilia</TableHead>
                <TableHead className="text-xs">Descripción</TableHead>
                <TableHead className="text-xs">Acabado</TableHead>
                <TableHead className="text-xs">Fijación</TableHead>
                <TableHead className="text-xs text-right">Largo</TableHead>
                <TableHead className="text-xs text-right">Ancho</TableHead>
                <TableHead className="text-xs text-right">Precio</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                    {search ? 'No se encontraron productos' : 'Sin productos'}
                  </TableCell>
                </TableRow>
              ) : (
                pageProducts.map((product, index) => (
                  <TableRow key={product.id}>
                    <TableCell className="text-muted-foreground text-xs">{pageStart + index + 1}</TableCell>
                    <TableCell className="font-medium text-xs whitespace-nowrap">{product.referencia}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{product.brands?.name || '-'}</TableCell>
                    <TableCell className="text-xs">{product.familia || '-'}</TableCell>
                    <TableCell className="text-xs">{product.subfamilia || '-'}</TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{product.descripcion || '-'}</TableCell>
                    <TableCell className="text-xs">{product.acabado || '-'}</TableCell>
                    <TableCell className="text-xs">{product.fijacion || '-'}</TableCell>
                    <TableCell className="text-xs text-right">{formatDim(product.largo)}</TableCell>
                    <TableCell className="text-xs text-right">{formatDim(product.ancho)}</TableCell>
                    <TableCell className="text-xs text-right font-semibold whitespace-nowrap">
                      {formatPrice(product.id)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {product.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/products/${product.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Mostrando {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredProducts.length)} de {filteredProducts.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(page => (
                <Button key={page} variant={safePage === page ? 'default' : 'outline'} size="sm" className="w-9" onClick={() => setCurrentPage(page)}>
                  {page}
                </Button>
              ))}
              {totalPages > 10 && <span className="text-sm text-muted-foreground px-2">...</span>}
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
