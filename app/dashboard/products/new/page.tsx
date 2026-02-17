import { ProductForm } from '@/components/products/product-form'

export default function NewProductPage() {
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
