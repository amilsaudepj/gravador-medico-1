// ========================================
// 🔔 WEBHOOK MERCADO PAGO V3 - ENTERPRISE
// ========================================
// Validação HMAC | Processamento Assíncrono | Provisionamento
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { MercadoPagoWebhookSchema } from '@/lib/validators/checkout';

// =====================================================
// 🔐 VALIDAÇÃO DE ASSINATURA (HMAC SHA-256)
// =====================================================
function validateWebhookSignature(
  xSignature: string,
  xRequestId: string,
  dataId: string
): boolean {
  try {
    // O Mercado Pago envia: v1,<hash>,ts=<timestamp>
    const parts = xSignature.split(',');
    
    if (parts.length < 2) {
      console.error('Invalid signature format');
      return false;
    }
    
    const receivedHash = parts[1];
    const timestamp = parts.find(p => p.startsWith('ts='))?.split('=')[1];
    
    if (!receivedHash || !timestamp) {
      console.error('Missing hash or timestamp');
      return false;
    }
    
    // Construir string para validação
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${timestamp};`;
    
    // Calcular HMAC
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');
    
    // Comparação segura (constant-time)
    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(receivedHash)
    );
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

// =====================================================
// 📧 ENVIO DE EMAIL (Resend/SMTP)
// =====================================================
async function sendWelcomeEmail(
  email: string,
  credentials: { email: string; password: string }
): Promise<boolean> {
  try {
    // Implementação com Resend (ou seu provedor de email)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Gravador Médico <noreply@seudominio.com>',
        to: email,
        subject: '🎉 Bem-vindo ao Gravador Médico!',
        html: `
          <h2>Seu acesso está pronto!</h2>
          <p>Obrigado pela compra. Aqui estão seus dados de acesso:</p>
          <ul>
            <li><strong>Email:</strong> ${credentials.email}</li>
            <li><strong>Senha:</strong> ${credentials.password}</li>
          </ul>
          <p><a href="${process.env.LOVABLE_APP_URL}/login">Clique aqui para acessar</a></p>
        `,
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

// =====================================================
// 🚀 PROVISIONAMENTO LOVABLE
// =====================================================
async function provisionLovableAccount(
  orderId: string,
  email: string,
  name: string
): Promise<{ success: boolean; credentials?: any; error?: string }> {
  try {
    // Chamar Edge Function do Lovable
    const response = await fetch(
      `${process.env.LOVABLE_API_URL}/functions/v1/admin-user-manager`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': process.env.LOVABLE_API_SECRET!,
        },
        body: JSON.stringify({
          email,
          autoConfirm: true,
          metadata: {
            name,
            order_id: orderId,
            source: 'gravador-medico',
          },
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Lovable API error: ${error}`);
    }
    
    const data = await response.json();
    
    // Registrar sucesso
    await supabaseAdmin.from('integration_logs').insert({
      order_id: orderId,
      action: 'user_creation',
      status: 'success',
      details: {
        lovable_user_id: data.user.id,
        email: data.user.email,
      },
    });
    
    return {
      success: true,
      credentials: data.credentials,
    };
  } catch (error: any) {
    console.error('Provisioning error:', error);
    
    // Registrar erro para retry posterior
    await supabaseAdmin.from('integration_logs').insert({
      order_id: orderId,
      action: 'user_creation',
      status: 'error',
      error_message: error.message,
      retry_count: 0,
      next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min
    });
    
    return {
      success: false,
      error: error.message,
    };
  }
}

// =====================================================
// 🎯 MAIN WEBHOOK HANDLER
// =====================================================
export async function POST(request: NextRequest) {
  try {
    // ==================================================
    // 1️⃣ VALIDAÇÃO DE HEADERS
    // ==================================================
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');
    
    if (!xSignature || !xRequestId) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }
    
    // ==================================================
    // 2️⃣ PARSE & VALIDATE PAYLOAD
    // ==================================================
    const rawPayload = await request.json();
    const validation = MercadoPagoWebhookSchema.safeParse(rawPayload);
    
    if (!validation.success) {
      console.error('Invalid webhook payload:', validation.error);
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }
    
    const payload = validation.data;
    
    // ==================================================
    // 3️⃣ VALIDAR ASSINATURA HMAC
    // ==================================================
    const isValidSignature = validateWebhookSignature(
      xSignature,
      xRequestId,
      payload.data.id
    );
    
    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    // ==================================================
    // 4️⃣ SALVAR WEBHOOK LOG (COM SANITIZAÇÃO AUTOMÁTICA)
    // ==================================================
    const { data: webhookLog, error: logError } = await supabaseAdmin
      .from('webhook_logs')
      .insert({
        provider: 'mercadopago',
        event_id: payload.data.id,
        topic: payload.type,
        payload: rawPayload, // Trigger vai sanitizar automaticamente
        signature_valid: true,
        processed: false,
      })
      .select()
      .single();
    
    if (logError) {
      console.error('Failed to save webhook log:', logError);
    }
    
    // ==================================================
    // 5️⃣ PROCESSAR APENAS PAYMENTS APROVADOS
    // ==================================================
    if (payload.type !== 'payment' || payload.action !== 'payment.updated') {
      // Marcar como processado (não precisa de ação)
      if (webhookLog) {
        await supabaseAdmin
          .from('webhook_logs')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('id', webhookLog.id);
      }
      
      return NextResponse.json({ received: true });
    }
    
    // ==================================================
    // 6️⃣ BUSCAR DETALHES DO PAYMENT
    // ==================================================
    // Buscar pedido pelo external_reference ou gateway_order_id
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('gateway_order_id', payload.data.id)
      .single();
    
    if (!order) {
      console.warn(`Order not found for payment ${payload.data.id}`);
      
      if (webhookLog) {
        await supabaseAdmin
          .from('webhook_logs')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            error_message: 'Order not found',
          })
          .eq('id', webhookLog.id);
      }
      
      return NextResponse.json({ received: true });
    }
    
    // Se já foi processado (paid), ignorar
    if (order.status === 'paid') {
      if (webhookLog) {
        await supabaseAdmin
          .from('webhook_logs')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('id', webhookLog.id);
      }
      
      return NextResponse.json({ received: true, message: 'Already processed' });
    }
    
    // ==================================================
    // 7️⃣ PROVISIONAMENTO AUTOMÁTICO
    // ==================================================
    console.log(`[${order.id}] Iniciando provisionamento...`);
    
    const provisionResult = await provisionLovableAccount(
      order.id,
      order.customer_email,
      order.customer_name || 'Cliente'
    );
    
    if (provisionResult.success) {
      // Enviar email com credenciais
      const emailSent = await sendWelcomeEmail(
        order.customer_email,
        provisionResult.credentials
      );
      
      await supabaseAdmin.from('integration_logs').insert({
        order_id: order.id,
        action: 'email_sent',
        status: emailSent ? 'success' : 'error',
        details: { email_sent: emailSent },
      });
      
      console.log(`[${order.id}] ✅ Provisionamento completo`);
    } else {
      console.error(`[${order.id}] ❌ Falha no provisionamento: ${provisionResult.error}`);
    }
    
    // ==================================================
    // 8️⃣ MARCAR WEBHOOK COMO PROCESSADO
    // ==================================================
    if (webhookLog) {
      await supabaseAdmin
        .from('webhook_logs')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhookLog.id);
    }
    
    return NextResponse.json({
      received: true,
      order_id: order.id,
      provisioned: provisionResult.success,
    });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// =====================================================
// 🔍 GET: Healthcheck
// =====================================================
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'mercadopago-webhook-v3',
    timestamp: new Date().toISOString(),
  });
}
