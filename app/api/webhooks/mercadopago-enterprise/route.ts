import { NextRequest, NextResponse } from 'next/server'
import { handleMercadoPagoWebhookEnterprise } from '@/lib/mercadopago-webhook-enterprise'

/**
 * 🔔 WEBHOOK ROUTE - MERCADO PAGO ENTERPRISE
 * 
 * Endpoint para receber notificações do Mercado Pago
 * URL de configuração no MP: https://seu-dominio.com/api/webhooks/mercadopago-enterprise
 */

export async function POST(request: NextRequest) {
  console.log('📨 [WEBHOOK ROUTE] Recebendo notificação do Mercado Pago')
  
  try {
    // Clonar request para ler body múltiplas vezes
    const body = await request.json()
    
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2))
    console.log('📋 Headers:', {
      'x-signature': request.headers.get('x-signature'),
      'x-request-id': request.headers.get('x-request-id')
    })
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2))
    console.log('📋 Headers:', {
      'x-signature': request.headers.get('x-signature'),
      'x-request-id': request.headers.get('x-request-id')
    })

    // Recriar Request com o body já parseado
    const newRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body)
    })

    // =====================================================
    // PROCESSAR WEBHOOK
    // =====================================================
    
    const result = await handleMercadoPagoWebhookEnterprise(newRequest)

    console.log('✅ Resultado do processamento:', result)

    // =====================================================
    // RETORNAR RESPOSTA SIMPLES
    // =====================================================
    
    if (result.status === 200 || result.status === 202) {
      console.log('✅ Retornando 200 OK')
      return new NextResponse('OK', { status: 200 })
    }
    
    // Para outros status, retornar com JSON
    return NextResponse.json(
      { 
        success: false,
        message: result.message 
      },
      { status: result.status }
    )

  } catch (error: any) {
    console.error('❌ Erro crítico no webhook route:', error)

    // Retornar 500 para indicar erro real
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 })
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
