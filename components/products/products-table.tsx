'use client'

import { useState } from 'react'
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
} from '@/components/ui/dropdown-menu'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MoreHorizontal, Trash2, Edit } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/types/database'

interface ProductsTableProps {
  products: Product[]
}

export function ProductsTable({ products: initialProducts }: ProductsTableProps) {
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const filteredProducts = products.filter(product =>
    product.referencia?.toLowerCase().includes(search.toLowerCase()) ||
    product.modelo_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    product.descripcion?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return

    const { error } = await supabase.from('products').delete().eq('id', id)

    if (!error) {
      setProducts(products.filter(p => p.id !== id))
    }
  }

  const getBrandColor = (marca: string) => {
    return marca === 'AGFRI' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
  }

  return (
    <Card>
      <div className="p-4 border-b border-border">
        <Input
          placeholder="Buscar por referencia, modelo o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Marca</TableHead>
            <TableHead>Referencia</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Familia</TableHead>
            <TableHead>Subfamilia</TableHead>
            <TableHead className="text-right">PVP 25</TableHead>
            <TableHead className="text-right">PVP 26</TableHead>
            <TableHead className="text-right">PVP 27</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Badge className={getBrandColor(product.marca || '')}>
                  {product.marca}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">{product.referencia}</TableCell>
              <TableCell>{product.modelo_nombre}</TableCell>
              <TableCell>{product.familia}</TableCell>
              <TableCell>{product.subfamilia}</TableCell>
              <TableCell className="text-right">{product.pvp_25}€</TableCell>
              <TableCell className="text-right">{product.pvp_26}€</TableCell>
              <TableCell className="text-right">{product.pvp_27}€</TableCell>
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
                      onClick={() => handleDelete(product.id)}
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
