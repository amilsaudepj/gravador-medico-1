import { supabaseAdmin } from './supabase'
import { createLovableUser, generateSecurePassword } from '@/services/lovable-integration'

/**
 * 🏭 PROVISIONING WORKER V2 - MODULAR & FAULT-TOLERANT
 * 
 * ✅ REFATORADO: Máquina de estados com etapas independentes
 * 
 * Arquitetura:
 * - Cada etapa é independente e pode falhar sem afetar as anteriores
 * - Se o Lovable cair, o cliente já recebeu email de confirmação (enviado pelo webhook)
 * - Cada etapa pode ser retentada individualmente
 * 
 * STAGES (Máquina de Estados):
 * ┌─────────────────────────────────────────────────────────────┐
 * │  queued → creating_user → sending_credentials → completed  │
 * │     ↓           ↓                  ↓                       │
 * │     └─────→ failed_at_user   failed_at_email → retry       │
 * └─────────────────────────────────────────────────────────────┘
 */

interface ProvisioningResult {
  success: boolean
  processed: number
  failed: number
  stages?: {
    users_created: number
    emails_sent: number
  }
  errors: Array<{
    sale_id: string
    stage?: string
    error: string
  }>
}

// =====================================================
// 🎯 PASSO A: LER ITENS DA FILA
// =====================================================
async function fetchQueueItems(limit: number = 10) {
  // Buscar por stage (novo) ou status (legado)
  const { data: items, error } = await supabaseAdmin
    .from('provisioning_queue')
    .select('*')
    .or('stage.in.(queued,creating_user,sending_credentials,failed_at_user,failed_at_email),status.in.(pending,processing,failed)')
    .or('next_retry_at.is.null,next_retry_at.lte.now()')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw error
  
  // Filtrar apenas itens que realmente precisam processamento
  return (items || []).filter(item => {
    const stage = item.stage || 'queued'
    const status = item.status
    
    // Excluir completed e failed_permanent
    if (stage === 'completed' || stage === 'failed_permanent') return false
    if (status === 'completed') return false
    
    return true
  })
}

