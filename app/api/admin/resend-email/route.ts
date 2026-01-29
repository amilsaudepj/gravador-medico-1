import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// =====================================================
// API: Reenviar E-mail (Botão de Pânico)
// =====================================================
// Força o reenvio do e-mail de boas-vindas
// Ignora verificação de "já enviado" (force send)
// =====================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { customerEmail, saleId, emailType = 'welcome' } = await request.json()

    if (!customerEmail && !saleId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'É necessário informar o email do cliente ou ID da venda' 
        },
        { status: 400 }
      )
    }

    console.log('📧 [RESEND EMAIL] Iniciando reenvio forçado...')
    console.log('📨 Email:', customerEmail)
    console.log('🆔 Sale ID:', saleId)
    console.log('📋 Tipo:', emailType)

    // 1️⃣ BUSCAR DADOS DO CLIENTE
    let query = supabaseAdmin
      .from('sales')
      .select('id, customer_email, customer_name, total_amount, lovable_user_id, lovable_password')
      .order('created_at', { ascending: false })
      .limit(1)

    if (saleId) {
      query = query.eq('id', saleId)
    } else if (customerEmail) {
      query = query.eq('customer_email', customerEmail)
    }

    const { data: sales, error: saleError } = await query

    if (saleError) {
      console.error('❌ Erro ao buscar venda:', saleError)
      console.error('❌ Query details:', { saleId, customerEmail })
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar venda no banco', details: saleError.message },
        { status: 500 }
      )
    }

    if (!sales || sales.length === 0) {
      console.log('❌ Nenhuma venda encontrada:', { customerEmail, saleId })
      return NextResponse.json(
        { 
          success: false, 
          error: 'Nenhuma venda encontrada com status paid/provisioning/active' 
        },
        { status: 404 }
      )
    }

    const sale = sales[0]

    console.log('✅ Cliente encontrado:', {
      id: sale.id,
      email: sale.customer_email,
      name: sale.customer_name,
      hasLovableUser: !!sale.lovable_user_id
    })

    // 2️⃣ VERIFICAR SE TEM CREDENCIAIS LOVABLE
    if (!sale.lovable_user_id || !sale.lovable_password) {
      console.log('⚠️ Cliente não tem credenciais Lovable registradas')
      return NextResponse.json({
        success: false,
        error: 'Cliente não possui credenciais registradas. Execute "Resincronizar Venda" primeiro.'
      }, { status: 400 })
    }

    // 3️⃣ CONSTRUIR HTML DO EMAIL
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.gravadormedico.com.br'}/login`
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Gravador Médico</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🎉 Bem-vindo!</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">Seu acesso está pronto</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Olá <strong>${sale.customer_name || 'Cliente'}</strong>! 👋
              </p>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Seu pagamento foi confirmado e seu acesso ao <strong>Gravador Médico</strong> está liberado!
              </p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; border: 2px solid #e5e7eb; margin: 0 0 30px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      🔐 Suas Credenciais
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 13px;">E-mail:</p>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace;">
                            ${sale.customer_email}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 0 8px 0;">
                          <p style="margin: 0; color: #6b7280; font-size: 13px;">Senha:</p>
                          <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace;">
                            ${sale.lovable_password}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px 0;">
                    <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                      🚀 Acessar Plataforma
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Instructions -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid #e5e7eb; padding-top: 30px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 12px 0; color: #374151; font-size: 15px; font-weight: 600;">
                      📝 Primeiros Passos:
                    </p>
                    <ol style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                      <li>Clique no botão acima ou acesse: <a href="${loginUrl}" style="color: #667eea;">${loginUrl}</a></li>
                      <li>Faça login com seu e-mail e senha</li>
                      <li>Explore todas as funcionalidades da plataforma</li>
                      <li>Em caso de dúvidas, entre em contato conosco</li>
                    </ol>
                  </td>
                </tr>
              </table>

              <!-- Security Note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                      <strong>🔒 Dica de Segurança:</strong><br>
                      Recomendamos alterar sua senha no primeiro acesso. Nunca compartilhe suas credenciais com terceiros.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                Precisa de ajuda? Entre em contato conosco
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Gravador Médico. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `

    // 4️⃣ ENVIAR EMAIL VIA RESEND (FORCE SEND)
    console.log('📤 Enviando email via Resend...')

    const emailData = {
      from: 'Gravador Médico <suporte@gravadormedico.com.br>',
      to: sale.customer_email,
      subject: '🎉 Bem-vindo ao Gravador Médico - Seu Acesso Está Pronto!',
      html: emailHtml,
      tags: [
        { name: 'type', value: 'welcome' },
        { name: 'manual_resend', value: 'true' },
        { name: 'sale_id', value: sale.id }
      ]
    }

    const { data: emailResult, error: emailError } = await resend.emails.send(emailData)

    if (emailError) {
      console.error('❌ Erro ao enviar email:', emailError)
      
      // Registrar falha
      await supabaseAdmin
        .from('integration_logs')
        .insert({
          integration_type: 'resend',
          event_type: 'manual_resend_email',
          status: 'failed',
          sale_id: sale.id,
          customer_email: sale.customer_email,
          request_data: { action: 'force_resend', triggered_by: 'admin_panel' },
          response_data: { error: emailError }
        })

      return NextResponse.json(
        { success: false, error: `Erro ao enviar email: ${emailError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Email enviado com sucesso!')
    console.log('📧 Email ID:', emailResult?.id)

    // 5️⃣ REGISTRAR ENVIO NO BANCO
    await supabaseAdmin
      .from('email_logs')
      .insert({
        email_id: emailResult?.id,
        recipient_email: sale.customer_email,
        recipient_name: sale.customer_name,
        subject: '🎉 Bem-vindo ao Gravador Médico - Seu Acesso Está Pronto!',
        html_content: emailHtml,
        email_type: 'welcome',
        status: 'sent',
        order_id: sale.id,
        from_email: 'suporte@gravadormedico.com.br',
        from_name: 'Gravador Médico',
        metadata: {
          manual_resend: true,
          triggered_by: 'admin_panel',
          force_send: true
        }
      })

    // 6️⃣ REGISTRAR LOG DE SUCESSO
    await supabaseAdmin
      .from('integration_logs')
      .insert({
        integration_type: 'resend',
        event_type: 'manual_resend_email',
        status: 'success',
        sale_id: sale.id,
        customer_email: sale.customer_email,
        request_data: { 
          action: 'force_resend', 
          triggered_by: 'admin_panel',
          email_type: emailType
        },
        response_data: { 
          email_id: emailResult?.id,
          message: 'Email reenviado manualmente com sucesso'
        }
      })

    return NextResponse.json({
      success: true,
      message: `E-mail reenviado para ${sale.customer_email}`,
      emailId: emailResult?.id,
      saleId: sale.id,
      customerEmail: sale.customer_email
    })

  } catch (error) {
    console.error('❌ [RESEND EMAIL] Erro interno:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno ao reenviar email' 
      },
      { status: 500 }
    )
  }
}
