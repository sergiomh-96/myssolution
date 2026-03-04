'use client'

import { useState, useMemo, useEffect } from 'react'
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
  const [search, setSearch] = useState('')
  const [selectedTarifa, setSelectedTarifa] = useState<number | null>(null)
  const [tarifas, setTarifas] = useState<Tarifa[]>([])
  const [precios, setPrecios] = useState<Map<number, number>>(new Map())
  const [currentPage, setCurrentPage] = useState(1)
  const [products, setProducts] = useState(initialProducts)
  const supabase = createClient()

  // Load tarifas on mount
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('tarifas')
        .select('id_tarifa, nombre')
        .order('nombre')
      if (data && data.length > 0) {
        setTarifas(data)
        setSelectedTarifa(data[0].id_tarifa)
      }
    }
    load()
  }, [])

  // Load precios when tarifa changes
  useEffect(() => {
    if (!selectedTarifa) return
    const load = async () => {
      const { data } = await supabase
        .from('precios_producto')
        .select('id_producto, precio')
        .eq('id_tarifa', selectedTarifa)
      if (data) {
        const map = new Map<number, number>()
        data.forEach(p => map.set(p.id_producto, p.precio))
        setPrecios(map)
      }
    }
    load()
  }, [selectedTarifa])

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
                          <DropdownMenuItem>
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


interface ProductsTableProps {
  products: Product[]
}

interface Tarifa {
  id_tarifa: number
  nombre: string
}

interface PrecioProducto {
  id_producto: number
  id_tarifa: number
  precio: number
}

const PAGE_SIZE = 500

export function ProductsTable({ products: initialProducts }: ProductsTableProps) {
  const [search, setSearch] = useState('')
  const [selectedTarifa, setSelectedTarifa] = useState<number | null>(null)
  const [tarifas, setTarifas] = useState<Tarifa[]>([])
  const [precios, setPrecios] = useState<PrecioProducto[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [productsToDelete, setProductsToDelete] = useState(initialProducts)
  const supabase = createClient()

  // Load tarifas
  useMemo(() => {
    const loadTarifas = async () => {
      const { data } = await supabase
        .from('tarifas')
        .select('id_tarifa, nombre')
        .order('id_tarifa')
      
      if (data && data.length > 0) {
        setTarifas(data)
        setSelectedTarifa(data[0].id_tarifa)
      }
    }
    loadTarifas()
  }, [supabase])

  // Load precios when tarifa changes
  useMemo(() => {
    if (!selectedTarifa) return

    const loadPrecios = async () => {
      const { data } = await supabase
        .from('precios_producto')
        .select('id_producto, id_tarifa, precio')
        .eq('id_tarifa', selectedTarifa)
      
      if (data) {
        setPrecios(data)
      }
    }
    loadPrecios()
  }, [selectedTarifa, supabase])

  const getPrecioForProduct = (productId: number): string => {
    const precio = precios.find(p => p.id_producto === productId)
    return precio ? `€${precio.precio.toFixed(2)}` : 'N/A'
  }

  // Sort and filter products
  const sortedProducts = useMemo(() => {
    return [...initialProducts].sort((a, b) =>
      (a.referencia || '').toLowerCase().localeCompare((b.referencia || '').toLowerCase())
    )
  }, [initialProducts])

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return sortedProducts
    const searchLower = search.toLowerCase()
    return sortedProducts.filter((product) =>
      product.referencia?.toLowerCase().includes(searchLower) ||
      product.modelo_nombre?.toLowerCase().includes(searchLower) ||
      product.descripcion?.toLowerCase().includes(searchLower)
    )
  }, [sortedProducts, search])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const pageProducts = filteredProducts.slice(pageStart, pageStart + PAGE_SIZE)

  const handleSearch = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return

    try {
      const { error } = await supabase.from('products').delete().eq('id', parseInt(id))
      
      if (error) throw error
      
      setProductsToDelete(productsToDelete.filter(p => p.id !== id))
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error al eliminar el producto')
    }
  }

  return (
    <Card>
      <div className="p-6 space-y-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por referencia, modelo o descripción..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
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
                {tarifas.map((tarifa) => (
                  <option key={tarifa.id_tarifa} value={tarifa.id_tarifa}>
                    {tarifa.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <span className="text-sm text-muted-foreground shrink-0">
            {filteredProducts.length} artículos
          </span>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {search ? 'No se encontraron productos' : 'Sin productos'}
                  </TableCell>
                </TableRow>
              ) : (
                pageProducts.map((product, index) => (
                  <TableRow key={product.id}>
                    <TableCell className="text-muted-foreground font-medium w-12">
                      {pageStart + index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{product.referencia}</TableCell>
                    <TableCell>{product.marca || '-'}</TableCell>
                    <TableCell>{product.modelo_nombre || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{product.descripcion || '-'}</TableCell>
                    <TableCell className="font-semibold">
                      {getPrecioForProduct(product.id)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                        {product.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(String(product.id))}
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
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              Mostrando {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredProducts.length)} de {filteredProducts.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={safePage === page ? 'default' : 'outline'}
                  size="sm"
                  className="w-9"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              {totalPages > 10 && <span className="text-sm text-muted-foreground px-2">...</span>}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
