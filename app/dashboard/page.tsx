'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { startOfMonth, subMonths } from 'date-fns'
import { KPIGrid } from '@/components/dashboard/kpi-grid'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { CustomerValueChart } from '@/components/dashboard/customer-value-chart'
import { NotificationsCard } from '@/components/dashboard/notifications-card'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Profile, Offer } from '@/lib/types/database'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSensitiveVisible, setIsSensitiveVisible] = useState(false)
  
  const [dashboardData, setDashboardData] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    async function fetchDashboardData() {
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

      // Define roles to filter data for
      // Handle both backend types (sales_rep, support_agent) and potential localized strings
      const role = profileData?.role?.toLowerCase() || ''
      const isSensitiveRole = ['sales_rep', 'vendedor', 'support_agent', 'support', 'soporte', 'technical_support'].includes(role)

      const now = new Date()
      const currentYearStart = new Date(now.getFullYear(), 0, 1).toISOString()
      const thisMonthStart = startOfMonth(now).toISOString()
      const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString()

      // Fetch Offer Assignments first to include them in queries if needed
      let assignedOfferIds: number[] = []
      if (isSensitiveRole) {
        const { data: assignments } = await supabase
          .from('offer_assignments')
          .select('offer_id')
          .eq('assigned_to', user.id)
        
        assignedOfferIds = assignments?.map(a => a.offer_id) || []
      }

      const userFilterOR = `created_by.eq.${user.id},assigned_to.eq.${user.id}`
      const offerFilterOR = assignedOfferIds.length > 0 
        ? `created_by.eq.${user.id},id.in.(${assignedOfferIds.join(',')})`
        : `created_by.eq.${user.id}`

      // 1. Fetch KPI basic counts & Breakdown
      let customersQuery = supabase.from('customers').select('*', { count: 'exact', head: true })
      let offersQuery = supabase.from('offers').select('*', { count: 'exact', head: true })

      // Specific breakdowns for customers
      let instaladoresQuery = supabase.from('customers').select('*', { count: 'exact', head: true }).ilike('industry', '%instalador%')
      let distribuidoresQuery = supabase.from('customers').select('*', { count: 'exact', head: true }).ilike('industry', '%distribuidor%')

      if (isSensitiveRole) {
        // Customers: created by or assigned to
        customersQuery = customersQuery.or(userFilterOR)
        instaladoresQuery = instaladoresQuery.or(userFilterOR)
        distribuidoresQuery = distribuidoresQuery.or(userFilterOR)
        
        // Offers: created by or assigned to
        offersQuery = offersQuery.or(offerFilterOR)
      }

      // 2. Fetch Offers for Month-over-Month comparison
      let offersMonthQuery = supabase
        .from('offers')
        .select('created_at, total_amount')
        .gte('created_at', lastMonthStart)

      if (isSensitiveRole) {
        offersMonthQuery = offersMonthQuery.or(offerFilterOR)
      }

      // 3. Fetch all offers from current year for Amount Breakdown and Customer Value Chart
      let offersYearQuery = supabase
        .from('offers')
        .select('status, total_amount, customer:customers(company_name)')
        .gte('created_at', currentYearStart)

      if (isSensitiveRole) {
        offersYearQuery = offersYearQuery.or(offerFilterOR)
      }

      // 4. Fetch Recent Offers (top 10)
      let recentOffersQuery = supabase
        .from('offers')
        .select('*, customer:customers(company_name)')
        .order('created_at', { ascending: false })
        .limit(10)

      if (isSensitiveRole) {
        recentOffersQuery = recentOffersQuery.or(offerFilterOR)
      }

      // 5. Fetch Recent Notifications (top 10)
      const notificationsQuery = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      const results = await Promise.all([
        customersQuery,
        offersQuery,
        offersMonthQuery,
        offersYearQuery,
        recentOffersQuery,
        notificationsQuery,
        instaladoresQuery,
        distribuidoresQuery,
      ])

      const [
        customersCountRes,
        offersCountRes,
        offersMonthRes,
        offersYearRes,
        recentOffersRes,
        notificationsRes,
        instaladoresRes,
        distribuidoresRes
      ] = results

      // --- Process Month-over-Month KPI ---
      const offersMonthData = offersMonthRes.data || []
      const currentMonthOffers = offersMonthData.filter(o => o.created_at >= thisMonthStart)
      const lastMonthOffers = offersMonthData.filter(o => o.created_at < thisMonthStart && o.created_at >= lastMonthStart)
      
      const countCurrent = currentMonthOffers.length
      const countLast = lastMonthOffers.length
      const totalAmountCurrentMonth = currentMonthOffers.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const percentageChange = countLast === 0 ? (countCurrent > 0 ? 100 : 0) : ((countCurrent - countLast) / countLast) * 100

      // --- Process Amount Breakdown and Customer Chart Data ---
      const offersYearData = offersYearRes.data || []
      const breakdown = {
        borrador: 0,
        enviada: 0,
        aceptada: 0,
        rechazada: 0,
      }
      let totalAmountYear = 0

      offersYearData.forEach(offer => {
        const status = offer.status as keyof typeof breakdown
        if (status in breakdown) {
          breakdown[status] += offer.total_amount || 0
          totalAmountYear += offer.total_amount || 0
        }
      })

      // Customer Value Data
      const totalCustomers = customersCountRes.count || 0
      const instaladoresCount = instaladoresRes.count || 0
      const distribuidoresCount = distribuidoresRes.count || 0

      // Add is_assigned flag to recent offers
      const recentOffers = (recentOffersRes.data || []).map((o: any) => ({
        ...o,
        is_assigned: assignedOfferIds.includes(o.id)
      }))

      console.log('Role:', role, 'User ID:', user.id, 'Assigned Offers:', assignedOfferIds)

      setDashboardData({
        customersCount: totalCustomers,
        customersBreakdown: {
          total: totalCustomers,
          instalador: instaladoresCount,
          distribuidor: distribuidoresCount,
          otros: Math.max(0, totalCustomers - (instaladoresCount + distribuidoresCount)),
        },
        offersCount: offersCountRes.count || 0,
        offersLastMonth: {
          count: countCurrent,
          amount: totalAmountCurrentMonth,
          percentageChange: percentageChange,
        },
        totalOffersAmount: {
          total: totalAmountYear,
          breakdown: breakdown,
        },
        offersYearData,
        recentOffers,
        notifications: notificationsRes.data || []
      })
      
      setIsLoading(false)
    }

    fetchDashboardData()
  }, [])

  if (isLoading || !profile || !dashboardData) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-3 p-1">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-bold text-foreground">Panel de Control</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-tight opacity-70">
            {['admin', 'manager'].includes(profile.role) ? 'Métricas de organización' : 'Mis métricas y seguimiento'}
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

      <KPIGrid
        isSensitiveVisible={isSensitiveVisible}
        customersBreakdown={dashboardData.customersBreakdown}
        offersCount={dashboardData.offersCount}
        offersLastMonth={dashboardData.offersLastMonth}
        totalOffersAmount={dashboardData.totalOffersAmount}
        role={profile.role}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        <div className="lg:col-span-4 h-full">
          <RecentActivity
            isSensitiveVisible={isSensitiveVisible}
            title="Ofertas recientes"
            initialOffers={dashboardData.recentOffers}
          />
        </div>

        <div className="lg:col-span-4 h-full">
          <CustomerValueChart 
            isSensitiveVisible={isSensitiveVisible}
            offers={dashboardData.offersYearData} 
          />
        </div>

        <div className="lg:col-span-4 h-full">
          <NotificationsCard 
            notifications={dashboardData.notifications}
            isSensitiveVisible={isSensitiveVisible}
          />
        </div>
      </div>
    </div>
  )
}
