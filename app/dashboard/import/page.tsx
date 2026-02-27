import { requireRole } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ProductImport } from '@/components/import/product-import'
import { TarifaImport } from '@/components/import/tarifa-import'
import { Package, Tag, Info } from 'lucide-react'

export default async function ImportPage() {
  await requireRole(['admin'])

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Importación Masiva</h1>
        <p className="text-muted-foreground mt-1">
          Sube artículos y tarifas desde archivos Excel (.xlsx / .xls)
        </p>
      </div>

      <Tabs defaultValue="products">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Artículos
          </TabsTrigger>
          <TabsTrigger value="tarifas" className="gap-2">
            <Tag className="h-4 w-4" />
            Tarifas
          </TabsTrigger>
        </TabsList>

        {/* ── PRODUCTS TAB ── */}
        <TabsContent value="products" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Importar Artículos
              </CardTitle>
              <CardDescription>
                Carga masiva de artículos a la tabla de productos. Los registros existentes
                se actualizarán por <strong>referencia</strong>; los nuevos se crearán.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductImport />
            </CardContent>
          </Card>

          {/* Format guide */}
          <Card className="border-border bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Guía de formato — Artículos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium mb-2">Columnas obligatorias</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge>referencia</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  La referencia es la clave única del artículo. Si ya existe en la base de datos, sus datos se actualizarán.
                </p>
              </div>
              <div>
                <p className="font-medium mb-2">Columnas opcionales</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'descripcion', 'familia', 'subfamilia', 'modelo_nombre', 'acabado',
                    'fijacion', 'tipo_deflexion', 'compuerta', 'regulacion_compuerta',
                    'texto_prescripcion', 'ficha_tecnica', 'status',
                  ].map(c => <Badge key={c} variant="outline">{c}</Badge>)}
                </div>
              </div>
              <div>
                <p className="font-medium mb-2">Columnas numéricas (opcionales)</p>
                <div className="flex flex-wrap gap-1.5">
                  {['ancho', 'alto', 'largo', 'area_efectiva', 'volumen', 'larguero_alto', 'larguero_largo'].map(c =>
                    <Badge key={c} variant="outline">{c}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Introduce valores numéricos sin unidades (ej: 400, no "400mm").</p>
              </div>
              <div>
                <p className="font-medium mb-2">Columnas booleanas (opcionales)</p>
                <div className="flex flex-wrap gap-1.5">
                  {['motorizada', 'art_personalizado'].map(c =>
                    <Badge key={c} variant="outline">{c}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Usa <code className="bg-muted px-1 rounded">true</code> / <code className="bg-muted px-1 rounded">false</code> o <code className="bg-muted px-1 rounded">1</code> / <code className="bg-muted px-1 rounded">0</code>.</p>
              </div>
              <div>
                <p className="font-medium mb-2">Campo status</p>
                <p className="text-xs text-muted-foreground">
                  Valores válidos: <code className="bg-muted px-1 rounded">active</code> (por defecto), <code className="bg-muted px-1 rounded">inactive</code>, <code className="bg-muted px-1 rounded">discontinued</code>.
                </p>
              </div>
              <div className="rounded-lg border border-border p-3 bg-background">
                <p className="text-xs font-medium mb-1">Ejemplo de fila válida</p>
                <code className="text-xs text-muted-foreground">
                  referencia: REF-001 | descripcion: Rejilla 400x200 | familia: Difusión | ancho: 400 | alto: 200 | motorizada: false | status: active
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TARIFAS TAB ── */}
        <TabsContent value="tarifas" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Importar Tarifa de Precios
              </CardTitle>
              <CardDescription>
                Asocia precios a artículos existentes bajo una tarifa concreta.
                Si la tarifa ya existe se actualiza; si no, se crea automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TarifaImport />
            </CardContent>
          </Card>

          {/* Format guide */}
          <Card className="border-border bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Guía de formato — Tarifas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium mb-2">Columnas obligatorias del archivo</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge>referencia</Badge>
                  <Badge>precio</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  La columna <strong>referencia</strong> debe coincidir exactamente con una referencia existente en la tabla de artículos.
                  La columna <strong>precio</strong> (también acepta <code className="bg-muted px-1 rounded">pvp</code> o <code className="bg-muted px-1 rounded">PVP</code>) debe ser un valor numérico decimal.
                </p>
              </div>
              <div>
                <p className="font-medium mb-2">Campos del formulario (no van en el Excel)</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Nombre de la tarifa</strong> — requerido. Ej: "Tarifa 2025", "Tarifa Especial Clientes".</li>
                  <li><strong>Fecha de inicio</strong> — opcional. Indica desde cuándo es válida la tarifa.</li>
                  <li><strong>Fecha de fin</strong> — opcional. Indica hasta cuándo es válida la tarifa.</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Comportamiento de actualización</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Si el artículo ya tiene precio en esa tarifa, se <strong>actualiza</strong> con el nuevo valor.</li>
                  <li>Si el artículo no existe en la base de datos, la fila se <strong>omite</strong> y aparece en el listado de errores.</li>
                  <li>Si ya existe la tarifa con ese nombre, sus precios se <strong>actualizan</strong>; los artículos no incluidos en el Excel mantienen su precio anterior.</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border p-3 bg-background">
                <p className="text-xs font-medium mb-1">Ejemplo de fila válida</p>
                <code className="text-xs text-muted-foreground">
                  referencia: REF-001 | precio: 125.50
                </code>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-400 mb-1">Importante</p>
                <p className="text-xs text-amber-700 dark:text-amber-500">
                  Los artículos deben estar previamente cargados en la base de datos antes de importar una tarifa.
                  Si necesitas cargar artículos nuevos, usa primero la pestaña "Artículos".
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
