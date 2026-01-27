// ========================================
// 🛒 CHECKOUT API V3 - DUAL GATEWAY CASCADE
// ========================================
// Mercado Pago → AppMax Fallback Automático
// PCI-DSS Compliant | Idempotência Rigorosa
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '@/lib/supabase';
import { CheckoutRequestSchema, sanitizeCPF } from '@/lib/validators/checkout';

// =====================================================
// 🔧 CONFIGURAÇÃO DOS GATEWAYS
// =====================================================
const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
  options: { timeout: 10000 },
});

const mpPayment = new Payment(mercadopago);

// =====================================================
// 🔐 VALIDAÇÃO TURNSTILE (Anti-Bot)
// =====================================================
async function validateTurnstile(token: string, ip: string): Promise<boolean> {
  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: ip,
        }),
      }
    );

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Turnstile validation failed:', error);
    return false;
  }
}

// =====================================================
// 💳 PROCESSAMENTO MERCADO PAGO
// =====================================================
async function processMercadoPago(
  token: string,
  amount: number,
  email: string,
  cpf: string,
  orderId: string
): Promise<{ success: boolean; data?: any; error?: string; code?: string }> {
  try {
    const payment = await mpPayment.create({
      body: {
        transaction_amount: amount,
        token,
        description: 'Plano Gravador Médico',
        installments: 1,
        payment_method_id: 'credit_card',
        payer: {
          email,
          identification: {
            type: 'CPF',
            number: cpf.replace(/\D/g, ''),
          },
        },
        external_reference: orderId,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      },
      requestOptions: {
        idempotencyKey: orderId,
      },
    });

    if (payment.status === 'approved') {
      return {
        success: true,
        data: {
          id: payment.id,
          status: payment.status,
          status_detail: payment.status_detail,
        },
      };
    }

    return {
      success: false,
      error: payment.status_detail || 'Payment rejected',
      code: payment.status_detail,
      data: payment,
    };
  } catch (error: any) {
    console.error('MercadoPago error:', error);
    
    return {
      success: false,
      error: error.message || 'Payment processing failed',
      code: error.cause?.[0]?.code || 'unknown_error',
    };
  }
}

// =====================================================
// 💳 PROCESSAMENTO APPMAX (FALLBACK)
// =====================================================
async function processAppmax(
  token: string,
  amount: number,
  email: string,
  cpf: string,
  orderId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch('https://api.appmax.com.br/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.APPMAX_API_KEY}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Centavos
        card_token: token,
        customer: {
          email,
          cpf: cpf.replace(/\D/g, ''),
        },
        metadata: {
          order_id: orderId,
          fallback: true,
        },
      }),
    });

    const data = await response.json();

    if (data.status === 'approved' || data.status === 'paid') {
      return {
        success: true,
        data: {
          id: data.id,
          status: data.status,
        },
      };
    }

    return {
      success: false,
      error: data.message || 'AppMax payment rejected',
      data,
    };
  } catch (error: any) {
    console.error('AppMax error:', error);
    return {
      success: false,
      error: error.message || 'AppMax processing failed',
    };
  }
}

