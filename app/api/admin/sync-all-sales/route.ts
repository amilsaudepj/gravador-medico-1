import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos para sync completo

/**
 * API para sincronizar TODAS as vendas do AppMax
 * Útil para recuperar dados após problemas ou migrações
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [SYNC ALL] Iniciando sincronização completa...')

    // 1️⃣ Buscar todas as vendas aprovadas do AppMax
    const appmaxApiKey = process.env.APPMAX_TOKEN || process.env.APPMAX_API_KEY
    const appmaxBaseUrl = process.env.APPMAX_BASE_URL || 'https://api.appmax.com.br/v1'

    if (!appmaxApiKey) {
      return NextResponse.json(
        { error: 'AppMax API Key não configurada' },
        { status: 500 }
      )
    }

    console.log('📡 Buscando vendas do AppMax...')

    // Buscar com filtro de status aprovado
    const response = await fetch(`${appmaxBaseUrl}/orders?status=approved&limit=1000`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${appmaxApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`AppMax API error: ${response.status}`)
    }

    const data = await response.json()
    const orders = data.data || []

    console.log(`📊 ${orders.length} vendas encontradas no AppMax`)

    // 2️⃣ Buscar vendas existentes no Supabase
    const { data: existingSales, error: fetchError } = await supabaseAdmin
      .from('sales')
      .select('appmax_order_id')

    if (fetchError) {
      throw new Error(`Erro ao buscar vendas existentes: ${fetchError.message}`)
    }

    const existingOrderIds = new Set(existingSales?.map(s => s.appmax_order_id) || [])

    // 3️⃣ Identificar vendas novas
    const newOrders = orders.filter((order: any) => !existingOrderIds.has(order.id.toString()))

    console.log(`✨ ${newOrders.length} vendas novas para sincronizar`)

    if (newOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todas as vendas já estão sincronizadas',
        total: orders.length,
        existing: existingSales?.length || 0,
        new: 0
      })
    }

    // 4️⃣ Inserir vendas novas
    const salesToInsert = newOrders.map((order: any) => ({
      appmax_order_id: order.id.toString(),
      customer_name: order.customer?.name || 'Nome não informado',
      customer_email: order.customer?.email || 'email@unknown.com',
      customer_phone: order.customer?.phone || null,
      customer_cpf: order.customer?.document || null,
      total_amount: parseFloat(order.total_amount || '0'),
      status: 'paid', // AppMax já filtrou por approved
      payment_method: order.payment_method || 'unknown',
      payment_gateway: 'appmax',
      created_at: order.created_at || new Date().toISOString(),
      utm_source: order.utm_source || null,
      utm_medium: order.utm_medium || null,
      utm_campaign: order.utm_campaign || null,
    }))

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('sales')
      .insert(salesToInsert)
      .select()

    if (insertError) {
      console.error('❌ Erro ao inserir vendas:', insertError)
      throw new Error(`Erro ao inserir vendas: ${insertError.message}`)
    }

    console.log(`✅ ${inserted?.length || 0} vendas sincronizadas com sucesso!`)

    return NextResponse.json({
      success: true,
      message: `${inserted?.length || 0} vendas sincronizadas com sucesso!`,
      total: orders.length,
      existing: existingSales?.length || 0,
      new: inserted?.length || 0
    })

  } catch (error: any) {
    console.error('❌ [SYNC ALL] Erro:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao sincronizar vendas' },
      { status: 500 }
    )
  }
}
