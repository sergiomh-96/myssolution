import { ProductForm } from '@/components/products/product-form'
import { requireProfile, canManageProducts } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function NewProductPage() {
  const profile = await requireProfile()

  if (!canManageProducts(profile.role)) {
    redirect('/dashboard/products')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Producto</h1>
        <p className="text-muted-foreground mt-2">Crea un nuevo artículo en el catálogo</p>
      </div>

      <ProductForm />
    </div>
  )
}
