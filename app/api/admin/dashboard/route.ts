import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { getUnifiedDashboardData } from '@/lib/analytics-hub'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const daysParam = Number.parseInt(searchParams.get('days') || '', 10)
    const days = Number.isFinite(daysParam) ? daysParam : 30

    // Calcular período
    let startDate: Date
    let endDate: Date
    let label: string

    if (start && end) {
      // Modo custom: datas específicas
      startDate = new Date(start)
      endDate = new Date(end)
      label = `${startDate.toLocaleDateString('pt-BR')} até ${endDate.toLocaleDateString('pt-BR')}`
    } else {
      // Modo quick: últimos N dias
      endDate = new Date()
      endDate.setHours(23, 59, 59, 999)
      
      startDate = new Date()
      if (days === 0) {
        // Hoje
        startDate.setHours(0, 0, 0, 0)
        label = 'Hoje'
      } else if (days === 1) {
        // Ontem
        startDate.setDate(startDate.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setHours(23, 59, 59, 999)
        label = 'Ontem'
      } else {
        startDate.setDate(startDate.getDate() - days)
        startDate.setHours(0, 0, 0, 0)
        label = `Últimos ${days} dias`
      }
    }

    console.log(`📊 [Dashboard API] Período: ${label}`)
    console.log(`📊 [Dashboard API] Start: ${startDate.toISOString()}`)
    console.log(`📊 [Dashboard API] End: ${endDate.toISOString()}`)

    // 🎯 USAR O HUB UNIFICADO
    const dashboardData = await getUnifiedDashboardData(
      { startDate, endDate, label },
      { includeRealtime: true, includeMeta: true, includeGA4: true }
    )

    // Transformar para formato esperado pelo frontend atual
    // (manter compatibilidade com componentes existentes)
    const response = {
      metrics: {
        revenue: dashboardData.financial.totalRevenue,
        sales: dashboardData.financial.totalSales,
        unique_visitors: dashboardData.traffic.visitors,
        average_order_value: dashboardData.financial.avgTicket,
        conversion_rate: dashboardData.kpis.conversionRateReal,
        // Variações
        revenue_change: dashboardData.kpis.changes.revenue,
        sales_change: dashboardData.kpis.changes.sales,
        visitors_change: dashboardData.kpis.changes.visitors,
      },
      chartData: dashboardData.financial.salesByDay.map((day: any) => ({
        date: day.date,
        amount: day.revenue || 0,
        sales: day.sales || 0,
      })),
      funnelData: dashboardData.funnel.stages,
      operationalHealth: {
        gateway_success_rate: 100, // TODO: implementar se necessário
        email_delivery_rate: 100,
        webhook_success_rate: 100,
      },
      // Dados adicionais do hub
      investment: dashboardData.investment,
      kpis: dashboardData.kpis,
      integrations: dashboardData.integrations,
      errors: dashboardData.errors.length > 0 ? {
        hub: dashboardData.errors.join('; ')
      } : {}
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ [Dashboard API] Erro ao carregar dashboard:', error)
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 })
  }
}
