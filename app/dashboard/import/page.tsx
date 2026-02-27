import { requireRole } from '@/lib/auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductImport } from '@/components/import/product-import'
import { TarifaImport } from '@/components/import/tarifa-import'
import { CustomerImport } from '@/components/import/customer-import'
import { Badge } from '@/components/ui/badge'
import { Package, Tag, Info, Building2 } from 'lucide-react'

export default async function ImportPage() {
  await requireRole(['admin'])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Importación Masiva</h1>
        <p className="text-muted-foreground mt-1">
          Carga artículos, tarifas y clientes desde archivos Excel o CSV
        </p>
      </div>

      <Tabs defaultValue="productos">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="productos" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Artículos
          </TabsTrigger>
          <TabsTrigger value="tarifas" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tarifas
          </TabsTrigger>
          <TabsTrigger value="clientes" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Clientes
          </TabsTrigger>
        </TabsList>

        {/* ── PRODUCTOS ── */}
        <TabsContent value="productos" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Importar Artículos</CardTitle>
                  <CardDescription>
                    Carga o actualiza artículos en masa. Si la referencia ya existe, sus datos se actualizarán (upsert).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductImport />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card className="border-blue-100 bg-blue-50/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    Formato del archivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <div>
                    <p className="font-semibold text-foreground mb-1">Columnas obligatorias</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="default" className="text-[10px]">referencia</Badge>
                      <Badge variant="default" className="text-[10px]">descripcion</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Columnas opcionales</p>
                    <div className="flex flex-wrap gap-1">
                      {['familia','subfamilia','modelo_nombre','acabado','fijacion','compuerta','tipo_deflexion','regulacion_compuerta','ancho','alto','largo','area_efectiva','volumen','larguero_alto','larguero_largo','motorizada','art_personalizado','status','texto_prescripcion','ficha_tecnica'].map(c => (
                        <Badge key={c} variant="secondary" className="text-[10px] font-mono">{c}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-blue-100">
                    <p className="font-semibold text-foreground">Reglas de formato</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li><strong>referencia</strong>: texto único, identificador del artículo</li>
                      <li>Medidas (ancho, alto...): número decimal con punto o coma</li>
                      <li>motorizada / art_personalizado: <code>si</code>, <code>no</code>, <code>1</code>, <code>0</code></li>
                      <li>status: <code>active</code> o <code>inactive</code></li>
                      <li>La primera fila debe ser la cabecera</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── TARIFAS ── */}
        <TabsContent value="tarifas" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Importar Tarifa de Precios</CardTitle>
                  <CardDescription>
                    Crea o actualiza una tarifa y asígnale precios por artículo. Los precios existentes se sobrescriben.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TarifaImport />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card className="border-blue-100 bg-blue-50/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    Formato del archivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <div>
                    <p className="font-semibold text-foreground mb-1">Columnas obligatorias</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="default" className="text-[10px]">referencia</Badge>
                      <Badge variant="default" className="text-[10px]">precio</Badge>
                    </div>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-blue-100">
                    <p className="font-semibold text-foreground">Reglas de formato</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li><strong>referencia</strong>: debe coincidir con la referencia del artículo</li>
                      <li><strong>precio</strong>: decimal con punto o coma (ej: <code>125.50</code>)</li>
                      <li>El nombre de tarifa se introduce antes de importar</li>
                      <li>Artículos no encontrados se informan tras la importación</li>
                      <li>La primera fila debe ser la cabecera</li>
                    </ul>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-blue-100">
                    <p className="font-semibold text-foreground">Flujo recomendado</p>
                    <ol className="space-y-1 list-decimal list-inside">
                      <li>Importa primero los artículos</li>
                      <li>Luego importa la tarifa con las mismas referencias</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── CLIENTES ── */}
        <TabsContent value="clientes" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Importar Clientes y Asignaciones</CardTitle>
                  <CardDescription>
                    Carga clientes en masa o asigna perfiles de usuario a clientes existentes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomerImport />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card className="border-blue-100 bg-blue-50/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    Importar Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <div>
                    <p className="font-semibold text-foreground mb-1">Columna obligatoria</p>
                    <Badge variant="default" className="text-[10px]">company_name</Badge>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Columnas opcionales</p>
                    <div className="flex flex-wrap gap-1">
                      {['contact_name','contact_email','contact_phone','address','ciudad','provincia','codigo_postal','pais','nif','industry','website','forma_pago','status','notas_cliente','descuento_agfri','descuento_difusion','descuento_sistemas'].map(c => (
                        <Badge key={c} variant="secondary" className="text-[10px] font-mono">{c}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-blue-100">
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Si el <strong>company_name</strong> ya existe, se actualiza (upsert)</li>
                      <li>status: <code>active</code>, <code>inactive</code>, <code>prospect</code> o <code>churned</code></li>
                      <li>descuentos: número entero entre 0 y 100</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-100 bg-blue-50/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    Asignar Perfiles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <div>
                    <p className="font-semibold text-foreground mb-1">Columnas obligatorias</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="default" className="text-[10px]">company_name</Badge>
                      <Badge variant="default" className="text-[10px]">email</Badge>
                    </div>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-blue-100">
                    <ul className="space-y-1 list-disc list-inside">
                      <li><strong>company_name</strong>: nombre exacto del cliente (búsqueda insensible a mayúsculas)</li>
                      <li><strong>email</strong>: email del perfil de usuario a asignar</li>
                      <li>Si la asignación ya existe, se omite (no duplica)</li>
                      <li>Se informa de clientes o emails no encontrados</li>
                    </ul>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-blue-100">
                    <p className="font-semibold text-foreground">Flujo recomendado</p>
                    <ol className="space-y-1 list-decimal list-inside">
                      <li>Importa primero los clientes</li>
                      <li>Luego asigna los perfiles por email</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}


        {/* ── PRODUCTOS ── */}
        <TabsContent value="productos" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Importar Artículos</CardTitle>
                  <CardDescription>
                    Carga o actualiza artículos en masa. Si la referencia ya existe, sus datos se actualizarán (upsert).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProductImport />
                </CardContent>
              </Card>
            </div>

            {/* Format guide */}
            <div className="space-y-4">
              <Card className="border-blue-100 bg-blue-50/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    Formato del archivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <div>
                    <p className="font-semibold text-foreground mb-1">Columnas obligatorias</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="default" className="text-[10px]">referencia</Badge>
                      <Badge variant="default" className="text-[10px]">descripcion</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Columnas opcionales</p>
                    <div className="flex flex-wrap gap-1">
                      {['familia','subfamilia','modelo_nombre','acabado','fijacion','compuerta','tipo_deflexion','regulacion_compuerta','ancho','alto','largo','area_efectiva','volumen','larguero_alto','larguero_largo','motorizada','art_personalizado','status','texto_prescripcion','ficha_tecnica'].map(c => (
                        <Badge key={c} variant="secondary" className="text-[10px] font-mono">{c}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-blue-100">
                    <p className="font-semibold text-foreground">Reglas de formato</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li><strong>referencia</strong>: texto único, identificador del artículo</li>
                      <li>Medidas (ancho, alto, largo...): número decimal con punto o coma</li>
                      <li>motorizada / art_personalizado: <code>si</code>, <code>no</code>, <code>1</code>, <code>0</code></li>
                      <li>status: <code>active</code> o <code>inactive</code> (por defecto <code>active</code>)</li>
                      <li>La primera fila debe ser la cabecera con los nombres de columna</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── TARIFAS ── */}
        <TabsContent value="tarifas" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Importar Tarifa de Precios</CardTitle>
                  <CardDescription>
                    Crea o actualiza una tarifa y asígnale precios por artículo. Los precios existentes se sobrescriben.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TarifaImport />
                </CardContent>
              </Card>
            </div>

            {/* Format guide */}
            <div className="space-y-4">
              <Card className="border-blue-100 bg-blue-50/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    Formato del archivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground">
                  <div>
                    <p className="font-semibold text-foreground mb-1">Columnas obligatorias</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="default" className="text-[10px]">referencia</Badge>
                      <Badge variant="default" className="text-[10px]">precio</Badge>
                    </div>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-blue-100">
                    <p className="font-semibold text-foreground">Reglas de formato</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li><strong>referencia</strong>: debe coincidir exactamente con la referencia del artículo en la tabla de Productos</li>
                      <li><strong>precio</strong>: número decimal, separador punto o coma (ej: <code>125.50</code> o <code>125,50</code>)</li>
                      <li>El <strong>nombre de tarifa</strong> se introduce manualmente antes de importar</li>
                      <li>Si la tarifa ya existe, sus precios se actualizarán; si no, se creará</li>
                      <li>Artículos no encontrados por referencia se informan tras la importación</li>
                      <li>La primera fila debe ser la cabecera</li>
                    </ul>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-blue-100">
                    <p className="font-semibold text-foreground">Flujo recomendado</p>
                    <ol className="space-y-1 list-decimal list-inside">
                      <li>Importa primero los artículos</li>
                      <li>Luego importa la tarifa usando las mismas referencias</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
