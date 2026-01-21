/**
 * =============================================
 * UTILITÁRIO DE DATAS E BUSCA DE VENDAS
 * =============================================
 * Centraliza lógica de normalização de datas UTC
 * e busca de vendas com fallback automático
 * =============================================
 */

import { supabase } from './supabase'

/**
 * Normaliza datas para UTC Start/End of day
 * Evita problemas de timezone
 */
export function normalizeUTCDates(startDate: string, endDate: string) {
  const startIso = `${startDate}T00:00:00.000Z`
  const endIso = `${endDate}T23:59:59.999Z`
  
  return { startIso, endIso }
}

/**
 * Busca vendas com filtro de data E fallback automático
 * Se o filtro retornar vazio OU falhar, busca todas as vendas
 * ATUALIZADO: Usa checkout_attempts ao invés de sales
 */
export async function fetchSalesWithFallback(
  startDate: string,
  endDate: string,
  options: {
    limit?: number
    orderBy?: 'created_at' | 'updated_at'
    orderDirection?: 'asc' | 'desc'
  } = {}
) {
  const { limit, orderBy = 'created_at', orderDirection = 'desc' } = options
  const { startIso, endIso } = normalizeUTCDates(startDate, endDate)
  
  console.log('📅 Buscando vendas:', { startDate, endDate, startIso, endIso })
  
  // Tentativa 1: Buscar com filtro de data na tabela correta
  let query = supabase
    .from('checkout_attempts')
    .select('*')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order(orderBy, { ascending: orderDirection === 'asc' })
  
  if (limit) {
    query = query.limit(limit)
  }
  
  const { data: filteredSales, error } = await query
  
  // Se falhou OU retornou vazio, fazer fallback
  if (error || !filteredSales || filteredSales.length === 0) {
    console.warn('⚠️ Filtro de data falhou ou retornou vazio. Usando fallback (todas as vendas)')
    
    const fallbackQuery = supabase
      .from('checkout_attempts')
      .select('*')
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .limit(limit || 100) // Limitar fallback para evitar overload
    
    const { data: fallbackSales, error: fallbackError } = await fallbackQuery
    
    if (fallbackError) {
      console.error('❌ Erro no fallback:', fallbackError)
      return { data: [], error: fallbackError, usedFallback: true }
    }
    
    console.log('✅ Fallback retornou:', fallbackSales?.length || 0, 'vendas')
    return { data: fallbackSales || [], error: null, usedFallback: true }
  }
  
  console.log('✅ Filtro retornou:', filteredSales.length, 'vendas')
  return { data: filteredSales, error: null, usedFallback: false }
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
    (sum, s) => sum + Number(s.final_amount || s.total_amount || 0), 
    0
  )
  
  const totalOrders = approvedSales.length
  
  const uniqueEmails = new Set(approvedSales.map(s => s.customer_email))
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
 * Formata valor monetário BRL
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Formata porcentagem
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}
