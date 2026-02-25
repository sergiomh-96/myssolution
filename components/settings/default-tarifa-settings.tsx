'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function DefaultTarifaSettings() {
  const [tarifas, setTarifas] = useState<any[]>([])
  const [defaultTarifaId, setDefaultTarifaId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()

        // Load tarifas
        const { data: tarifasData, error: tarifasError } = await supabase
          .from('tarifas')
          .select('id_tarifa, nombre')
          .order('nombre')

        if (tarifasError) throw tarifasError
        setTarifas(tarifasData || [])

        // Load current default tarifa
        const { data: settingsData, error: settingsError } = await supabase
          .from('app_settings')
          .select('default_tarifa_id')
          .eq('id', 1)
          .single()

        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError
        if (settingsData?.default_tarifa_id) {
          setDefaultTarifaId(settingsData.default_tarifa_id.toString())
        }
      } catch (err) {
        console.error('Error loading settings:', err)
        setError(err instanceof Error ? err.message : 'Error loading settings')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    setError(null)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('app_settings')
        .update({
          default_tarifa_id: defaultTarifaId ? parseInt(defaultTarifaId) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1)

      if (updateError) throw updateError
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError(err instanceof Error ? err.message : 'Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">Cargando configuración...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarifa Predeterminada</CardTitle>
        <CardDescription>
          Selecciona la tarifa que aparecerá por defecto al crear nuevas ofertas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Configuración guardada correctamente
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="default-tarifa">Tarifa Predeterminada</Label>
          <Select
            value={defaultTarifaId}
            onValueChange={setDefaultTarifaId}
            disabled={saving}
          >
            <SelectTrigger id="default-tarifa">
              <SelectValue placeholder="Seleccionar tarifa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin tarifa predeterminada</SelectItem>
              {tarifas.map((tarifa) => (
                <SelectItem key={tarifa.id_tarifa} value={tarifa.id_tarifa.toString()}>
                  {tarifa.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </CardContent>
    </Card>
  )
}
