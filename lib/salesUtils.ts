/**
 * =============================================
 * UTILITÁRIO DE VENDAS - SIMPLIFICADO
 * =============================================
 * Busca vendas da tabela correta (checkout_attempts)
 * Usa coluna correta (total_amount)
 * =============================================
 */

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Função legada consertada para usar a nova estrutura
 * Usado por páginas antigas que ainda não foram migradas para dashboard-queries.ts
 */
export async function fetchSalesWithFallback(
  supabase: SupabaseClient,
  startDate: Date,
  endDate: Date
) {
  try {
    // Agora busca 'total_amount' em vez de 'amount' ou 'cart_value'
    const { data, error } = await supabase
      .from('checkout_attempts')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error

    console.log('✅ Vendas encontradas:', data?.length || 0)
    return data || []
  } catch (error) {
    console.error('❌ Erro ao buscar vendas (salesUtils):', error)
    return [] // Retorna vazio em vez de mock para evitar confusão
  }
}

/**
 * Filtra vendas aprovadas (aceita múltiplos status)
 */
export function filterApprovedSales(sales: any[]) {
  return sales.filter(s => 
    s.status === 'approved' || 
    s.status === 'paid' || 
    s.status === 'completed'
  )
}

/**
 * Calcula métricas de vendas
 */
export function calculateSalesMetrics(sales: any[]) {
  const approvedSales = filterApprovedSales(sales)
  
  const totalRevenue = approvedSales.reduce(
    (sum, s) => sum + Number(s.total_amount || 0), 
    0
  )
  
  const totalOrders = approvedSales.length
  
  const uniqueEmails = new Set(approvedSales.map(s => s.customer_email).filter(Boolean))
  const totalCustomers = uniqueEmails.size
  
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0
  
  return {
    totalRevenue,
    totalOrders,
    totalCustomers,
    averageTicket,
    approvedSales
  }
}

/**
 * Calcula crescimento percentual entre dois períodos
 */
export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - previous) / previous) * 100
}

/**
 * Helpers de formatação
 */
export const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const formatPercentage = (value: number) => 
  `${value.toFixed(1)}%`
