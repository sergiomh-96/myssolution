import { ProductForm } from '@/components/products/product-form'
import { requireProfile, canManageProducts } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile()

  if (!canManageProducts(profile.role)) {
    redirect('/dashboard/products')
  }

  const { id } = await params
  const productId = parseInt(id, 10)

  if (isNaN(productId)) {
    return <div>ID de producto inválido</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Producto</h1>
        <p className="text-muted-foreground mt-2">Modifica los datos y precios del artículo</p>
      </div>

      <ProductForm productId={productId} />
    </div>
  )
}
