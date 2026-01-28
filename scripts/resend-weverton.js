#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })

const EMAIL = 'wevertonfcarvalho@hotmail.com'
const NAME = 'Weverton Filho Carvalho'
const PASSWORD = 'Gm8kL2pX5wQz'
const ORDER_ID = '12071f07-2414-4196-8d8f-a07f884d3355'

async function main() {
  const { Resend } = require('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #F7F9FA; margin: 0; padding: 40px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
              <tr>
                <td style="background: linear-gradient(135deg, #16A085 0%, #2EAE9A 100%); padding: 50px 40px; text-align: center;">
                  <span style="font-size: 48px;">🎙️</span>
                  <h1 style="color: #FFFFFF; font-size: 28px; margin: 20px 0 0 0;">Bem-vindo ao Gravador Médico!</h1>
                  <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 12px 0 0 0;">Seu acesso está pronto para uso</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #1A2E38; font-size: 18px; margin: 0 0 24px 0;">Olá, <strong>${NAME}</strong>! 👋</p>
                  <p style="color: #5C7080; font-size: 16px; margin: 0 0 32px 0;">Sua compra foi confirmada com sucesso! Abaixo estão suas credenciais de acesso.</p>
                  
                  <div style="background-color: #E8F8F5; border-radius: 12px; padding: 28px; margin-bottom: 32px;">
                    <h2 style="color: #16A085; font-size: 16px; margin: 0 0 20px 0;">🔐 SUAS CREDENCIAIS DE ACESSO</h2>
                    <div style="margin-bottom: 16px;">
                      <div style="color: #5C7080; font-size: 13px; margin-bottom: 4px;">E-mail</div>
                      <div style="background-color: #FFFFFF; padding: 14px 16px; border-radius: 8px; font-family: monospace; font-size: 15px; color: #1A2E38; border: 1px solid #D8DEE4;">
                        ${EMAIL}
                      </div>
                    </div>
                    <div>
                      <div style="color: #5C7080; font-size: 13px; margin-bottom: 4px;">Senha</div>
                      <div style="background-color: #FFFFFF; padding: 14px 16px; border-radius: 8px; font-family: monospace; font-size: 15px; color: #1A2E38; border: 1px solid #D8DEE4;">
                        ${PASSWORD}
                      </div>
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin-bottom: 32px;">
                    <a href="https://gravadormedico.com" style="display: inline-block; background-color: #16A085; color: #FFFFFF; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                      Acessar Plataforma →
                    </a>
                  </div>
                  
                  <div style="background-color: #F7F9FA; border-radius: 12px; padding: 24px;">
                    <h3 style="color: #1A2E38; font-size: 14px; margin: 0 0 16px 0;">📋 DETALHES DO PEDIDO</h3>
                    <table width="100%">
                      <tr>
                        <td style="color: #5C7080; font-size: 14px; padding: 8px 0;">Pedido</td>
                        <td style="color: #1A2E38; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">#12071F07</td>
                      </tr>
                      <tr>
                        <td style="color: #5C7080; font-size: 14px; padding: 8px 0; border-top: 1px solid #D8DEE4;">Valor</td>
                        <td style="color: #16A34A; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right; border-top: 1px solid #D8DEE4;">R$ 36,00</td>
                      </tr>
                      <tr>
                        <td style="color: #5C7080; font-size: 14px; padding: 8px 0; border-top: 1px solid #D8DEE4;">Pagamento</td>
                        <td style="color: #1A2E38; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right; border-top: 1px solid #D8DEE4;">PIX</td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #F7F9FA; padding: 30px 40px; text-align: center; border-top: 1px solid #D8DEE4;">
                  <p style="color: #5C7080; font-size: 14px; margin: 0 0 8px 0;">Precisa de ajuda?</p>
                  <a href="mailto:suporte@gravadormedico.com.br" style="color: #16A085; font-size: 14px; text-decoration: none;">suporte@gravadormedico.com.br</a>
                  <p style="color: #5C7080; font-size: 12px; margin: 24px 0 0 0;">© 2026 Gravador Médico. Todos os direitos reservados.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
  
  console.log('Reenviando email para', EMAIL)
  
  const result = await resend.emails.send({
    from: 'Gravador Médico <suporte@gravadormedico.com.br>',
    to: EMAIL,
    subject: 'Bem-vindo ao Gravador Médico - Seus Dados de Acesso',
    html
  })
  
  console.log('Email enviado! ID:', result.data?.id)
  
  // Salvar no banco
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  await supabase.from('email_logs').insert({
    email_id: result.data?.id,
    recipient_email: EMAIL,
    recipient_name: NAME,
    subject: 'Bem-vindo ao Gravador Médico - Seus Dados de Acesso',
    html_content: html,
    email_type: 'welcome',
    from_email: 'suporte@gravadormedico.com.br',
    from_name: 'Gravador Médico',
    order_id: ORDER_ID,
    status: 'sent',
    sent_at: new Date().toISOString(),
    metadata: { user_email: EMAIL, order_value: 36, payment_method: 'pix', resend: true }
  })
  
  console.log('✅ Email reenviado com URL corrigida!')
}

main().catch(console.error)
