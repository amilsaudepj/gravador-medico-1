import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPurchaseConfirmationEmail } from '@/lib/email'
import { processProvisioningQueue } from '@/lib/provisioning-worker'

/**
 * 🔔 WEBHOOK ROUTE - MERCADO PAGO ENTERPRISE
 * 
 * Endpoint para receber notificações do Mercado Pago
 * URL de configuração no MP: https://seu-dominio.com/api/webhooks/mercadopago-enterprise
 * 
 * VERSÃO COMPLETA - Aceita webhooks, atualiza vendas, envia emails e provisiona
 */

// Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('📨 [WEBHOOK ENTERPRISE] Recebendo notificação do Mercado Pago')
  
  try {
    const body = await request.json()
    
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2))
    
    const { action, data, type, id } = body
    const paymentId = data?.id || id
    
    // =====================================================
    // 1️⃣ SEMPRE SALVAR LOG (tabela webhooks_logs)
    // =====================================================
    
    try {
      await supabaseAdmin
        .from('webhooks_logs')
        .insert({
          endpoint: '/api/webhooks/mercadopago-enterprise',
          payload: {
            ...body,
            _meta: {
              gateway: 'mercadopago',
              event_type: action || type || 'unknown',
              logged_at: new Date().toISOString()
            }
          },
          response_status: 200,
          received_at: new Date().toISOString()
        })
      console.log('✅ Log salvo em webhooks_logs')
    } catch (logError: any) {
      console.warn('⚠️ Erro ao salvar log (não crítico):', logError.message)
    }
    
    // =====================================================
    // 2️⃣ VERIFICAR SE É WEBHOOK DE TESTE
    // =====================================================
    
    const isTestWebhook = !paymentId || 
                         paymentId === '123456' || 
                         paymentId.toString() === '123456' ||
                         paymentId.toString().length < 8
    
    if (isTestWebhook) {
      console.log('✅ Webhook de teste detectado - respondendo OK')
      return new NextResponse('OK', { status: 200 })
    }
    
    // =====================================================
    // 3️⃣ VERIFICAR SE É EVENTO DE PAGAMENTO
    // =====================================================
    
    if (!action?.includes('payment') && type !== 'payment') {
      console.log('ℹ️ Não é evento de pagamento, ignorando')
      return new NextResponse('OK', { status: 200 })
    }
    
    // =====================================================
    // 4️⃣ BUSCAR DETALHES DO PAGAMENTO NA API DO MP
    // =====================================================
    
    console.log(`🔍 Buscando detalhes do pagamento: ${paymentId}`)
    
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
        }
      }
    )
    
    if (!mpResponse.ok) {
      console.error(`❌ Erro ao buscar pagamento: ${mpResponse.status}`)
      // Retornar 200 para MP não reenviar
      return new NextResponse('OK', { status: 200 })
    }
    
    const payment = await mpResponse.json()
    console.log(`📊 Status do pagamento: ${payment.status}`)
    
    // =====================================================
    // 5️⃣ ATUALIZAR VENDA SE EXISTIR
    // =====================================================
    
    if (payment.status === 'approved') {
      let saleId: string | null = null

      // Tentar encontrar a venda pelo mercadopago_payment_id
      const { data: sale, error: saleError } = await supabaseAdmin
        .from('sales')
        .select('*')
        .eq('mercadopago_payment_id', paymentId.toString())
        .single()
      
      if (sale) {
        // Atualizar status da venda
        await supabaseAdmin
          .from('sales')
          .update({
            order_status: 'paid',
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', sale.id)
        
        console.log(`✅ Venda ${sale.id} atualizada para PAID`)
        saleId = sale.id

        if (sale.customer_email) {
          try {
            await supabaseAdmin
              .from('abandoned_carts')
              .delete()
              .eq('customer_email', sale.customer_email)
          } catch (error) {
            console.warn('⚠️ Erro ao limpar carrinho abandonado após compra MP:', error)
          }
        }
      } else {
        console.log('⚠️ Venda não encontrada pelo mercadopago_payment_id')
        
        // Tentar encontrar pelo external_reference
        if (payment.external_reference) {
          const { data: saleByRef } = await supabaseAdmin
            .from('sales')
            .select('*')
            .eq('external_reference', payment.external_reference)
            .single()
          
          if (saleByRef) {
            await supabaseAdmin
              .from('sales')
              .update({
                order_status: 'paid',
                status: 'paid',
                mercadopago_payment_id: paymentId.toString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', saleByRef.id)
            
            console.log(`✅ Venda ${saleByRef.id} atualizada (encontrada por external_reference)`)
            saleId = saleByRef.id

            if (saleByRef.customer_email) {
              try {
                await supabaseAdmin
                  .from('abandoned_carts')
                  .delete()
                  .eq('customer_email', saleByRef.customer_email)
              } catch (error) {
                console.warn('⚠️ Erro ao limpar carrinho abandonado após compra MP:', error)
              }
            }
          }
        }
      }

      if (saleId) {
        // 📧 ENVIAR EMAIL DE CONFIRMAÇÃO DE COMPRA
        const saleData = sale || (await supabaseAdmin.from('sales').select('*').eq('id', saleId).single()).data
        
        if (saleData?.customer_email) {
          try {
            console.log(`📧 Enviando email de confirmação para ${saleData.customer_email}...`)
            await sendPurchaseConfirmationEmail({
              to: saleData.customer_email,
              customerName: saleData.customer_name || 'Cliente',
              orderId: saleId,
              orderValue: parseFloat(saleData.total_amount) || payment.transaction_amount || 0,
              paymentMethod: 'mercadopago'
            })
            console.log(`✅ Email de confirmação de compra enviado!`)
          } catch (emailError: any) {
            console.error('⚠️ Erro ao enviar email de confirmação:', emailError.message)
          }
        }

        // 🚀 ADICIONAR À FILA DE PROVISIONAMENTO
        const { data: existingQueue, error: queueCheckError } = await supabaseAdmin
          .from('provisioning_queue')
          .select('id')
          .eq('sale_id', saleId)
          .maybeSingle()

        if (queueCheckError) {
          console.warn('⚠️ Erro ao verificar fila de provisionamento:', queueCheckError.message)
        }

        if (!existingQueue) {
          const { error: enqueueError } = await supabaseAdmin
            .from('provisioning_queue')
            .insert({ sale_id: saleId, status: 'pending' })

          if (enqueueError) {
            console.error('❌ Erro ao enfileirar provisionamento (PIX/MP):', enqueueError)
          } else {
            console.log(`✅ Pedido ${saleId} adicionado à fila de provisionamento`)
          }
        }

        // ⚙️ PROCESSAR FILA IMEDIATAMENTE
        try {
          console.log('⚙️ Iniciando processamento da fila de provisionamento...')
          const result = await processProvisioningQueue()
          console.log('✅ Processamento concluído:', {
            processed: result.processed,
            failed: result.failed
          })
        } catch (provisioningError: any) {
          console.error('⚠️ Erro ao processar fila:', provisioningError.message)
        }
      }
    }
    
    const processingTime = Date.now() - startTime
    console.log(`⏱️ Processamento concluído em ${processingTime}ms`)
    
    // =====================================================
    // 6️⃣ SEMPRE RETORNAR 200 PARA O MP
    // =====================================================
    
    return new NextResponse('OK', { status: 200 })

  } catch (error: any) {
    console.error('❌ Erro no webhook:', error.message)
    
    // IMPORTANTE: Retornar 200 mesmo em erro para MP não reenviar infinitamente
    // O erro foi logado, podemos investigar depois
    return new NextResponse('OK', { status: 200 })
  }
}

/**
 * Health check do webhook
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'mercadopago-enterprise-webhook',
    timestamp: new Date().toISOString(),
    message: 'Webhook está operacional'
  })
}
