/**
 * =============================================
 * DASHBOARD QUERIES - REFATORADO
 * =============================================
 * Queries otimizadas que leem diretamente das Views SQL
 * Removida toda lógica de cálculo manual no frontend
 * 
 * Views utilizadas:
 * - analytics_health (métricas principais)
 * - marketing_attribution (vendas por fonte)
 * - product_performance (top produtos)
 * - analytics_visitors_online (visitantes ao vivo)
 * =============================================
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  AnalyticsHealth,
  MarketingAttribution,
  ProductPerformance,
  AnalyticsVisitorsOnline,
  AnalyticsFunnel,
  QueryResponse,
  QueryArrayResponse,
  DateRange
} from './types/analytics'

// ========================================
// 3. Fetch: Clientes com métricas
// ========================================
export async function fetchCustomersWithMetrics(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
) {
  try {
    const { startIso, endIso } = createDateRange(startDate, endDate)
    
    // Opção 1: Usar a view (mais rápido)
    const { data: customers, error } = await supabase
      .from('customer_sales_summary')
      .select('*')
      .order('total_spent', { ascending: false })
    
    if (error) throw error
    
    // Filtrar por período (se a view não suportar)
    const filtered = customers?.filter(customer => {
      if (!customer.last_purchase_at) return false
      const lastPurchase = new Date(customer.last_purchase_at)
      return lastPurchase >= new Date(startIso) && lastPurchase <= new Date(endIso)
    })
    
    return { data: filtered || [], error: null }
    
  } catch (error) {
    console.error('❌ Erro ao buscar clientes:', error)
    return { data: [], error }
  }
}

// ========================================
// 4. Fetch: Produtos com métricas
// ========================================
export async function fetchProductsWithMetrics(
  supabase: SupabaseClient,
  startDate?: string,
  endDate?: string
) {
  try {
    // Usar a view analítica
    const { data: products, error } = await supabase
      .from('product_sales_summary')
      .select('*')
      .order('total_revenue', { ascending: false })
    
    if (error) throw error
    
    return { data: products || [], error: null }
    
  } catch (error) {
    console.error('❌ Erro ao buscar produtos:', error)
    return { data: [], error }
  }
}

// ========================================
// 5. Fetch: Funil CRM
// ========================================
export async function fetchCRMFunnel(
  supabase: SupabaseClient
) {
  try {
    // Usar a view analítica
    const { data: funnel, error } = await supabase
      .from('crm_funnel_summary')
      .select('*')
    
    if (error) throw error
    
    return { data: funnel || [], error: null }
    
  } catch (error) {
    console.error('❌ Erro ao buscar funil CRM:', error)
    return { data: [], error }
  }
}

// ========================================
// 5.1 Fetch: Atividades CRM de um contato
// ========================================
export async function fetchCRMActivities(
  supabase: SupabaseClient,
  contactId?: string,
  limit: number = 50
) {
  try {
    let query = supabase
      .from('crm_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (contactId) {
      query = query.eq('contact_id', contactId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return { data: data || [], error: null }
    
  } catch (error) {
    console.error('❌ Erro ao buscar atividades CRM:', error)
    return { data: [], error }
  }
}

// ========================================
// 6. Fetch: Contatos CRM com filtros
// ========================================
export async function fetchCRMContacts(
  supabase: SupabaseClient,
  filters?: {
    stage?: string
    source?: string
    search?: string
  }
) {
  try {
    let query = supabase
      .from('crm_contacts')
      .select(`
        *,
        customer:customers(name, email, phone)
      `)
      .order('created_at', { ascending: false })
    
    if (filters?.stage) {
      query = query.eq('stage', filters.stage)
    }
    
    if (filters?.source) {
      query = query.eq('source', filters.source)
    }
    
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return { data: data || [], error: null }
    
  } catch (error) {
    console.error('❌ Erro ao buscar contatos CRM:', error)
    return { data: [], error }
  }
}

// ========================================
// 7. Fetch: Vendas por dia (relatórios)
// ========================================
export async function fetchSalesByDay(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
) {
  try {
    const { startIso, endIso } = createDateRange(startDate, endDate)
    
    const { data, error } = await supabase
      .from('sales_by_day')
      .select('*')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .order('sale_date', { ascending: true })
    
    if (error) throw error
    
    return { data: data || [], error: null }
    
  } catch (error) {
    console.error('❌ Erro ao buscar vendas por dia:', error)
    return { data: [], error }
  }
}

// ========================================
// 1. FETCH: Métricas Principais do Dashboard (USANDO VIEW)
// ========================================
/**
 * Busca as métricas principais da view analytics_health
 * Inclui comparação automática com período anterior (últimos 30 dias vs 30 dias anteriores)
 */
