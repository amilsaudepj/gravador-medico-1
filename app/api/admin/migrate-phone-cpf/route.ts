import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * API para migrar telefones e CPFs de checkout_attempts para sales
 * Resolve o problema de vendas sem telefone
 */
export async function POST() {
  try {
    console.log('🔄 [MIGRATE] Iniciando migração de telefones e CPFs...')

    // 1️⃣ BUSCAR VENDAS SEM TELEFONE
    const { data: salesWithoutPhone, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('id, customer_email, appmax_order_id, customer_phone, customer_cpf')
      .or('customer_phone.is.null,customer_phone.eq.')
      .in('status', ['paid', 'provisioning', 'active'])

    if (salesError) {
      console.error('❌ Erro ao buscar vendas:', salesError)
      return NextResponse.json({ error: salesError.message }, { status: 500 })
    }

    console.log(`📊 Encontradas ${salesWithoutPhone?.length || 0} vendas sem telefone`)

    if (!salesWithoutPhone || salesWithoutPhone.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma venda precisa de atualização',
        updated: 0
      })
    }

    // 2️⃣ BUSCAR DADOS EM CHECKOUT_ATTEMPTS
    const emails = salesWithoutPhone.map(s => s.customer_email)
    const { data: checkoutData, error: checkoutError } = await supabaseAdmin
      .from('checkout_attempts')
      .select('customer_email, customer_phone, customer_cpf, appmax_order_id')
      .in('customer_email', emails)
      .not('customer_phone', 'is', null)

    if (checkoutError) {
      console.error('❌ Erro ao buscar checkout:', checkoutError)
      return NextResponse.json({ error: checkoutError.message }, { status: 500 })
    }

    console.log(`📞 Encontrados ${checkoutData?.length || 0} registros com telefone no checkout`)

    // 3️⃣ CRIAR MAPA DE DADOS
    const dataMap = new Map<string, { phone?: string, cpf?: string }>()
    
    checkoutData?.forEach(checkout => {
      const key = checkout.customer_email
      if (!dataMap.has(key) && checkout.customer_phone) {
        dataMap.set(key, {
          phone: checkout.customer_phone,
          cpf: checkout.customer_cpf
        })
      }
    })

    // 4️⃣ ATUALIZAR VENDAS
    let updated = 0
    const updates = []

    for (const sale of salesWithoutPhone) {
      const data = dataMap.get(sale.customer_email)
      if (data?.phone) {
        updates.push({
          id: sale.id,
          customer_phone: data.phone,
          customer_cpf: data.cpf || sale.customer_cpf
        })
      }
    }

    console.log(`🔄 Preparando ${updates.length} atualizações...`)

    // Executar updates em lotes
    for (const update of updates) {
      const { error: updateError } = await supabaseAdmin
        .from('sales')
        .update({
          customer_phone: update.customer_phone,
          customer_cpf: update.customer_cpf,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id)

      if (!updateError) {
        updated++
      } else {
        console.error(`❌ Erro ao atualizar ${update.id}:`, updateError)
      }
    }

    console.log(`✅ Migração concluída: ${updated} vendas atualizadas`)

    return NextResponse.json({
      success: true,
      message: `Migração concluída com sucesso`,
      total_sem_telefone: salesWithoutPhone.length,
      dados_encontrados: updates.length,
      atualizados: updated
    })

  } catch (error) {
    console.error('❌ [MIGRATE] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao migrar dados' },
      { status: 500 }
    )
  }
}

// GET: Status da migração
export async function GET() {
  try {
    const { data: stats, error } = await supabaseAdmin
      .from('sales')
      .select('customer_phone, customer_cpf, status')
      .in('status', ['paid', 'provisioning', 'active'])

    if (error) throw error

    const semTelefone = stats?.filter(s => !s.customer_phone || s.customer_phone === '').length || 0
    const semCPF = stats?.filter(s => !s.customer_cpf || s.customer_cpf === '').length || 0
    const total = stats?.length || 0

    return NextResponse.json({
      total_vendas: total,
      sem_telefone: semTelefone,
      sem_cpf: semCPF,
      percentual_completo: total > 0 ? Math.round(((total - semTelefone) / total) * 100) : 0
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar stats' }, { status: 500 })
  }
}
