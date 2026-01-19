import { NextRequest, NextResponse } from 'next/server'
import { createAppmaxOrder } from '@/lib/appmax'

/**
 * API de Checkout - Integração Completa com Appmax
 * 
 * FLUXO:
 * 1. Recebe dados do formulário
 * 2. Cria cliente na Appmax
 * 3. Cria pedido com produtos
 * 4. Gera pagamento (PIX)
 * 5. Retorna QR Code para o frontend
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('🛒 Iniciando checkout API...')
    console.log('📦 Dados recebidos:', {
      name: body.name,
      email: body.email,
      phone: body.phone,
      cpf: body.cpf,
      payment_method: body.payment_method,
      order_bumps: body.order_bumps,
    })

    // Valida dados obrigatórios
    if (!body.name || !body.email || !body.cpf) {
      return NextResponse.json(
        { success: false, error: 'Dados obrigatórios faltando' },
        { status: 400 }
      )
    }

    // Valida CPF (obrigatório para PIX)
    const cpf = body.cpf.replace(/\D/g, '')
    if (cpf.length !== 11) {
      return NextResponse.json(
        { success: false, error: 'CPF inválido' },
        { status: 400 }
      )
    }

    // Prepara dados para Appmax
    const orderData = {
      customer: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        cpf: cpf,
      },
      product_id: process.env.APPMAX_PRODUCT_ID || '32991339',
      quantity: 1,
      payment_method: body.payment_method || 'pix',
      order_bumps: body.order_bumps || [],
      utm_params: body.utm_params || {},
    }

    console.log('📡 Enviando para Appmax...')

    // Cria pedido na Appmax
    const result = await createAppmaxOrder(orderData)

    console.log('✅ Resposta da Appmax:', {
      success: result.success,
      order_id: result.order_id,
      status: result.status,
      has_pix: !!result.pix_qr_code,
    })

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.message || 'Erro ao processar pagamento',
        },
        { status: 400 }
      )
    }

    // Retorna dados do pedido
    return NextResponse.json({
      success: true,
      order_id: result.order_id,
      status: result.status,
      pix_qr_code: result.pix_qr_code,
      pix_qr_code_base64: result.pix_qr_code_base64,
      message: 'Pedido criado com sucesso!',
    })

  } catch (error: any) {
    console.error('❌ Erro no checkout:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro ao processar pagamento',
      },
      { status: 500 }
    )
  }
}
// Force rebuild Mon Jan 19 18:34:22 -03 2026