export async function fetchDashboardMetrics(
  supabase: SupabaseClient
): Promise<{ data: any; error: any }> {
  try {
    const { data, error } = await supabase
      .from('analytics_health')
      .select('*')
      .single()

    if (error) {
      console.error('❌ Erro ao buscar métricas do dashboard:', error)
      return {
        data: {
          unique_visitors: 0,
          sales: 0,
          revenue: 0,
          average_order_value: 0,
          avg_time_seconds: 0,
          conversion_rate: 0,
          visitors_change: 0,
          revenue_change: 0,
          aov_change: 0,
          time_change: 0
        },
        error
      }
    }

    return { data, error: null }
  } catch (error) {
    console.error('❌ Exceção ao buscar métricas do dashboard:', error)
    return {
      data: {
        unique_visitors: 0,
        sales: 0,
        revenue: 0,
        average_order_value: 0,
        avg_time_seconds: 0,
        conversion_rate: 0,
        visitors_change: 0,
        revenue_change: 0,
        aov_change: 0,
        time_change: 0
      },
      error
    }
  }
}

// ========================================
// 2. FETCH: Top Produtos (USANDO VIEW)
// ========================================
/**
 * Busca os produtos com melhor performance da view otimizada
 * Ordenados por receita total
 */
export async function fetchTopProducts(
  supabase: SupabaseClient,
  limit: number = 5
): Promise<{ data: any[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('product_performance')
      .select('*')
      .order('total_revenue', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ Erro ao buscar top produtos:', error)
      return { data: [], error }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error('❌ Exceção ao buscar top produtos:', error)
    return { data: [], error }
  }
}

// ========================================
// 3. FETCH: Vendas por Fonte (USANDO VIEW)
// ========================================
/**
 * Busca dados de atribuição de marketing da view otimizada
 * Retorna tráfego, conversões e receita por fonte/meio/campanha
 */
export async function fetchSalesBySource(
  supabase: SupabaseClient,
  limit: number = 10
): Promise<{ data: any[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('marketing_attribution')
      .select('*')
      .order('total_revenue', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ Erro ao buscar vendas por fonte:', error)
      return { data: [], error }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error('❌ Exceção ao buscar vendas por fonte:', error)
    return { data: [], error }
  }
}

// ========================================
// HELPER: Criar range de datas UTC
// ========================================
export function createDateRange(startDate: string, endDate: string) {
  const startIso = `${startDate}T00:00:00.000Z`
  const endIso = `${endDate}T23:59:59.999Z`
  
  return { startIso, endIso }
}

// ========================================
// 4. FETCH: Visitantes Online (Realtime)
// ========================================
/**
 * Busca o número de visitantes online agora (últimos 5 minutos)
 * View atualizada automaticamente
 */
export async function fetchVisitorsOnline(
  supabase: SupabaseClient
): Promise<{ data: any; error: any }> {
  try {
    const { data, error } = await supabase
      .from('analytics_visitors_online')
      .select('*')
      .single()

    if (error) {
      console.error('❌ Erro ao buscar visitantes online:', error)
      return { 
        data: { 
          online_count: 0, 
          mobile_count: 0, 
          desktop_count: 0,
          tablet_count: 0
        }, 
        error 
      }
    }

    return { data, error: null }
  } catch (error) {
    console.error('❌ Exceção ao buscar visitantes online:', error)
    return { 
      data: { 
        online_count: 0, 
        mobile_count: 0, 
        desktop_count: 0,
        tablet_count: 0
      }, 
      error 
    }
  }
}

// ========================================
// 5. FETCH: Funil de Conversão
// ========================================
/**
 * Busca métricas do funil de conversão (visitantes → compra)
 */
export async function fetchConversionFunnel(
  supabase: SupabaseClient
): Promise<{ data: any; error: any }> {
  try {
    const { data, error } = await supabase
      .from('analytics_funnel')
      .select('*')
      .single()

    if (error) {
      console.error('❌ Erro ao buscar funil de conversão:', error)
      return { 
        data: {
          step_visitors: 0,
          step_interested: 0,
          step_checkout_started: 0,
          step_purchased: 0
        }, 
        error 
      }
    }

    return { data, error: null }
  } catch (error) {
    console.error('❌ Exceção ao buscar funil de conversão:', error)
    return { 
      data: {
        step_visitors: 0,
        step_interested: 0,
        step_checkout_started: 0,
        step_purchased: 0
      }, 
      error 
    }
  }
}
