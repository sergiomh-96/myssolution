'use client'

import { useState, useEffect } from 'react'
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
import { MoreHorizontal, Trash2, Edit } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/types/database'

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

export function ProductsTable({ products: initialProducts }: ProductsTableProps) {
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [selectedTarifa, setSelectedTarifa] = useState<number | null>(null)
  const [tarifas, setTarifas] = useState<Tarifa[]>([])
  const [precios, setPrecios] = useState<PrecioProducto[]>([])
  const supabase = createClient()

  // Load tarifas
  useEffect(() => {
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

  // Load prices when tarifa changes
  useEffect(() => {
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

  const filteredProducts = products.filter((product) => {
    const searchLower = search.toLowerCase()
    return (
      product.referencia?.toLowerCase().includes(searchLower) ||
      product.modelo_nombre?.toLowerCase().includes(searchLower) ||
      product.descripcion?.toLowerCase().includes(searchLower)
    )
  })

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return

    try {
      const { error } = await supabase.from('products').delete().eq('id', parseInt(id))
      
      if (error) throw error
      
      setProducts(products.filter(p => p.id !== id))
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error al eliminar el producto')
    }
  }

  return (
    <Card>
      <div className="p-6 space-y-4">
        <div className="flex gap-4 items-center">
          <Input
            placeholder="Buscar productos por referencia, modelo o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          
          {tarifas.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tarifa:</span>
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
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
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
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No se encontraron productos
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.referencia}</TableCell>
                    <TableCell>{product.marca}</TableCell>
                    <TableCell>{product.modelo_nombre}</TableCell>
                    <TableCell className="max-w-xs truncate">{product.descripcion}</TableCell>
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
      </div>
    </Card>
  )
}
