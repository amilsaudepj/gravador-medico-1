import * as React from 'react'

interface PurchaseConfirmationEmailProps {
  customerName: string
  orderId: string
  orderValue: number
  paymentMethod: string
}

const colors = {
  primary: '#16A085',
  primaryDark: '#138D75',
  accent: '#2EAE9A',
  background: '#F7F9FA',
  card: '#FFFFFF',
  textPrimary: '#1A2E38',
  textSecondary: '#5C7080',
  border: '#D8DEE4',
  success: '#16A34A',
  warning: '#F59E0B',
  muted: '#E8F8F5',
}

/**
 * 🎉 EMAIL DE CONFIRMAÇÃO DE COMPRA (FAST RESPONSE)
 * 
 * Este email é enviado IMEDIATAMENTE após pagamento aprovado.
 * Objetivo: Tranquilizar o cliente enquanto o sistema processa o acesso.
 * 
 * - Confirmação visual de que a compra foi recebida
 * - Mensagem clara de que o acesso está sendo gerado
 * - Tempo estimado de 2 minutos para receber credenciais
 */
export const PurchaseConfirmationEmail: React.FC<Readonly<PurchaseConfirmationEmailProps>> = ({
  customerName,
  orderId,
  orderValue,
  paymentMethod,
}) => {
  const formatOrderId = (id: string): string => {
    if (id.includes('-')) {
      return '#' + id.split('-')[0].toUpperCase()
    }
    return '#' + id.substring(0, 8).toUpperCase()
  }

  const formatPaymentMethod = (method: string): string => {
    const methods: Record<string, string> = {
      'pix': 'PIX',
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'boleto': 'Boleto Bancário',
      'appmax': 'Cartão de Crédito',
      'mercadopago': 'Mercado Pago',
    }
    return methods[method.toLowerCase()] || method
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Compra Confirmada - Gravador Médico</title>
      </head>
      <body style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        backgroundColor: colors.background,
        margin: 0,
        padding: 0,
      }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: colors.background, padding: '40px 20px' }}>
          <tbody>
            <tr>
              <td align="center">
                <table width={600} cellPadding={0} cellSpacing={0} style={{ backgroundColor: colors.card, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                  <tbody>
                    {/* Header com gradiente verde */}
                    <tr>
                      <td style={{ background: 'linear-gradient(135deg, ' + colors.success + ' 0%, ' + colors.primary + ' 100%)', padding: '50px 40px', textAlign: 'center' }}>
                        <div style={{ marginBottom: '20px' }}>
                          <span style={{ fontSize: '64px', display: 'inline-block' }}>✅</span>
                        </div>
                        <h1 style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
                          Pagamento Confirmado!
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: '16px', margin: '12px 0 0 0' }}>
                          Recebemos seu pedido com sucesso
                        </p>
                      </td>
                    </tr>

                    {/* Corpo principal */}
                    <tr>
                      <td style={{ padding: '40px' }}>
                        <p style={{ color: colors.textPrimary, fontSize: '18px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                          Parabéns, <strong>{customerName}</strong>! 🎉
                        </p>
                        
                        <p style={{ color: colors.textSecondary, fontSize: '16px', lineHeight: '1.7', margin: '0 0 28px 0' }}>
                          Sua compra do <strong style={{ color: colors.primary }}>Gravador Médico</strong> foi confirmada! 
                          Este é um e-mail automático para confirmar que recebemos seu pagamento.
                        </p>

                        {/* Caixa de destaque - Gerando acesso */}
                        <div style={{ 
                          backgroundColor: '#FEF3C7', 
                          borderRadius: '12px', 
                          padding: '24px 28px', 
                          marginBottom: '32px',
                          border: '1px solid #FCD34D',
                          textAlign: 'center'
                        }}>
                          <div style={{ marginBottom: '12px' }}>
                            <span style={{ fontSize: '32px' }}>⏳</span>
                          </div>
                          <h2 style={{ 
                            color: '#92400E', 
                            fontSize: '18px', 
                            fontWeight: 700, 
                            margin: '0 0 12px 0' 
                          }}>
                            Estamos gerando seu acesso exclusivo
                          </h2>
                          <p style={{ 
                            color: '#B45309', 
                            fontSize: '15px', 
                            lineHeight: '1.6',
                            margin: 0 
                          }}>
                            Em até <strong>2 minutos</strong> você receberá outro e-mail com sua 
                            <strong> senha de acesso</strong> à plataforma.
                          </p>
                        </div>

                        {/* O que esperar */}
                        <div style={{ 
                          backgroundColor: colors.muted, 
                          borderRadius: '12px', 
                          padding: '24px', 
                          marginBottom: '28px',
                          border: '1px solid ' + colors.primary + '30'
                        }}>
                          <h3 style={{ 
                            color: colors.primary, 
                            fontSize: '15px', 
                            fontWeight: 600, 
                            margin: '0 0 16px 0',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            📋 O que vai acontecer agora?
                          </h3>
                          <table width="100%" cellPadding={0} cellSpacing={0}>
                            <tbody>
                              <tr>
                                <td style={{ padding: '10px 0', verticalAlign: 'top', width: '30px' }}>
                                  <span style={{ fontSize: '18px' }}>1️⃣</span>
                                </td>
                                <td style={{ padding: '10px 0', color: colors.textSecondary, fontSize: '14px', lineHeight: '1.5' }}>
                                  <strong style={{ color: colors.textPrimary }}>Criando sua conta</strong><br />
                                  Nosso sistema está gerando seu login exclusivo
                                </td>
                              </tr>
                              <tr>
                                <td style={{ padding: '10px 0', verticalAlign: 'top', width: '30px' }}>
                                  <span style={{ fontSize: '18px' }}>2️⃣</span>
                                </td>
                                <td style={{ padding: '10px 0', color: colors.textSecondary, fontSize: '14px', lineHeight: '1.5' }}>
                                  <strong style={{ color: colors.textPrimary }}>Enviando credenciais</strong><br />
                                  Você receberá e-mail com sua senha em instantes
                                </td>
                              </tr>
                              <tr>
                                <td style={{ padding: '10px 0', verticalAlign: 'top', width: '30px' }}>
                                  <span style={{ fontSize: '18px' }}>3️⃣</span>
                                </td>
                                <td style={{ padding: '10px 0', color: colors.textSecondary, fontSize: '14px', lineHeight: '1.5' }}>
                                  <strong style={{ color: colors.textPrimary }}>Acesso liberado!</strong><br />
                                  Use as credenciais para entrar em gravadormedico.com
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Detalhes do pedido */}
                        <div style={{ 
                          backgroundColor: colors.background, 
                          borderRadius: '12px', 
                          padding: '24px', 
                          border: '1px solid ' + colors.border 
                        }}>
                          <h3 style={{ 
                            color: colors.textPrimary, 
                            fontSize: '14px', 
                            fontWeight: 600, 
                            margin: '0 0 16px 0', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.5px' 
                          }}>
                            🧾 Resumo do Pedido
                          </h3>
                          <table width="100%" cellPadding={0} cellSpacing={0}>
                            <tbody>
                              <tr>
                                <td style={{ color: colors.textSecondary, fontSize: '14px', padding: '8px 0' }}>Número do Pedido</td>
                                <td style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600, padding: '8px 0', textAlign: 'right' }}>
                                  {formatOrderId(orderId)}
                                </td>
                              </tr>
                              <tr>
                                <td style={{ color: colors.textSecondary, fontSize: '14px', padding: '8px 0', borderTop: '1px solid ' + colors.border }}>Produto</td>
                                <td style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600, padding: '8px 0', textAlign: 'right', borderTop: '1px solid ' + colors.border }}>
                                  Gravador Médico
                                </td>
                              </tr>
                              <tr>
                                <td style={{ color: colors.textSecondary, fontSize: '14px', padding: '8px 0', borderTop: '1px solid ' + colors.border }}>Valor</td>
                                <td style={{ color: colors.success, fontSize: '14px', fontWeight: 700, padding: '8px 0', textAlign: 'right', borderTop: '1px solid ' + colors.border }}>
                                  {formatCurrency(orderValue)}
                                </td>
                              </tr>
                              <tr>
                                <td style={{ color: colors.textSecondary, fontSize: '14px', padding: '8px 0', borderTop: '1px solid ' + colors.border }}>Pagamento</td>
                                <td style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600, padding: '8px 0', textAlign: 'right', borderTop: '1px solid ' + colors.border }}>
                                  {formatPaymentMethod(paymentMethod)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td style={{ backgroundColor: colors.background, padding: '30px 40px', textAlign: 'center', borderTop: '1px solid ' + colors.border }}>
                        <p style={{ color: colors.textSecondary, fontSize: '14px', margin: '0 0 8px 0' }}>
                          Não recebeu o e-mail de acesso em 5 minutos? Verifique a pasta de spam ou entre em contato:
                        </p>
                        <a 
                          href="mailto:suporte@gravadormedico.com.br" 
                          style={{ color: colors.primary, fontSize: '14px', textDecoration: 'none', fontWeight: 600 }}
                        >
                          suporte@gravadormedico.com.br
                        </a>
                        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid ' + colors.border }}>
                          <p style={{ color: colors.textSecondary, fontSize: '12px', margin: 0 }}>
                            © 2026 Gravador Médico. Todos os direitos reservados.
                          </p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  )
}

export default PurchaseConfirmationEmail
