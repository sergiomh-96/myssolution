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

  const filteredProducts = products.filter(product =>
    product.referencia?.toLowerCase().includes(search.toLowerCase()) ||
    product.modelo_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    product.descripcion?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return

    try {
      const { error } = await supabase.from('products').delete().eq('id', parseInt(id))
      if (!error) {
        setProducts(products.filter(p => p.id !== parseInt(id)))
      }
    } catch (err) {
      console.error('Error deleting product:', err)
    }
  }

  return (
    <Card>
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Buscar por referencia, modelo o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          
          {tarifas.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Tarifa: {tarifas.find(t => t.id_tarifa === selectedTarifa)?.nombre || 'Seleccionar'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Seleccionar Tarifa</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tarifas.map(tarifa => (
                  <DropdownMenuItem
                    key={tarifa.id_tarifa}
                    onClick={() => setSelectedTarifa(tarifa.id_tarifa)}
                    className={selectedTarifa === tarifa.id_tarifa ? 'bg-accent' : ''}
                  >
                    {tarifa.nombre}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referencia</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Familia</TableHead>
            <TableHead>Subfamilia</TableHead>
            <TableHead>Descripción</TableHead>
            {selectedTarifa && <TableHead className="text-right">Precio</TableHead>}
            <TableHead>Estado</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-mono text-sm">{product.referencia}</TableCell>
              <TableCell>{product.modelo_nombre}</TableCell>
              <TableCell>{product.familia}</TableCell>
              <TableCell>{product.subfamilia}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{product.descripcion}</TableCell>
              {selectedTarifa && (
                <TableCell className="text-right font-semibold">
                  {getPrecioForProduct(product.id)}
                </TableCell>
              )}
              <TableCell>
                <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                  {product.status}
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
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(product.id.toString())}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {filteredProducts.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No se encontraron productos
        </div>
      )}
    </Card>
  )
}
