import { NextRequest, NextResponse } from 'next/server'
import { processProvisioningQueue } from '@/lib/provisioning-worker'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * ⏰ CRON JOB - PROVISIONING QUEUE
 * 
 * Este endpoint deve ser chamado a cada 5 minutos por:
 * - Vercel Cron Jobs (vercel.json)
 * - GitHub Actions
 * - Cron externo (cron-job.org, easycron, etc)
 * 
 * FUNCIONALIDADES:
 * 1. Detecta vendas pagas sem provisionamento (backup se webhook falhar)
 * 2. Adiciona vendas pendentes à fila
 * 3. Processa a fila de provisionamento
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  console.log('⏰ [CRON] Iniciando job de provisionamento...')

  try {
    // =====================================================
    // 1️⃣ VALIDAR AUTORIZAÇÃO (Segurança)
    // =====================================================
    
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'provisioning-2026'
    const querySecret = new URL(request.url).searchParams.get('secret')

    // Vercel Cron adiciona automaticamente um header
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron')
    
    // Aceitar: Vercel Cron, Authorization header, ou query param secret
    const isAuthorized = isVercelCron || 
                         authHeader === `Bearer ${cronSecret}` ||
                         querySecret === cronSecret
    
    if (!isAuthorized) {
      console.warn('⚠️ Tentativa não autorizada de executar cron')
      
      return NextResponse.json({
        success: false,
        error: 'Não autorizado'
      }, { status: 401 })
    }

    // =====================================================
    // 2️⃣ DETECTAR VENDAS PAGAS SEM PROVISIONAMENTO
    // =====================================================
    
    let enqueued = 0
    
    try {
      // Buscar vendas pagas nas últimas 48h que não estão na fila
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      
      const { data: paidSales, error: salesError } = await supabaseAdmin
        .from('sales')
        .select('id, customer_email, customer_name, status')
        .eq('status', 'paid')
        .gte('created_at', twoDaysAgo)
      
      if (salesError) {
        console.warn('⚠️ Erro ao buscar vendas pagas:', salesError)
      } else if (paidSales && paidSales.length > 0) {
        console.log(`🔍 Encontradas ${paidSales.length} vendas pagas nas últimas 48h`)
        
        // Para cada venda paga, verificar se já está na fila
        for (const sale of paidSales) {
          const { data: existingQueue } = await supabaseAdmin
            .from('provisioning_queue')
            .select('id, status')
            .eq('sale_id', sale.id)
            .maybeSingle()
          
          // Só adicionar se não existir ou se falhou (permitir retry)
          if (!existingQueue || existingQueue.status === 'failed') {
            const { error: insertError } = await supabaseAdmin
              .from('provisioning_queue')
              .upsert({
                sale_id: sale.id,
                status: 'pending',
                retry_count: existingQueue?.status === 'failed' ? 0 : 0
              }, { onConflict: 'sale_id' })
            
            if (!insertError) {
              enqueued++
              console.log(`📬 Venda ${sale.id} (${sale.customer_email}) adicionada à fila`)
            }
          }
        }
        
        if (enqueued > 0) {
          console.log(`✅ ${enqueued} vendas adicionadas à fila de provisionamento`)
        }
      }
    } catch (detectError: any) {
      console.warn('⚠️ Erro na detecção automática:', detectError.message)
    }

    // =====================================================
    // 3️⃣ PROCESSAR FILA
    // =====================================================
    
    const result = await processProvisioningQueue()

    // =====================================================
    // 4️⃣ RETORNAR RESULTADO
    // =====================================================
    
    const duration = Date.now() - startTime

    return NextResponse.json({
      success: result.success,
      enqueued: enqueued,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error('❌ Erro crítico no cron job:', error)

    return NextResponse.json({
      success: false,
      error: error.message,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * Permitir GET para teste manual
 */
export async function GET(request: NextRequest) {
  console.log('🔍 [TEST] Executando cron manualmente...')

  // Passar para o POST
  return POST(request)
}

/**
 * Health check do cron
 */
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      'X-Cron-Status': 'ok',
      'X-Cron-Timestamp': new Date().toISOString()
    }
  })
}
