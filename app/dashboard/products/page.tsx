import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProductsTable } from '@/components/products/products-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function ProductsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch up to 50000 products sequentially in batches of 1000 with brand join
  const products: any[] = []
  for (let i = 0; ; i += 1000) {
    const { data } = await supabase
      .from('products')
      .select('id, referencia, descripcion, familia, subfamilia, acabado, fijacion, largo, ancho, status, brand_id, brands(name)')
      .order('referencia', { ascending: true })
      .range(i, i + 999)
    if (!data || data.length === 0) break
    products.push(...data)
    if (data.length < 1000) break
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Productos</h1>
          <p className="text-muted-foreground mt-2">Gestiona los artículos de AGFRI y MYSAIR</p>
        </div>
        <Link href="/dashboard/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </Link>
      </div>

      <ProductsTable products={products || []} />
    </div>
  )
}
