import { NextRequest, NextResponse } from 'next/server'

/**
 * 🏥 HEALTH CHECK DO WEBHOOK MERCADO PAGO
 * 
 * Endpoint para verificar se o webhook está acessível.
 * Use para diagnóstico e monitoramento.
 * 
 * URL: /api/webhooks/mercadopago/health
 */
export async function GET(request: NextRequest) {
  const now = new Date()
  
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/webhooks/mercadopago',
    timestamp: now.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    server_time_utc: now.toUTCString(),
    headers_received: {
      host: request.headers.get('host'),
      user_agent: request.headers.get('user-agent'),
      x_forwarded_for: request.headers.get('x-forwarded-for'),
      x_real_ip: request.headers.get('x-real-ip'),
    },
    message: '✅ Webhook endpoint está funcionando! Configure esta URL no Mercado Pago: https://www.gravadormedico.com.br/api/webhooks/mercadopago'
  })
}

/**
 * Teste POST para simular webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    return NextResponse.json({
      status: 'received',
      timestamp: new Date().toISOString(),
      payload_received: body,
      message: '✅ Payload recebido com sucesso! O webhook está funcionando.'
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message
    }, { status: 400 })
  }
}
