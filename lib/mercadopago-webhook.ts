import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase'
import { getPaymentStatus } from './mercadopago'
import { processProvisioningQueue } from './provisioning-worker'
import { trackPurchase } from './tracking/core'
import { sendPurchaseConfirmationEmail } from './email'

/**
 * 🔔 WEBHOOK MERCADO PAGO - COM RACE CONDITION FIX
 * 
 * Trata notificações de pagamento com:
 * - Salvamento de payload bruto para auditoria
 * - Retry com delay se venda ainda não existir (race condition)
 * - Enriquecimento de dados (busca detalhes completos na API MP)
 * - Enfileiramento de provisionamento quando aprovado
 */

export async function handleMercadoPagoWebhook(request: NextRequest) {
  console.log('📨 Webhook Mercado Pago recebido')
  
  const body = await request.json()
  
  // 1️⃣ SALVAR PAYLOAD BRUTO (SEMPRE, ANTES DE QUALQUER COISA)
  const { data: logEntry, error: logError } = await supabaseAdmin
    .from('mp_webhook_logs')
    .insert({
      topic: body.action || body.type,
      event_id: body.data?.id,
      raw_payload: body,
      processed: false,
      retry_count: 0
    })
    .select()
    .single()

  if (logError) {
    console.error('❌ Erro ao salvar log de webhook:', logError)
    // Continua mesmo se falhar o log
  }

  // Mercado Pago envia: { action: "payment.updated", data: { id: "12345" } }
  const { action, data } = body
  
  if (action && action.includes('payment')) {
    const paymentId = data.id
    
    try {
      console.log(`🔍 Consultando pagamento: ${paymentId}`)
      
      // 2️⃣ BUSCAR DETALHES COMPLETOS (ENRIQUECIMENTO)
      const payment = await getPaymentStatus(paymentId)
      
      console.log(`📊 Status: ${payment.status}`)
      
      // 3️⃣ TRATAMENTO DE RACE CONDITION
      // Webhook pode chegar antes do INSERT na tabela sales
      let sale = null
      let retries = 0
      const MAX_RETRIES = 5
      const RETRY_DELAY_MS = 2000
      
      while (!sale && retries < MAX_RETRIES) {
        const { data: saleData, error: saleError } = await supabaseAdmin
          .from('sales')
          .select('*')
          .eq('mercadopago_payment_id', paymentId)
          .single()
        
        if (saleData) {
          sale = saleData
          console.log('✅ Venda encontrada no banco')
          break
        }
        
        if (saleError && saleError.code !== 'PGRST116') { // PGRST116 = not found
          console.error('❌ Erro ao buscar venda:', saleError)
          throw saleError
        }
        
        // Venda ainda não existe, aguardar e tentar novamente
        retries++
        console.log(`⏳ Venda ainda não existe no banco, aguardando... (tentativa ${retries}/${MAX_RETRIES})`)
        
        if (retries < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
        }
      }
      
      if (!sale) {
        console.warn(`⚠️ Venda não encontrada após ${MAX_RETRIES} tentativas`)
        
        // Atualizar log com erro
        if (logEntry) {
          await supabaseAdmin
            .from('mp_webhook_logs')
            .update({
              processed: false,
              retry_count: MAX_RETRIES,
              last_error: 'Venda não encontrada no banco após múltiplas tentativas'
            })
            .eq('id', logEntry.id)
        }
        
        // Retornar 202 (Accepted) para MP tentar novamente mais tarde
        return {
          status: 202,
          message: 'Aceito para reprocessamento - venda ainda não existe'
        }
      }
      
      // 4️⃣ BUSCAR DADOS DO CHECKOUT (TELEFONE E CPF)
      let checkoutPhone = null
      let checkoutCpf = null
      
      try {
        // Buscar por email + timestamp próximo (janela de 10 minutos)
        const saleTime = new Date(sale.created_at)
        const startWindow = new Date(saleTime.getTime() - 10 * 60 * 1000).toISOString()
        const endWindow = new Date(saleTime.getTime() + 10 * 60 * 1000).toISOString()
        
        const { data: checkoutData } = await supabaseAdmin
          .from('checkout_attempts')
          .select('customer_phone, customer_cpf')
          .eq('customer_email', sale.customer_email)
          .gte('created_at', startWindow)
          .lte('created_at', endWindow)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (checkoutData) {
          checkoutPhone = checkoutData.customer_phone
          checkoutCpf = checkoutData.customer_cpf
          console.log('📞 Dados do checkout encontrados:', {
            phone: checkoutPhone ? '***' + checkoutPhone.slice(-4) : null,
            cpf: checkoutCpf ? '***' + checkoutCpf.slice(-4) : null
          })
        } else {
          console.log('⚠️ Nenhum checkout encontrado para:', {
            email: sale.customer_email,
            window: `${startWindow} - ${endWindow}`
          })
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar dados do checkout:', error)
      }
      
      // 5️⃣ ATUALIZAR VENDA COM DADOS ENRIQUECIDOS
      const updatePayload: any = {
        status: mapStatus(payment.status),
        payment_details: payment // ENRIQUECIMENTO
      }
      
      // Adicionar phone/cpf se disponíveis e ainda não existirem na venda
      if (checkoutPhone && !sale.customer_phone) {
        updatePayload.customer_phone = checkoutPhone
      }
      if (checkoutCpf && !sale.customer_cpf) {
        updatePayload.customer_cpf = checkoutCpf
      }
      
      const { error: updateError } = await supabaseAdmin
        .from('sales')
        .update(updatePayload)
        .eq('id', sale.id)
      
      if (updateError) {
        console.error('❌ Erro ao atualizar venda:', updateError)
        throw updateError
      }
      
      console.log('✅ Venda atualizada com sucesso')
      
      // 6️⃣ SE APROVADO, ENFILEIRAR PROVISIONAMENTO E PROCESSAR
      if (payment.status === 'approved' && sale) {
        console.log('✅ Pagamento aprovado! Enfileirando provisionamento...')

        // 🎯 TRACKING: Disparo blindado para Meta CAPI + GA4
        // Usando função do Hub de Tracking (nunca falha, sempre loga)
        trackPurchase({
          orderId: sale.id || `mp-${payment.id}`,
          totalAmount: parseFloat(sale.total_amount) || payment.transaction_amount || 0,
          customerEmail: sale.customer_email || undefined,
          customerPhone: sale.customer_phone || undefined,
          customerName: sale.customer_name || undefined,
          productName: 'Gravador Médico',
          productIds: ['gravador_medico'],
          currency: 'BRL',
          eventSourceUrl: 'https://gravadormedico.com.br/checkout',
        }).then(result => {
          if (result.success) {
            console.log(`[MercadoPago ${payment.id}] ✅ Tracking Purchase enviado:`, result.logs)
          } else {
            console.warn(`[MercadoPago ${payment.id}] ⚠️ Tracking Purchase parcial:`, result.logs)
          }
        }).catch(err => {
          console.error(`[MercadoPago ${payment.id}] ❌ Tracking Purchase erro inesperado:`, err)
        })

        // 📧 ENVIAR EMAIL DE CONFIRMAÇÃO DE COMPRA (IMEDIATO)
        if (sale.customer_email) {
          try {
            console.log(`📧 Enviando email de confirmação para ${sale.customer_email}...`)
            await sendPurchaseConfirmationEmail({
              to: sale.customer_email,
              customerName: sale.customer_name || 'Cliente',
              orderId: sale.id,
              orderValue: parseFloat(sale.total_amount) || payment.transaction_amount || 0,
              paymentMethod: 'mercadopago'
            })
            console.log(`✅ Email de confirmação de compra enviado!`)
          } catch (emailError: any) {
            console.error('⚠️ Erro ao enviar email de confirmação:', emailError.message)
            // Não falha o webhook por causa de email
          }
        }

        // ✅ Limpar carrinho abandonado quando compra é aprovada
        if (sale.customer_email) {
          try {
            await supabaseAdmin
              .from('abandoned_carts')
              .delete()
              .eq('customer_email', sale.customer_email)
            console.log('🗑️ Carrinho abandonado limpo com sucesso')
          } catch (error) {
            console.warn('⚠️ Erro ao limpar carrinho abandonado após compra MP:', error)
          }
        }

        // ✅ VERIFICAR IDEMPOTÊNCIA: Só inserir se ainda não estiver na fila
        const { data: existingQueue, error: queueCheckError } = await supabaseAdmin
          .from('provisioning_queue')
          .select('id, status')
          .eq('sale_id', sale.id)
          .maybeSingle()

        if (queueCheckError) {
          console.warn('⚠️ Erro ao verificar fila de provisionamento:', queueCheckError)
        }

        // Só inserir se não existir OU se estiver como 'failed' (permitir retry)
        if (!existingQueue || existingQueue.status === 'failed') {
          const { error: enqueueError } = await supabaseAdmin
            .from('provisioning_queue')
            .insert({ 
              sale_id: sale.id, 
              status: 'pending',
              retry_count: 0
            })

          if (enqueueError) {
            console.error('❌ Erro ao enfileirar provisionamento:', enqueueError)
          } else {
            console.log('📬 Item adicionado à fila de provisionamento')
          }
        } else {
          console.log('ℹ️ Item já está na fila (evitando duplicação)')
        }

        // 🚀 CRÍTICO: PROCESSAR A FILA COM AWAIT (Segura execução serverless)
        try {
          console.log('⚙️ Iniciando processamento da fila de provisionamento...')
          const result = await processProvisioningQueue()
          console.log('✅ Processamento concluído:', {
            processed: result.processed,
            failed: result.failed
          })
        } catch (provisioningError: any) {
          // ⚠️ Mesmo se falhar, não quebra o webhook
          // O item ficará na fila para retry futuro
          console.error('⚠️ Erro ao processar provisionamento (item na fila para retry):', provisioningError.message)
        }
      }
      
      // 7️⃣ MARCAR LOG COMO PROCESSADO
      if (logEntry) {
        await supabaseAdmin
          .from('mp_webhook_logs')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            retry_count: retries
          })
          .eq('id', logEntry.id)
      }
      
      return payment
      
    } catch (error: any) {
      console.error('❌ Erro ao processar webhook:', error)
      
      // Marcar log com erro
      if (logEntry) {
        await supabaseAdmin
          .from('mp_webhook_logs')
          .update({
            processed: false,
            last_error: error.message,
            retry_count: (logEntry.retry_count || 0) + 1
          })
          .eq('id', logEntry.id)
      }
      
      throw error
    }
  }
  
  return null
}

function mapStatus(mpStatus: string): string {
  const map: Record<string, string> = {
    'approved': 'paid',
    'pending': 'pending',
    'in_process': 'pending',
    'rejected': 'refused',
    'cancelled': 'cancelled',
    'refunded': 'refunded'
  }
  return map[mpStatus] || 'pending'
}
