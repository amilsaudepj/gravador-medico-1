/**
 * ============================================
 * 🔍 API: BUSCAR STATUS E REDIRECT URL
 * ============================================
 * Endpoint para verificar status do pedido
 * e obter URL de redirecionamento
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/order/status?order_id=xxx
 * Retorna status atual e redirect_url (se disponível)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'order_id é obrigatório' },
        { status: 400 }
      )
    }
    
    // Buscar pedido
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, status, redirect_url, customer_email, customer_name, total_amount, payment_method, created_at')
      .eq('id', orderId)
      .single()
    
    if (error || !order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }
    
    // Retornar status e URL
    return NextResponse.json({
      order_id: order.id,
      status: order.status,
      redirect_url: order.redirect_url || null,
      has_redirect: !!order.redirect_url,
      customer: {
        email: order.customer_email,
        name: order.customer_name
      },
      payment: {
        method: order.payment_method,
        amount: order.total_amount
      },
      created_at: order.created_at
    })
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar status do pedido:', error)
    
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: error.message
      },
      { status: 500 }
    )
  }
}
