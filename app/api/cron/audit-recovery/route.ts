import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// =====================================================
// 🛡️ AUDITOR DE CONSISTÊNCIA - RECOVERY AUTOMÁTICO
// =====================================================
// OBJETIVO: Encontrar vendas aprovadas que foram esquecidas
//           e não tiveram provisionamento iniciado
//
// EXECUÇÃO: Cron Job a cada 2 minutos
// =====================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('\n🔍 ========================================')
    console.log('🔍 AUDITOR DE CONSISTÊNCIA - Iniciando...')
    console.log('🔍 ========================================\n')

    // ============================================
    // VERIFICAÇÃO DE SEGURANÇA: Cron Secret
    // ============================================
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️ Tentativa de acesso não autorizado ao Auditor')
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // ============================================
    // 1️⃣ BUSCAR VENDAS APROVADAS NAS ÚLTIMAS 24H
    // ============================================
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: paidSales, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('id, customer_email, customer_name, total_amount, created_at, payment_method')
      .eq('status', 'paid')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })

    if (salesError) {
      console.error('❌ Erro ao buscar vendas aprovadas:', salesError)
      throw salesError
    }

    console.log(`📊 Vendas aprovadas encontradas (últimas 24h): ${paidSales?.length || 0}`)

    if (!paidSales || paidSales.length === 0) {
      console.log('✅ Nenhuma venda aprovada pendente. Sistema saudável! ✨')
      return NextResponse.json({
        success: true,
        message: 'Nenhuma venda pendente encontrada',
        stats: {
          checked: 0,
          recovered: 0,
          executionTime: Date.now() - startTime
        }
      })
    }

    // ============================================
    // 2️⃣ VERIFICAR CADA VENDA (CRUZAMENTO)
    // ============================================
    const forgottenSales = []
    
    for (const sale of paidSales) {
      // 🔍 Verificar se já está na fila de provisionamento
      const { data: queueEntry } = await supabaseAdmin
        .from('provisioning_queue')
        .select('id, status')
        .eq('sale_id', sale.id)
        .maybeSingle()

      if (queueEntry) {
        // ✅ Venda já está na fila (mesmo que failed, não vamos duplicar)
        continue
      }

      // 🔍 Verificar se já tem log de sucesso (email ou usuário criado)
      const { data: successLogs } = await supabaseAdmin
        .from('integration_logs')
        .select('id, action, status')
        .eq('sale_id', sale.id)
        .in('action', ['send_email', 'create_user'])
        .eq('status', 'success')
        .limit(1)

      if (successLogs && successLogs.length > 0) {
        // ✅ Venda já foi processada com sucesso
        continue
      }

      // 🚨 VENDA ESQUECIDA ENCONTRADA!
      forgottenSales.push(sale)
    }

    console.log(`\n🚨 Vendas esquecidas encontradas: ${forgottenSales.length}`)

    if (forgottenSales.length === 0) {
      console.log('✅ Todas as vendas aprovadas estão sendo processadas. Sistema saudável! ✨')
      return NextResponse.json({
        success: true,
        message: 'Todas as vendas estão na fila ou já processadas',
        stats: {
          checked: paidSales.length,
          recovered: 0,
          executionTime: Date.now() - startTime
        }
      })
    }

    // ============================================
    // 3️⃣ RECUPERAR VENDAS ESQUECIDAS
    // ============================================
    const recoveredSales = []
    const failedRecoveries = []

    for (const sale of forgottenSales) {
      try {
        console.log('\n🚨 ========================================')
        console.log(`🚨 VENDA ESQUECIDA DETECTADA!`)
        console.log(`🚨 ID: ${sale.id}`)
        console.log(`🚨 Cliente: ${sale.customer_name} (${sale.customer_email})`)
        console.log(`🚨 Valor: R$ ${sale.total_amount}`)
        console.log(`🚨 Criada em: ${new Date(sale.created_at).toLocaleString('pt-BR')}`)
        console.log(`🚨 Método: ${sale.payment_method}`)
        console.log('🚨 ========================================')

        // ✅ INSERIR NA FILA DE PROVISIONAMENTO
        const { data: queueInsert, error: insertError } = await supabaseAdmin
          .from('provisioning_queue')
          .insert({
            sale_id: sale.id,
            status: 'pending',
            retry_count: 0,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) {
          console.error(`❌ Erro ao enfileirar venda ${sale.id}:`, insertError)
          failedRecoveries.push({
            saleId: sale.id,
            error: insertError.message
          })
          continue
        }

        console.log(`✅ Venda ${sale.id} REENFILEIRADA com sucesso!`)
        
        // 📝 LOG DE AUDITORIA
        await supabaseAdmin
          .from('integration_logs')
          .insert({
            sale_id: sale.id,
            action: 'audit_recovery',
            status: 'success',
            details: {
              reason: 'Venda aprovada sem provisionamento iniciado',
              recovered_at: new Date().toISOString(),
              time_since_sale: Date.now() - new Date(sale.created_at).getTime()
            }
          })

        recoveredSales.push({
          saleId: sale.id,
          customerEmail: sale.customer_email,
          amount: sale.total_amount
        })

      } catch (error: any) {
        console.error(`❌ Erro ao recuperar venda ${sale.id}:`, error)
        failedRecoveries.push({
          saleId: sale.id,
          error: error.message
        })
      }
    }

    // ============================================
    // 4️⃣ RELATÓRIO FINAL
    // ============================================
    const executionTime = Date.now() - startTime
    
    console.log('\n✅ ========================================')
    console.log('✅ AUDITOR DE CONSISTÊNCIA - Concluído')
    console.log('✅ ========================================')
    console.log(`📊 Vendas verificadas: ${paidSales.length}`)
    console.log(`🚨 Vendas esquecidas: ${forgottenSales.length}`)
    console.log(`✅ Vendas recuperadas: ${recoveredSales.length}`)
    console.log(`❌ Falhas na recuperação: ${failedRecoveries.length}`)
    console.log(`⏱️ Tempo de execução: ${executionTime}ms`)
    console.log('✅ ========================================\n')

    return NextResponse.json({
      success: true,
      message: `Auditoria concluída: ${recoveredSales.length} vendas recuperadas`,
      stats: {
        checked: paidSales.length,
        forgotten: forgottenSales.length,
        recovered: recoveredSales.length,
        failed: failedRecoveries.length,
        executionTime
      },
      recoveredSales: recoveredSales.map(s => ({
        saleId: s.saleId,
        customerEmail: s.customerEmail,
        amount: s.amount
      })),
      failedRecoveries: failedRecoveries.length > 0 ? failedRecoveries : undefined
    })

  } catch (error: any) {
    console.error('\n❌ ========================================')
    console.error('❌ ERRO CRÍTICO NO AUDITOR')
    console.error('❌ ========================================')
    console.error(error)
    console.error('❌ ========================================\n')

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao executar auditoria',
        details: error.message
      },
      { status: 500 }
    )
  }
}

// Permitir POST também (Vercel Cron pode usar POST)
export async function POST(request: NextRequest) {
  return GET(request)
}
