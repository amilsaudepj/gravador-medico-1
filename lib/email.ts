import { Resend } from 'resend'
import WelcomeEmail from '@/emails/WelcomeEmail'
import PurchaseConfirmationEmail from '@/emails/PurchaseConfirmationEmail'
import { supabaseAdmin } from './supabase'
import { render } from '@react-email/render'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendWelcomeEmailParams {
  to: string
  customerName: string
  userEmail: string
  userPassword: string
  orderId: string
  orderValue: number
  paymentMethod: string
}

/**
 * Envia email de boas-vindas com credenciais
 */
export async function sendWelcomeEmail(params: SendWelcomeEmailParams) {
  try {
    // Criar componente do email
    const emailComponent = WelcomeEmail({
      customerName: params.customerName,
      userEmail: params.userEmail,
      userPassword: params.userPassword,
      orderId: params.orderId,
      orderValue: params.orderValue,
      paymentMethod: params.paymentMethod,
    })

    // Renderizar para HTML (para salvar no banco)
    let htmlContent = ''
    try {
      htmlContent = await render(emailComponent)
    } catch (renderError) {
      console.warn('⚠️ Não foi possível renderizar HTML do email:', renderError)
    }

    // Enviar o e-mail
    const { data, error } = await resend.emails.send({
      from: 'Gravador Médico <suporte@gravadormedico.com.br>',
      to: params.to,
      subject: 'Bem-vindo(a) ao Gravador Médico - Seus Dados de Acesso',
      react: emailComponent as any,
    })

    if (error) {
      console.error('❌ Erro ao enviar email:', error)
      
      // Salvar log de erro
      await supabaseAdmin.from('email_logs').insert({
        recipient_email: params.to,
        recipient_name: params.customerName,
        subject: 'Bem-vindo(a) ao Gravador Médico - Seus Dados de Acesso',
        html_content: htmlContent || null,
        email_type: 'welcome',
        from_email: 'suporte@gravadormedico.com.br',
        from_name: 'Gravador Médico',
        order_id: params.orderId,
        status: 'failed',
        error_message: error.message,
        metadata: {
          user_email: params.userEmail,
          order_value: params.orderValue,
          payment_method: params.paymentMethod,
        },
      });
      
      throw error
    }

    // Salvar log de sucesso no banco (com HTML para preview)
    await supabaseAdmin.from('email_logs').insert({
      email_id: data?.id,
      recipient_email: params.to,
      recipient_name: params.customerName,
      subject: 'Bem-vindo(a) ao Gravador Médico - Seus Dados de Acesso',
      html_content: htmlContent || null,
      email_type: 'welcome',
      from_email: 'suporte@gravadormedico.com.br',
      from_name: 'Gravador Médico',
      order_id: params.orderId,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: {
        user_email: params.userEmail,
        order_value: params.orderValue,
        payment_method: params.paymentMethod,
      },
    });

    console.log('✅ Email enviado com sucesso:', data?.id)
    return { success: true, emailId: data?.id }
  } catch (error: any) {
    console.error('❌ Erro crítico ao enviar email:', error)
    return { success: false, error: error.message }
  }
}

// =====================================================
// 📧 TAREFA 1: EMAIL IMEDIATO DE CONFIRMAÇÃO (FAST RESPONSE)
// =====================================================
export interface SendPurchaseConfirmationParams {
  to: string
  customerName: string
  orderId: string
  orderValue: number
  paymentMethod: string
}

/**
 * 🚀 Envia email de confirmação de compra IMEDIATAMENTE
 * 
 * Este email é enviado no momento do pagamento aprovado,
 * ANTES de criar usuário ou qualquer outro processamento.
 * 
 * Objetivo: Tranquilizar o cliente de que a compra foi recebida.
 */