// =====================================================
// 🎯 PASSO B: CRIAR USUÁRIO NO LOVABLE
// =====================================================
async function executeUserCreation(item: any, order: any): Promise<{
  success: boolean
  userId?: string
  password?: string
  error?: string
  alreadyExists?: boolean
}> {
  const startTime = Date.now()
  
  try {
    console.log(`[${item.id}] 👤 STAGE: creating_user`)
    
    // Atualizar stage para creating_user
    await supabaseAdmin
      .from('provisioning_queue')
      .update({ 
        stage: 'creating_user',
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', item.id)
    
    // Gerar senha segura
    const password = generateSecurePassword()
    
    // Criar usuário no Lovable
    const result = await createLovableUser({
      email: order.customer_email,
      password: password,
      full_name: order.customer_name
    })
    
    if (!result.success && !result.alreadyExists) {
      throw new Error(result.error || 'Falha ao criar usuário no Lovable')
    }
    
    const userId = result.user?.id || 'existing'
    
    // ✅ SUCESSO: Salvar credenciais e avançar stage
    await supabaseAdmin
      .from('provisioning_queue')
      .update({
        stage: 'sending_credentials',
        lovable_user_id: userId,
        lovable_password: password,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)
    
    // Atualizar status do pedido
    await supabaseAdmin
      .from('sales')
      .update({ order_status: 'provisioning' })
      .eq('id', order.id)
    
    // Log de sucesso
    await supabaseAdmin.from('integration_logs').insert({
      order_id: order.id,
      action: 'create_user_lovable',
      status: 'success',
      recipient_email: order.customer_email,
      user_id: userId,
      details: {
        stage: 'creating_user',
        already_exists: result.alreadyExists,
        duration_ms: Date.now() - startTime
      },
      duration_ms: Date.now() - startTime
    })
    
    console.log(`[${item.id}] ✅ Usuário criado: ${userId}`)
    
    return {
      success: true,
      userId,
      password,
      alreadyExists: result.alreadyExists
    }
    
  } catch (error: any) {
    console.error(`[${item.id}] ❌ Falha ao criar usuário:`, error.message)
    
    // Marcar como falha na criação de usuário
    const newRetryCount = (item.retry_count || 0) + 1
    const maxRetries = item.max_retries ?? 3
    const delayMinutes = Math.pow(2, newRetryCount) * 5 // 5min, 10min, 20min
    const nextRetryAt = newRetryCount < maxRetries 
      ? new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()
      : null
    
    await supabaseAdmin
      .from('provisioning_queue')
      .update({
        stage: newRetryCount >= maxRetries ? 'failed_permanent' : 'failed_at_user',
        status: 'failed',
        last_error: error.message,
        retry_count: newRetryCount,
        next_retry_at: nextRetryAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)
    
    // Log de erro
    await supabaseAdmin.from('integration_logs').insert({
      order_id: order.id,
      action: 'create_user_lovable',
      status: 'error',
      recipient_email: order.customer_email,
      error_message: error.message,
      details: {
        stage: 'creating_user',
        retry_count: newRetryCount,
        max_retries: maxRetries,
        next_retry_at: nextRetryAt,
        duration_ms: Date.now() - startTime
      },
      duration_ms: Date.now() - startTime
    })
    
    return {
      success: false,
      error: error.message
    }
  }
}

// =====================================================
// 🎯 PASSO C: ENVIAR EMAIL COM CREDENCIAIS
// =====================================================
async function executeSendCredentials(item: any, order: any): Promise<{
  success: boolean
  emailId?: string
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    console.log(`[${item.id}] 📧 STAGE: sending_credentials`)
    
    // Recuperar senha da fila
    const password = item.lovable_password
    
    if (!password) {
      throw new Error('Senha não encontrada na fila - reprocessar criação de usuário')
    }
    
    // Verificar idempotência: email já foi enviado?
    const { data: existingEmail } = await supabaseAdmin
      .from('integration_logs')
      .select('id, created_at')
      .eq('order_id', order.id)
      .eq('action', 'send_email')
      .eq('status', 'success')
      .maybeSingle()
    
    if (existingEmail) {
      console.log(`[${item.id}] ⏭️ Email já enviado anteriormente, pulando...`)
      
      // Marcar como completed mesmo assim
      await supabaseAdmin
        .from('provisioning_queue')
        .update({
          stage: 'completed',
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', item.id)
      
      await supabaseAdmin
        .from('sales')
        .update({ order_status: 'active' })
        .eq('id', order.id)
      
      return { success: true }
    }
    
    // Importar função de email
    const { sendWelcomeEmail } = await import('./email')
    
    // Enviar email
    const emailResult = await sendWelcomeEmail({
      to: order.customer_email,
      customerName: order.customer_name,
      userEmail: order.customer_email,
      userPassword: password,
      orderId: order.id.toString(),
      orderValue: Number(order.total_amount ?? order.amount ?? 0),
      paymentMethod: order.payment_gateway === 'mercadopago'
        ? 'Mercado Pago'
        : order.payment_gateway === 'appmax'
          ? 'AppMax'
          : (order.payment_gateway || order.payment_method || 'checkout')
    })
    
    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Falha ao enviar email')
    }
    
    // ✅ SUCESSO TOTAL: Marcar como completed
    await supabaseAdmin
      .from('provisioning_queue')
      .update({
        stage: 'completed',
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', item.id)
    
    // Atualizar status do pedido para active
    await supabaseAdmin
      .from('sales')
      .update({ order_status: 'active' })
      .eq('id', order.id)
    
    // Log de sucesso
    await supabaseAdmin.from('integration_logs').insert({
      order_id: order.id,
      action: 'send_email',
      status: 'success',
      recipient_email: order.customer_email,
      details: {
        stage: 'sending_credentials',
        email_id: emailResult.emailId,
        duration_ms: Date.now() - startTime
      },
      duration_ms: Date.now() - startTime
    })
    
    console.log(`[${item.id}] ✅ Email enviado: ${emailResult.emailId}`)
    
    return {
      success: true,
      emailId: emailResult.emailId
    }
    
  } catch (error: any) {
    console.error(`[${item.id}] ❌ Falha ao enviar email:`, error.message)
    
    // Marcar como falha no envio de email
    const newRetryCount = (item.retry_count || 0) + 1
    const maxRetries = item.max_retries ?? 3
    const delayMinutes = Math.pow(2, newRetryCount) * 5
    const nextRetryAt = newRetryCount < maxRetries 
      ? new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()
      : null
    
    await supabaseAdmin
      .from('provisioning_queue')
      .update({
        stage: newRetryCount >= maxRetries ? 'failed_permanent' : 'failed_at_email',
        status: 'failed',
        last_error: error.message,
        retry_count: newRetryCount,
        next_retry_at: nextRetryAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)
    
    // Log de erro
    await supabaseAdmin.from('integration_logs').insert({
      order_id: order.id,
      action: 'send_email',
      status: 'error',
      recipient_email: order.customer_email,
      error_message: error.message,
      details: {
        stage: 'sending_credentials',
        retry_count: newRetryCount,
        max_retries: maxRetries,
        next_retry_at: nextRetryAt,
        duration_ms: Date.now() - startTime
      },
      duration_ms: Date.now() - startTime
    })
    
    return {
      success: false,
      error: error.message
    }
  }
}

// =====================================================
// 🏭 FUNÇÃO PRINCIPAL: PROCESSAR FILA
// =====================================================
export async function processProvisioningQueue(): Promise<ProvisioningResult> {
  const startTime = Date.now()
  
  console.log('🏭 [PROVISIONING V2] Iniciando processamento modular...')

  const result: ProvisioningResult = {
    success: true,
    processed: 0,
    failed: 0,
    stages: {
      users_created: 0,
      emails_sent: 0
    },
    errors: []
  }

  try {
    // =====================================================
    // 1️⃣ PASSO A: LER ITENS DA FILA
    // =====================================================
    const queueItems = await fetchQueueItems(10)
    
    if (queueItems.length === 0) {
      console.log('ℹ️ Nenhum item na fila para processar')
      return result
    }

    console.log(`📋 Encontrados ${queueItems.length} itens para processar`)

    // =====================================================
    // 2️⃣ PROCESSAR CADA ITEM POR ETAPA
    // =====================================================
    for (const item of queueItems) {
      const saleId = item.sale_id || item.order_id
      
      if (!saleId) {
        console.warn(`⚠️ Item ${item.id} sem sale_id, pulando...`)
        continue
      }

      // Verificar máximo de retries
      const maxRetries = item.max_retries ?? 3
      if ((item.retry_count ?? 0) >= maxRetries) {
        console.log(`⚠️ Item ${item.id} atingiu máximo de retries (${maxRetries}), marcando como falha permanente`)
        
        await supabaseAdmin
          .from('provisioning_queue')
          .update({
            stage: 'failed_permanent',
            status: 'failed',
            last_error: 'Esgotadas tentativas de retry'
          })
          .eq('id', item.id)
        
        await supabaseAdmin
          .from('sales')
          .update({ order_status: 'provisioning_failed' })
          .eq('id', saleId)
        
        result.failed++
        result.errors.push({
          sale_id: saleId,
          stage: item.stage || 'unknown',
          error: 'Esgotadas tentativas de retry'
        })
        
        continue
      }

      // Buscar dados do pedido
      let orderData = null
      
      const { data: salesOrder } = await supabaseAdmin
        .from('sales')
        .select('*')
        .eq('id', saleId)
        .maybeSingle()

      if (salesOrder) {
        orderData = salesOrder
      } else {
        // Tentar na tabela orders (legado)
        const { data: legacyOrder } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('id', saleId)
          .maybeSingle()
        
        if (legacyOrder) {
          orderData = legacyOrder
          console.log(`📋 Usando pedido da tabela orders (legado)`)
        }
      }

      if (!orderData) {
        console.warn(`⚠️ Pedido ${saleId} não encontrado em sales nem orders`)
        continue
      }

      // Verificar status do pedido
      const orderStatus = orderData.order_status || orderData.status
      if (orderStatus !== 'paid' && orderStatus !== 'approved' && orderStatus !== 'provisioning') {
        console.log(`⚠️ Pedido ${saleId} não está pago (${orderStatus}), pulando...`)
        continue
      }

      console.log(`\n🔄 Processando item ${item.id} | Stage: ${item.stage || 'queued'}`)

      // =====================================================
      // ROTEAMENTO POR STAGE (Máquina de Estados)
      // =====================================================
      const currentStage = item.stage || 'queued'

      switch (currentStage) {
        case 'queued':
        case 'creating_user':
        case 'failed_at_user':
        case 'pending': // Compatibilidade com sistema antigo
          // PASSO B: Criar usuário
          const userResult = await executeUserCreation(item, orderData)
          
          if (userResult.success) {
            result.stages!.users_created++
            
            // Se criou usuário, já tenta enviar email na mesma execução
            // Recarregar item atualizado
            const { data: updatedItem } = await supabaseAdmin
              .from('provisioning_queue')
              .select('*')
              .eq('id', item.id)
              .single()
            
            if (updatedItem && updatedItem.stage === 'sending_credentials') {
              const emailResult = await executeSendCredentials(updatedItem, orderData)
              
              if (emailResult.success) {
                result.stages!.emails_sent++
                result.processed++
              } else {
                result.errors.push({
                  sale_id: saleId,
                  stage: 'sending_credentials',
                  error: emailResult.error || 'Erro desconhecido'
                })
              }
            }
          } else {
            result.failed++
            result.errors.push({
              sale_id: saleId,
              stage: 'creating_user',
              error: userResult.error || 'Erro desconhecido'
            })
          }
          break

        case 'sending_credentials':
        case 'failed_at_email':
        case 'processing': // Compatibilidade com sistema antigo
          // PASSO C: Enviar credenciais
          const emailResult = await executeSendCredentials(item, orderData)
          
          if (emailResult.success) {
            result.stages!.emails_sent++
            result.processed++
          } else {
            result.failed++
            result.errors.push({
              sale_id: saleId,
              stage: 'sending_credentials',
              error: emailResult.error || 'Erro desconhecido'
            })
          }
          break

        case 'completed':
          console.log(`✅ Item ${item.id} já está completed, pulando...`)
          break

        case 'failed_permanent':
        case 'failed': // Compatibilidade
          console.log(`❌ Item ${item.id} tem falha permanente, pulando...`)
          break

        default:
          console.warn(`⚠️ Stage desconhecido: ${currentStage}, tratando como queued`)
          // Tratar como queued
          const fallbackResult = await executeUserCreation(item, orderData)
          if (fallbackResult.success) {
            result.stages!.users_created++
          }
      }
    }

    // =====================================================
    // 3️⃣ RESUMO DO PROCESSAMENTO
    // =====================================================
    const duration = Date.now() - startTime
    
    console.log('\n📊 [PROVISIONING V2] Resumo:')
    console.log(`  👤 Usuários criados: ${result.stages?.users_created || 0}`)
    console.log(`  📧 Emails enviados: ${result.stages?.emails_sent || 0}`)
    console.log(`  ✅ Processados: ${result.processed}`)
    console.log(`  ❌ Falhas: ${result.failed}`)
    console.log(`  ⏱️ Tempo: ${duration}ms`)

    return result

  } catch (error: any) {
    console.error('❌ Erro crítico no processamento:', error)
    
    result.success = false
    result.errors.push({
      sale_id: 'system',
      stage: 'system',
      error: error.message
    })

    return result
  }
}

/**
 * Processar um pedido específico manualmente (para retry no admin)
 */
export async function processSpecificOrder(orderId: string): Promise<{
  success: boolean
  message: string
}> {
  console.log(`🔧 [MANUAL] Reprocessando pedido: ${orderId}`)

  try {
    // Verificar se existe na fila
    const { data: existingItem } = await supabaseAdmin
      .from('provisioning_queue')
      .select('*')
      .eq('sale_id', orderId)
      .maybeSingle()

    if (existingItem) {
      // Resetar para queued para reprocessar do início
      await supabaseAdmin
        .from('provisioning_queue')
        .update({
          stage: 'queued',
          status: 'pending',
          retry_count: 0,
          last_error: null,
          next_retry_at: null
        })
        .eq('id', existingItem.id)
    } else {
      // Criar entrada na fila
      await supabaseAdmin
        .from('provisioning_queue')
        .insert({
          sale_id: orderId,
          stage: 'queued',
          status: 'pending',
          retry_count: 0
        })
    }

    // Processar fila
    const result = await processProvisioningQueue()

    return {
      success: result.processed > 0,
      message: result.processed > 0 
        ? `Pedido reprocessado: ${result.stages?.users_created || 0} usuário(s), ${result.stages?.emails_sent || 0} email(s)`
        : result.errors.length > 0
          ? `Erro: ${result.errors[0].error}`
          : 'Nenhuma ação realizada'
    }

  } catch (error: any) {
    console.error('❌ Erro ao reprocessar pedido:', error)
    
    return {
      success: false,
      message: error.message
    }
  }
}
