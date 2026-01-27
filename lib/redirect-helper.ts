/**
 * ============================================
 * 🔄 REDIRECT HELPER - PÁGINA DE OBRIGADO
 * ============================================
 * Sistema para gerar URLs de redirecionamento
 * após confirmação de pagamento via webhook
 * ============================================
 */

import { supabaseAdmin } from './supabase'

export interface RedirectUrlParams {
  orderId: string
  customerEmail: string
  customerName?: string
  paymentMethod?: string
  amount?: number
  status: 'paid' | 'approved' | 'completed'
}

/**
 * Gera URL da página de obrigado com parâmetros
 */
export function generateThankYouUrl(params: RedirectUrlParams): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  const url = new URL('/obrigado', baseUrl)
  url.searchParams.set('order_id', params.orderId)
  url.searchParams.set('email', params.customerEmail)
  
  if (params.customerName) {
    url.searchParams.set('name', params.customerName)
  }
  
  if (params.paymentMethod) {
    url.searchParams.set('payment', params.paymentMethod)
  }
  
  if (params.amount) {
    url.searchParams.set('amount', params.amount.toString())
  }
  
  // Token de segurança (opcional - evita acesso direto)
  const token = Buffer.from(
    `${params.orderId}:${params.customerEmail}:${Date.now()}`
  ).toString('base64url')
  
  url.searchParams.set('t', token)
  
  return url.toString()
}

/**
 * Salva URL de redirecionamento no pedido
 */
export async function saveRedirectUrl(
  orderId: string, 
  redirectUrl: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ 
        redirect_url: redirectUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
    
    if (error) {
      console.error(`[${orderId}] ❌ Erro ao salvar redirect_url:`, error)
      return false
    }
    
    console.log(`[${orderId}] ✅ Redirect URL salva: ${redirectUrl}`)
    return true
  } catch (error) {
    console.error(`[${orderId}] ❌ Exceção ao salvar redirect_url:`, error)
    return false
  }
}

/**
 * Cria URL de redirecionamento e salva no banco
 */
export async function createAndSaveRedirectUrl(
  params: RedirectUrlParams
): Promise<string | null> {
  try {
    const redirectUrl = generateThankYouUrl(params)
    const saved = await saveRedirectUrl(params.orderId, redirectUrl)
    
    if (saved) {
      console.log(`[${params.orderId}] 🔄 Redirect URL criada: ${redirectUrl}`)
      return redirectUrl
    }
    
    return null
  } catch (error) {
    console.error(`[${params.orderId}] ❌ Erro ao criar redirect URL:`, error)
    return null
  }
}

/**
 * Busca URL de redirecionamento salva no pedido
 */
export async function getOrderRedirectUrl(orderId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('redirect_url')
      .eq('id', orderId)
      .single()
    
    if (error || !data?.redirect_url) {
      return null
    }
    
    return data.redirect_url
  } catch (error) {
    console.error(`[${orderId}] ❌ Erro ao buscar redirect_url:`, error)
    return null
  }
}

/**
 * Verifica se o token da URL é válido
 * (Proteção básica contra acesso direto)
 */
export function validateRedirectToken(
  token: string, 
  orderId: string, 
  email: string
): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const [tokenOrderId, tokenEmail, tokenTimestamp] = decoded.split(':')
    
    // Verificar se order_id e email correspondem
    if (tokenOrderId !== orderId || tokenEmail !== email) {
      return false
    }
    
    // Token válido por 24 horas
    const timestamp = parseInt(tokenTimestamp, 10)
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 horas
    
    return (now - timestamp) < maxAge
  } catch (error) {
    console.error('❌ Erro ao validar token:', error)
    return false
  }
}