export async function sendPurchaseConfirmationEmail(params: SendPurchaseConfirmationParams) {
  const startTime = Date.now()
  
  try {
    console.log(`📧 [FAST] Enviando confirmação de compra para: ${params.to}`)

    // Criar componente do email
    const emailComponent = PurchaseConfirmationEmail({
      customerName: params.customerName,
      orderId: params.orderId,
      orderValue: params.orderValue,
      paymentMethod: params.paymentMethod,
    })

    // Renderizar para HTML (para logs)
    let htmlContent = ''
    try {
      htmlContent = await render(emailComponent)
    } catch (renderError) {
      console.warn('⚠️ Não foi possível renderizar HTML:', renderError)
    }

    // Enviar o e-mail
    const { data, error } = await resend.emails.send({
      from: 'Gravador Médico <suporte@gravadormedico.com.br>',
      to: params.to,
      subject: '✅ Compra Confirmada! Seu acesso está sendo gerado - Gravador Médico',
      react: emailComponent as any,
    })

    const duration = Date.now() - startTime

    if (error) {
      console.error(`❌ [FAST] Erro ao enviar confirmação (${duration}ms):`, error)
      
      // Log de erro (não bloqueia o fluxo)
      try {
        await supabaseAdmin.from('email_logs').insert({
          recipient_email: params.to,
          recipient_name: params.customerName,
          subject: '✅ Compra Confirmada! Seu acesso está sendo gerado - Gravador Médico',
          html_content: htmlContent || null,
          email_type: 'purchase_confirmation',
          from_email: 'suporte@gravadormedico.com.br',
          from_name: 'Gravador Médico',
          order_id: params.orderId,
          status: 'failed',
          error_message: error.message,
          metadata: {
            order_value: params.orderValue,
            payment_method: params.paymentMethod,
            duration_ms: duration,
          },
        })
      } catch (logError) {
        console.warn('⚠️ Erro ao salvar log de email:', logError)
      }
      
      return { success: false, error: error.message }
    }

    // Log de sucesso
    try {
      await supabaseAdmin.from('email_logs').insert({
        email_id: data?.id,
        recipient_email: params.to,
        recipient_name: params.customerName,
        subject: '✅ Compra Confirmada! Seu acesso está sendo gerado - Gravador Médico',
        html_content: htmlContent || null,
        email_type: 'purchase_confirmation',
        from_email: 'suporte@gravadormedico.com.br',
        from_name: 'Gravador Médico',
        order_id: params.orderId,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          order_value: params.orderValue,
          payment_method: params.paymentMethod,
          duration_ms: duration,
        },
      })
    } catch (logError) {
      console.warn('⚠️ Erro ao salvar log de email:', logError)
    }

    console.log(`✅ [FAST] Confirmação enviada em ${duration}ms: ${data?.id}`)
    return { success: true, emailId: data?.id }
  } catch (error: any) {
    console.error('❌ [FAST] Erro crítico ao enviar confirmação:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Envia email de confirmação de PIX pendente
 */
export async function sendPixPendingEmail(params: {
  to: string
  customerName: string
  orderId: string
  orderValue: number
  pixQrCode: string
  pixEmv: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Gravador Médico <suporte@gravadormedico.com.br>',
      to: params.to,
      subject: '⏳ Aguardando Pagamento PIX - Gravador Médico',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">⏳ Aguardando seu Pagamento</h1>
          <p>Olá, <strong>${params.customerName}</strong>!</p>
          <p>Seu pedido #${params.orderId} no valor de <strong>R$ ${params.orderValue.toFixed(2)}</strong> está aguardando pagamento via PIX.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📱 QR Code PIX</h3>
            <img src="data:image/png;base64,${params.pixQrCode}" alt="QR Code PIX" style="max-width: 300px;" />
            
            <h3 style="margin-top: 20px;">💾 Pix Copia e Cola</h3>
            <code style="display: block; background: white; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">
              ${params.pixEmv}
            </code>
          </div>

          <p><strong>Após o pagamento, seu acesso será liberado automaticamente!</strong></p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Qualquer dúvida, estamos à disposição!<br />
            Equipe Gravador Médico
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('❌ Erro ao enviar email PIX:', error)
      throw error
    }

    console.log('✅ Email PIX enviado:', data?.id)
    return { success: true, emailId: data?.id }
  } catch (error: any) {
    console.error('❌ Erro ao enviar email PIX:', error)
    return { success: false, error: error.message }
  }
}
