import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processProvisioningQueue } from '@/lib/provisioning-worker'

// =====================================================
// API: Resincronizar Venda (Botão de Pânico)
// =====================================================
// Força a reinserção de uma venda na fila de provisionamento
// E PROCESSA IMEDIATAMENTE (cria usuário + envia email)
// =====================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { customerEmail, saleId } = await request.json()

    if (!customerEmail && !saleId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'É necessário informar o email do cliente ou ID da venda' 
        },
        { status: 400 }
      )
    }

    console.log('🔄 [RESYNC SALE] Iniciando resincronização...')
    console.log('📧 Email:', customerEmail)
    console.log('🆔 Sale ID:', saleId)

    // 1️⃣ BUSCAR VENDA NO BANCO
    let query = supabaseAdmin
      .from('sales')
      .select('id, customer_email, customer_name, status, total_amount')
      .in('status', ['paid', 'provisioning', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (saleId) {
      query = query.eq('id', saleId)
    } else if (customerEmail) {
      query = query.eq('customer_email', customerEmail)
    }

    const { data: sales, error: saleError } = await query

    if (saleError) {
      console.error('❌ Erro ao buscar venda:', saleError)
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar venda no banco' },
        { status: 500 }
      )
    }

    if (!sales || sales.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Nenhuma venda paga encontrada para este cliente' 
        },
        { status: 404 }
      )
    }

    const sale = sales[0]

    console.log('✅ Venda encontrada:', {
      id: sale.id,
      email: sale.customer_email,
      status: sale.status,
      amount: sale.total_amount
    })

    // 2️⃣ VERIFICAR SE JÁ EXISTE NA FILA (PENDENTE)
    const { data: existingQueue } = await supabaseAdmin
      .from('provisioning_queue')
      .select('id, status, retry_count')
      .eq('sale_id', sale.id)
      .eq('status', 'pending')
      .single()

    if (existingQueue) {
      console.log('⚠️ Item já está na fila como PENDING - processando agora...')
      
      // Processar a fila imediatamente
      let provisioningResult: any = null
      try {
        provisioningResult = await processProvisioningQueue()
        console.log('✅ Processamento concluído:', provisioningResult)
      } catch (provError: any) {
        console.error('⚠️ Erro no processamento:', provError.message)
      }
      
      return NextResponse.json({
        success: true,
        message: `Venda de ${sale.customer_email} processada! (já estava na fila)`,
        queueId: existingQueue.id,
        alreadyQueued: true,
        provisioningResult
      })
    }

    // 3️⃣ VERIFICAR SE JÁ FOI PROCESSADO COM SUCESSO
    const { data: completedQueue } = await supabaseAdmin
      .from('provisioning_queue')
      .select('id, status, completed_at')
      .eq('sale_id', sale.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (completedQueue) {
      console.log('✅ Provisionamento já foi concluído anteriormente')
      console.log('🔄 Forçando nova entrada na fila...')
    }

    // 4️⃣ INSERIR NA FILA DE PROVISIONAMENTO
    // Primeiro, deletar entrada existente se houver (para evitar duplicatas)
    await supabaseAdmin
      .from('provisioning_queue')
      .delete()
      .eq('sale_id', sale.id)

    // Agora inserir nova entrada com status pending
    // Tentar com campos completos primeiro, depois fallback para mínimo
    let queueItem: any = null
    let queueError: any = null

    // Tentar INSERT com campos customer_email e customer_name
    const { data: queueData1, error: queueErr1 } = await supabaseAdmin
      .from('provisioning_queue')
      .insert({
        sale_id: sale.id,
        customer_email: sale.customer_email,
        customer_name: sale.customer_name,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (queueErr1) {
      console.log('⚠️ Erro com payload completo, tentando payload mínimo...')
      console.log('⚠️ Erro:', queueErr1.message)
      
      // Fallback: INSERT apenas com sale_id e status
      const { data: queueData2, error: queueErr2 } = await supabaseAdmin
        .from('provisioning_queue')
        .insert({
          sale_id: sale.id,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (queueErr2) {
        queueError = queueErr2
      } else {
        queueItem = queueData2
      }
    } else {
      queueItem = queueData1
    }

    if (queueError) {
      console.error('❌ Erro ao inserir na fila:', queueError)
      return NextResponse.json(
        { success: false, error: 'Erro ao adicionar venda na fila de provisionamento' },
        { status: 500 }
      )
    }

    console.log('✅ Venda adicionada à fila de provisionamento')
    console.log('🆔 Queue ID:', queueItem.id)

    // 5️⃣ PROCESSAR A FILA IMEDIATAMENTE (criar usuário + enviar email)
    console.log('🚀 Iniciando processamento imediato da fila...')
    let provisioningResult: any = null
    try {
      provisioningResult = await processProvisioningQueue()
      console.log('✅ Processamento concluído:', provisioningResult)
    } catch (provError: any) {
      console.error('⚠️ Erro no processamento (a venda está na fila para retry):', provError.message)
    }

    // 6️⃣ REGISTRAR LOG DA AÇÃO MANUAL
    await supabaseAdmin
      .from('integration_logs')
      .insert({
        integration_type: 'manual_resync',
        event_type: 'resync_sale',
        status: 'success',
        sale_id: sale.id,
        customer_email: sale.customer_email,
        request_data: { 
          action: 'manual_resync',
          triggered_by: 'admin_panel',
          original_sale_id: sale.id
        },
        response_data: { 
          queue_id: queueItem.id,
          message: 'Venda resincronizada manualmente pelo admin'
        }
      })

    return NextResponse.json({
      success: true,
      message: `Venda de ${sale.customer_email} processada! Usuário criado e email enviado.`,
      queueId: queueItem.id,
      saleId: sale.id,
      customerEmail: sale.customer_email,
      alreadyQueued: false,
      provisioningResult
    })

  } catch (error) {
    console.error('❌ [RESYNC SALE] Erro interno:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno ao processar resincronização' 
      },
      { status: 500 }
    )
  }
}

// GET: Verificar status da fila de um cliente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerEmail = searchParams.get('email')
    const saleId = searchParams.get('saleId')

    if (!customerEmail && !saleId) {
      return NextResponse.json(
        { success: false, error: 'Email ou Sale ID necessário' },
        { status: 400 }
      )
    }

    let query = supabaseAdmin
      .from('provisioning_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (saleId) {
      query = query.eq('sale_id', saleId)
    } else if (customerEmail) {
      query = query.eq('customer_email', customerEmail)
    }

    const { data: queueItems, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar fila' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      queueItems: queueItems || []
    })

  } catch (error) {
    console.error('❌ [RESYNC SALE GET] Erro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    )
  }
}