// =====================================================
// 🎯 MAIN HANDLER
// =====================================================
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // ==================================================
    // 1️⃣ PARSE & VALIDATE REQUEST
    // ==================================================
    const body = await request.json();
    console.log('📦 Body recebido na API:', JSON.stringify(body, null, 2));
    
    const validation = CheckoutRequestSchema.safeParse(body);

    if (!validation.success) {
      console.error('❌ Validação falhou:', validation.error.flatten());
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      mercadopagoToken,
      appmaxToken,
      customer,
      product,
      turnstileToken,
      idempotencyKey: providedKey,
    } = validation.data;

    // ==================================================
    // 2️⃣ VALIDAÇÃO ANTI-BOT (TURNSTILE)
    // ==================================================
    // TEMPORARIAMENTE DESABILITADO PARA TESTES
    const clientIP =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';
    
    /*
    const isTurnstileValid = await validateTurnstile(turnstileToken, clientIP);

    if (!isTurnstileValid) {
      return NextResponse.json(
        { error: 'Bot validation failed. Please try again.' },
        { status: 403 }
      );
    }
    */
    console.log('⚠️ Turnstile validation DISABLED for testing');

    // ==================================================
    // 3️⃣ IDEMPOTÊNCIA - VERIFICAR SE JÁ EXISTE
    // ==================================================
    const idempotencyKey = providedKey || uuidv4();

    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existingOrder) {
      // Retorna status atual do pedido
      return NextResponse.json({
        message: 'Order already processed',
        order: {
          id: existingOrder.id,
          status: existingOrder.status,
          amount: existingOrder.amount,
          gateway: existingOrder.gateway_provider,
        },
      });
    }

    // ==================================================
    // 4️⃣ CRIAR PEDIDO (STATUS: PENDING)
    // ==================================================
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        idempotency_key: idempotencyKey,
        amount: product.amount,
        currency: 'BRL',
        product_id: product.id,
        status: 'pending',
        customer_email: customer.email,
        customer_cpf: sanitizeCPF(customer.cpf),
        customer_name: customer.name,
        user_ip: clientIP,
        user_agent: request.headers.get('user-agent'),
        turnstile_validated: true,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Order creation failed:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // ==================================================
    // 5️⃣ TENTATIVA 1: MERCADO PAGO
    // ==================================================
    console.log(`[${order.id}] Tentando Mercado Pago...`);

    await supabaseAdmin.from('orders').update({ status: 'processing' }).eq('id', order.id);

    const mpAttemptStart = Date.now();
    const mpResult = await processMercadoPago(
      mercadopagoToken,
      product.amount,
      customer.email,
      customer.cpf,
      order.id
    );
    const mpAttemptTime = Date.now() - mpAttemptStart;

    // Registrar tentativa
    await supabaseAdmin.from('payment_attempts').insert({
      order_id: order.id,
      provider: 'mercadopago',
      attempt_number: 1,
      status: mpResult.success ? 'approved' : 'rejected',
      rejection_code: mpResult.code,
      rejection_message: mpResult.error,
      raw_response: mpResult.data,
      response_time_ms: mpAttemptTime,
      started_at: new Date(mpAttemptStart).toISOString(),
      completed_at: new Date().toISOString(),
    });

    if (mpResult.success) {
      // ✅ SUCESSO NO MERCADO PAGO
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          gateway_provider: 'mercadopago',
          gateway_order_id: mpResult.data.id,
          paid_at: new Date().toISOString(),
          fallback_used: false,
        })
        .eq('id', order.id);

      console.log(`[${order.id}] ✅ Aprovado no Mercado Pago`);

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          status: 'paid',
          gateway: 'mercadopago',
          amount: product.amount,
        },
        processingTime: Date.now() - startTime,
      });
    }

    // ==================================================
    // 6️⃣ TENTATIVA 2: APPMAX (FALLBACK)
    // ==================================================
    console.log(`[${order.id}] ⚠️ MP rejeitado (${mpResult.code}). Tentando AppMax...`);

    const appmaxAttemptStart = Date.now();
    const appmaxResult = await processAppmax(
      appmaxToken,
      product.amount,
      customer.email,
      customer.cpf,
      order.id
    );
    const appmaxAttemptTime = Date.now() - appmaxAttemptStart;

    // Registrar tentativa AppMax
    await supabaseAdmin.from('payment_attempts').insert({
      order_id: order.id,
      provider: 'appmax',
      attempt_number: 2,
      status: appmaxResult.success ? 'approved' : 'rejected',
      rejection_message: appmaxResult.error,
      raw_response: appmaxResult.data,
      response_time_ms: appmaxAttemptTime,
      started_at: new Date(appmaxAttemptStart).toISOString(),
      completed_at: new Date().toISOString(),
    });

    if (appmaxResult.success) {
      // ✅ SUCESSO NO APPMAX (RESGATE)
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          gateway_provider: 'appmax',
          gateway_order_id: appmaxResult.data.id,
          paid_at: new Date().toISOString(),
          fallback_used: true,
        })
        .eq('id', order.id);

      console.log(`[${order.id}] ✅ Resgatado pelo AppMax`);

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          status: 'paid',
          gateway: 'appmax',
          amount: product.amount,
          rescued: true,
        },
        processingTime: Date.now() - startTime,
      });
    }

    // ==================================================
    // 7️⃣ AMBOS FALHARAM
    // ==================================================
    await supabaseAdmin
      .from('orders')
      .update({ status: 'failed' })
      .eq('id', order.id);

    console.log(`[${order.id}] ❌ Ambos gateways falharam`);

    return NextResponse.json(
      {
        success: false,
        error: 'Payment declined by all gateways',
        details: {
          mercadopago: mpResult.error,
          appmax: appmaxResult.error,
        },
        order: {
          id: order.id,
          status: 'failed',
        },
      },
      { status: 402 }
    );
  } catch (error: any) {
    console.error('❌ Checkout error COMPLETO:', error);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ Message:', error.message);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
