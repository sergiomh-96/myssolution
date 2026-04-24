'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { startOfMonth, subMonths, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { KPIGrid } from '@/components/dashboard/kpi-grid'
import { CustomerValueChart } from '@/components/dashboard/customer-value-chart'
import { Loader2, Eye, EyeOff, TrendingUp, Headset, PieChart, Clock, ShieldCheck, FileWarning, Package, MapPin, Calendar, BarChart3, Users, ChevronDown, Boxes } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, AreaChart, Area } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Profile } from '@/lib/types/database'
import { cn } from '@/lib/utils'

export default function AnalyticsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSensitiveVisible, setIsSensitiveVisible] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [supportData, setSupportData] = useState<any>(null)
  const [supportYear, setSupportYear] = useState<string>(new Date().getFullYear().toString())
  const [rawAssistances, setRawAssistances] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function fetchAnalyticsData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setIsSensitiveVisible(!profileData.default_privacy_mode)
      }

      const role = profileData?.role?.toLowerCase().replace(/\s+/g, '_') || ''
      const isSensitiveRole = ['sales_rep', 'vendedor', 'support_agent', 'support', 'soporte', 'technical_support'].includes(role)

      const now = new Date()
      const currentYearStart = new Date(now.getFullYear(), 0, 1).toISOString()
      const thisMonthStart = startOfMonth(now).toISOString()
      const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString()

      // --- Sales Data Fetching ---
      let assignedOfferIds: number[] = []
      let assignedCustomerIds: number[] = []
      
      if (isSensitiveRole) {
        const [offerAssRes, customerAssRes] = await Promise.all([
          supabase.from('offer_assignments').select('offer_id').eq('user_id', user.id),
          supabase.from('customer_profile_assignments').select('customer_id').eq('profile_id', user.id)
        ])
        assignedOfferIds = (offerAssRes.data || []).map(a => Number(a.offer_id)).filter(id => !isNaN(id))
        assignedCustomerIds = (customerAssRes.data || []).map(a => Number(a.customer_id)).filter(id => !isNaN(id))
      }

      let customerFilterOR = `created_by.eq.${user.id},assigned_to.eq.${user.id}`
      if (assignedCustomerIds.length > 0) customerFilterOR += `,id.in.(${assignedCustomerIds.join(',')})`

      let offerFilterOR = `created_by.eq.${user.id},assigned_to.eq.${user.id}`
      if (assignedOfferIds.length > 0) offerFilterOR += `,id.in.(${assignedOfferIds.join(',')})`

      const results = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact' }).or(isSensitiveRole ? customerFilterOR : 'id.neq.-1'),
        supabase.from('offers').select('*', { count: 'exact' }).or(isSensitiveRole ? offerFilterOR : 'id.neq.-1'),
        supabase.from('customers').select('*', { count: 'exact', head: true }).ilike('industry', '%instalador%').or(isSensitiveRole ? customerFilterOR : 'id.neq.-1'),
        supabase.from('customers').select('*', { count: 'exact', head: true }).ilike('industry', '%distribuidor%').or(isSensitiveRole ? customerFilterOR : 'id.neq.-1'),
        supabase.from('offers').select(`id, status, amount, created_at, customer:customers(company_name), items:offer_items(type, pvp_total, neto_total2)`).gte('created_at', currentYearStart).or(isSensitiveRole ? offerFilterOR : 'id.neq.-1'),
        // --- Support Data Fetching ---
        supabase.from('support_assistances').select('*, customer:customers(company_name)'),
        supabase.from('technical_requests').select('*'),
        supabase.from('support_assistance_items').select('referencia, descripcion, cantidad'),
      ])

      const [customersRes, offersRes, instaladoresRes, distribuidoresRes, offersYearRes, assistancesRes, requestsRes, assistanceItemsRes] = results

      // --- Sales Processing ---
      const calculateAmount = (o: any) => {
        const items = (o.items as any[]) || []
        if (items.length > 0) {
          return items.reduce((sum, item) => (item.type === 'article' || item.type === 'external') ? sum + (Number(item.neto_total2) || 0) : sum, 0)
        }
        return Number(o.amount) || 0
      }
      const calculatePVP = (o: any) => {
        const items = (o.items as any[]) || []
        if (items.length > 0) {
          return items.reduce((sum, item) => (item.type === 'article' || item.type === 'external') ? sum + (parseFloat(String(item.pvp_total)) || 0) : sum, 0)
        }
        return Number(o.amount) || 0
      }
      const deduplicateAndCompute = (raw: any[]) => {
        const seen = new Set()
        const deduplicated: any[] = []
        for (const o of raw) {
          if (!seen.has(o.id)) {
            seen.add(o.id)
            deduplicated.push({ ...o, computed_amount: calculateAmount(o), computed_pvp: calculatePVP(o) })
          }
        }
        return deduplicated
      }

      const offersYearData = deduplicateAndCompute(offersYearRes.data || [])
      const totalCustomers = customersRes.count || 0
      const instaladoresCount = instaladoresRes.count || 0
      const distribuidoresCount = distribuidoresRes.count || 0
      const currentMonthOffers = offersYearData.filter(o => o.created_at >= thisMonthStart)
      const lastMonthOffers = offersYearData.filter(o => o.created_at < thisMonthStart && o.created_at >= lastMonthStart)
      const countCurrent = currentMonthOffers.length
      const countLast = lastMonthOffers.length
      const totalAmountCurrentMonth = currentMonthOffers.reduce((sum, o) => sum + o.computed_amount, 0)
      const percentageChange = countLast === 0 ? (countCurrent > 0 ? 100 : 0) : ((countCurrent - countLast) / countLast) * 100

      const neto_breakdown = { borrador: 0, enviada: 0, aceptada: 0, rechazada: 0 }
      const pvp_breakdown = { borrador: 0, enviada: 0, aceptada: 0, rechazada: 0 }
      let totalNetoYear = 0
      let totalPVPYear = 0

      offersYearData.forEach(offer => {
        const status = offer.status as keyof typeof neto_breakdown
        if (status in neto_breakdown) {
          neto_breakdown[status] += offer.computed_amount
          pvp_breakdown[status] += offer.computed_pvp
        }
        totalNetoYear += offer.computed_amount
        totalPVPYear += offer.computed_pvp
      })

      setDashboardData({
        customersCount: totalCustomers,
        customersBreakdown: { total: totalCustomers, instalador: instaladoresCount, distribuidor: distribuidoresCount, otros: Math.max(0, totalCustomers - (instaladoresCount + distribuidoresCount)) },
        offersCount: offersRes.count || 0,
        offersLastMonth: { count: countCurrent, amount: totalAmountCurrentMonth, percentageChange },
        totalOffersAmount: { total: totalNetoYear, breakdown: neto_breakdown, pvp_total: totalPVPYear, pvp_breakdown: pvp_breakdown },
        offersYearData
      })

      // --- Support Processing ---
      const assistances = (assistancesRes.data || []) as any[]
      setRawAssistances(assistances)
      const assistanceItems = assistanceItemsRes.data || []
      
      const totalSupport = assistances.length
      const closedSupport = assistances.filter(a => a.estado?.toUpperCase() === 'CERRADA' || a.estado?.toUpperCase() === 'RESUELTA').length
      const openSupport = totalSupport - closedSupport
      const warrantyCount = assistances.filter(a => Number(a.rma_number) !== 0).length
      const totalDuration = assistances.reduce((sum, a) => sum + (Number(a.duracion_llamada) || 0), 0)
      const avgDuration = totalSupport > 0 ? totalDuration / totalSupport : 0

      // Calculate total products with incidents (sum of quantities in items)
      const totalProductsWithIncidents = assistanceItems.reduce((sum, item) => sum + (Number(item.cantidad) || 1), 0)

      // Support Status Breakdown
      const statusCounts: any = {}
      assistances.forEach(a => { statusCounts[a.estado] = (statusCounts[a.estado] || 0) + 1 })
      const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

      // Support Type Breakdown
      const typeCounts: any = {}
      assistances.forEach(a => { typeCounts[a.tipo_incidencia || 'Otro'] = (typeCounts[a.tipo_incidencia || 'Otro'] || 0) + 1 })
      const typeChartData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }))
        .sort((a, b) => (b.value as number) - (a.value as number))
        .slice(0, 8)

      // Top 10 Articles in Support
      const itemCounts: any = {}
      assistanceItems.forEach(item => {
        const key = item.referencia || item.descripcion || 'Sin referencia'
        itemCounts[key] = (itemCounts[key] || 0) + (Number(item.cantidad) || 1)
      })
      const topArticlesData = Object.entries(itemCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => (b.value as number) - (a.value as number))
        .slice(0, 10)

      // Support Province Breakdown
      const provinceCounts: any = {}
      assistances.forEach(a => { 
        const prov = a.provincia || 'N/A'
        provinceCounts[prov] = (provinceCounts[prov] || 0) + 1 
      })
      const provinceChartData = Object.entries(provinceCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => (b.value as number) - (a.value as number))
        .slice(0, 10)

      // Top 10 Customers with most incidents
      const customerIncidentCounts: any = {}
      assistances.forEach(a => {
        const name = a.customer?.company_name || 'Cliente desconocido'
        customerIncidentCounts[name] = (customerIncidentCounts[name] || 0) + 1
      })
      const topCustomersIncidentsData = Object.entries(customerIncidentCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => (b.value as number) - (a.value as number))
        .slice(0, 10)

      setSupportData({
        total: totalSupport,
        open: openSupport,
        closed: closedSupport,
        warranty: warrantyCount,
        avgDuration: Math.round(avgDuration),
        totalDuration,
        totalProductsWithIncidents,
        statusChartData,
        typeChartData,
        topArticlesData,
        provinceChartData,
        topCustomersIncidentsData
      })

      setIsLoading(false)
    }

    fetchAnalyticsData()
  }, [])

  // Derived data for Monthly Chart based on selected year
  const supportMonthlyChartData = useMemo(() => {
    if (!rawAssistances.length) return []
    
    const year = parseInt(supportYear)
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    
    // Initialize data for all 12 months
    const data = months.map((name, index) => ({
      name,
      month: index,
      value: 0
    }))

    // Populate with actual data
    rawAssistances.forEach(a => {
      const date = new Date(a.created_at)
      if (date.getFullYear() === year) {
        const monthIndex = date.getMonth()
        data[monthIndex].value += 1
      }
    })

    return data
  }, [rawAssistances, supportYear])

  const availableSupportYears = useMemo(() => {
    const years = new Set<string>()
    rawAssistances.forEach(a => {
      const year = new Date(a.created_at).getFullYear().toString()
      years.add(year)
    })
    // Ensure current year is always there if data is empty or missing current year
    years.add(new Date().getFullYear().toString())
    return Array.from(years).sort((a, b) => b.localeCompare(a))
  }, [rawAssistances])

  if (isLoading || !profile || !dashboardData || !supportData) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))']

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-bold text-foreground">Analytics</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-tight opacity-70">
            Insights y métricas de rendimiento del negocio
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsSensitiveVisible(!isSensitiveVisible)}
          className="h-8 text-[11px] font-medium gap-2 border-border/50 bg-card/10 hover:bg-card/30"
        >
          {isSensitiveVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {isSensitiveVisible ? 'Ocultar datos' : 'Mostrar datos'}
        </Button>
      </div>

      <Tabs defaultValue="ventas" className="w-full">
        <TabsList className="bg-muted/50 border border-border/50 p-1 mb-2">
          <TabsTrigger value="ventas" className="gap-2 px-4">
            <TrendingUp className="w-4 h-4" />
            Ventas
          </TabsTrigger>
          <TabsTrigger value="soporte" className="gap-2 px-4">
            <Headset className="w-4 h-4" />
            Soporte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ventas" className="space-y-4 outline-none">
          <KPIGrid
            isSensitiveVisible={isSensitiveVisible}
            customersBreakdown={dashboardData.customersBreakdown}
            offersCount={dashboardData.offersCount}
            offersLastMonth={dashboardData.offersLastMonth}
            totalOffersAmount={dashboardData.totalOffersAmount}
            role={profile.role}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <CustomerValueChart 
                isSensitiveVisible={isSensitiveVisible}
                offers={dashboardData.offersYearData} 
              />
            </div>
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="py-3 px-4 border-b border-border/50">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground opacity-80 flex items-center gap-2">
                  <PieChart className="w-3.5 h-3.5" />
                  Distribución por Estado
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={Object.entries(dashboardData.totalOffersAmount.breakdown).map(([name, value]) => ({ name, value }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {Object.entries(dashboardData.totalOffersAmount.breakdown).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '12px' }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {Object.entries(dashboardData.totalOffersAmount.breakdown).map(([name, value], index) => (
                    <div key={name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-[10px] uppercase font-medium text-muted-foreground truncate">{name}:</span>
                      <span className="text-[10px] font-bold ml-auto">{formatCurrency(value as number)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="soporte" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-border overflow-hidden group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Asistencias</p>
                    <p className="text-xl font-bold text-foreground leading-tight">{supportData.total}</p>
                  </div>
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                    <Headset className="w-4.5 h-4.5 text-primary" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-[10px] text-muted-foreground gap-2">
                   <span className="flex items-center gap-1 text-success"><ShieldCheck className="w-3 h-3" /> {supportData.closed} cerradas</span>
                   <span className="flex items-center gap-1 text-warning"><Clock className="w-3 h-3" /> {supportData.open} abiertas</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border overflow-hidden group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Garantías / RMA</p>
                    <p className="text-xl font-bold text-foreground leading-tight">{supportData.warranty}</p>
                  </div>
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/10">
                    <ShieldCheck className="w-4.5 h-4.5 text-secondary" />
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  <span className="font-medium opacity-80">{Math.round((supportData.warranty / (supportData.total || 1)) * 100)}% de los casos totales</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border overflow-hidden group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Duración Media</p>
                    <p className="text-xl font-bold text-foreground leading-tight">{supportData.avgDuration} min</p>
                  </div>
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10">
                    <Clock className="w-4.5 h-4.5 text-accent" />
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  <span className="font-medium opacity-80">Tiempo de resolución estimado</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border overflow-hidden group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Productos con Incidencia</p>
                    <p className="text-xl font-bold text-foreground leading-tight">{supportData.totalProductsWithIncidents}</p>
                  </div>
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/10">
                    <Boxes className="w-4.5 h-4.5 text-destructive" />
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  <span className="font-medium opacity-80">Total unidades involucradas</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="py-3 px-4 border-b border-border/50">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground opacity-80 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" />
                  Artículos más utilizados (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supportData?.topArticlesData || []} layout="vertical" margin={{ left: 60, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} className="stroke-muted/30" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={120} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '11px' }} />
                      <Bar dataKey="value" name="Cantidad" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={15}>
                        {(supportData?.topArticlesData || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${1 - index * 0.05})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader className="py-3 px-4 border-b border-border/50">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground opacity-80 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  Incidencias por Provincia (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supportData?.provinceChartData || []} layout="vertical" margin={{ left: 40, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} className="stroke-muted/30" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '11px' }} />
                      <Bar dataKey="value" name="Asistencias" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} barSize={15} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="py-3 px-4 border-b border-border/50">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground opacity-80 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  Clientes con más Incidencias (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supportData?.topCustomersIncidentsData || []} layout="vertical" margin={{ left: 60, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} className="stroke-muted/30" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={120} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '11px' }} />
                      <Bar dataKey="value" name="Incidencias" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} barSize={15}>
                        {supportData?.topCustomersIncidentsData?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={`hsl(var(--secondary) / ${1 - index * 0.05})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader className="py-3 px-4 border-b border-border/50">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground opacity-80 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Tipos de Incidencia
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supportData?.typeChartData || []} margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '11px' }} />
                      <Bar dataKey="value" name="Cantidad" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="py-2 px-4 border-b border-border/50 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground opacity-80 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Evolución Mensual de Incidencias ({supportYear})
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-medium">AÑO:</span>
                <Select value={supportYear} onValueChange={setSupportYear}>
                  <SelectTrigger className="h-7 w-[80px] text-[10px] border-border/50 bg-muted/20">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSupportYears.map(year => (
                      <SelectItem key={year} value={year} className="text-[10px]">
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supportMonthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '11px' }} />
                    <Bar dataKey="value" name="Incidencias" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
