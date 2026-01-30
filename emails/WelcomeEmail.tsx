import * as React from 'react'

interface WelcomeEmailProps {
  customerName: string
  userEmail: string
  userPassword: string
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
  muted: '#E8F8F5',
}

export const WelcomeEmail: React.FC<Readonly<WelcomeEmailProps>> = ({
  customerName,
  userEmail,
  userPassword,
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
        <title>Bem-vindo(a) ao Gravador Médico</title>
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
                    <tr>
                      <td style={{ background: 'linear-gradient(135deg, ' + colors.primary + ' 0%, ' + colors.accent + ' 100%)', padding: '50px 40px', textAlign: 'center' }}>
                        <table width="100%" cellPadding={0} cellSpacing={0}>
                          <tbody>
                            <tr>
                              <td align="center" style={{ paddingBottom: '20px' }}>
                                <img src="https://www.gravadormedico.com.br/images/novo-icon-gravadormedico.png" alt="Gravador Médico" style={{ width: '60px', height: '60px', display: 'block', margin: '0 auto' }} />
                              </td>
                            </tr>
                            <tr>
                              <td align="center">
                                <h1 style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
                                  Bem-vindo(a) ao Gravador Médico
                                </h1>
                                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', margin: '12px 0 0 0' }}>
                                  Seu acesso está pronto para uso
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '40px' }}>
                        <p style={{ color: colors.textPrimary, fontSize: '18px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                          Olá, <strong>{customerName}</strong>,
                        </p>
                        <p style={{ color: colors.textSecondary, fontSize: '16px', lineHeight: '1.6', margin: '0 0 32px 0' }}>
                          Sua compra foi confirmada com sucesso! Abaixo estão suas credenciais de acesso à plataforma.
                        </p>
                        <div style={{ backgroundColor: colors.muted, borderRadius: '12px', padding: '28px', marginBottom: '32px', border: '1px solid ' + colors.primary + '20' }}>
                          <h2 style={{ color: colors.primary, fontSize: '16px', fontWeight: 600, margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Suas Credenciais de Acesso
                          </h2>
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '4px' }}>E-mail</div>
                            <div style={{ backgroundColor: colors.card, padding: '14px 16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '15px', color: colors.textPrimary, border: '1px solid ' + colors.border }}>
                              {userEmail}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '4px' }}>Senha</div>
                            <div style={{ backgroundColor: colors.card, padding: '14px 16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '15px', color: colors.textPrimary, border: '1px solid ' + colors.border }}>
                              {userPassword}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                          <a href="https://gravadormedico.com/" style={{ display: 'inline-block', backgroundColor: colors.primary, color: '#FFFFFF', padding: '16px 40px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '16px' }}>
                            Acessar Plataforma →
                          </a>
                        </div>
                        <div style={{ backgroundColor: colors.background, borderRadius: '12px', padding: '24px', border: '1px solid ' + colors.border }}>
                          <h3 style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600, margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Detalhes do Pedido
                          </h3>
                          <table width="100%" cellPadding={0} cellSpacing={0}>
                            <tbody>
                              <tr>
                                <td style={{ color: colors.textSecondary, fontSize: '14px', padding: '8px 0' }}>Número do Pedido</td>
                                <td style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600, padding: '8px 0', textAlign: 'right' }}>{formatOrderId(orderId)}</td>
                              </tr>
                              <tr>
                                <td style={{ color: colors.textSecondary, fontSize: '14px', padding: '8px 0', borderTop: '1px solid ' + colors.border }}>Valor</td>
                                <td style={{ color: colors.success, fontSize: '14px', fontWeight: 600, padding: '8px 0', textAlign: 'right', borderTop: '1px solid ' + colors.border }}>{formatCurrency(orderValue)}</td>
                              </tr>
                              <tr>
                                <td style={{ color: colors.textSecondary, fontSize: '14px', padding: '8px 0', borderTop: '1px solid ' + colors.border }}>Pagamento</td>
                                <td style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600, padding: '8px 0', textAlign: 'right', borderTop: '1px solid ' + colors.border }}>{formatPaymentMethod(paymentMethod)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ backgroundColor: colors.background, padding: '30px 40px', textAlign: 'center', borderTop: '1px solid ' + colors.border }}>
                        <p style={{ color: colors.textSecondary, fontSize: '14px', margin: '0 0 8px 0' }}>Precisa de ajuda? Entre em contato conosco</p>
                        <a href="mailto:suporte@gravadormedico.com.br" style={{ color: colors.primary, fontSize: '14px', textDecoration: 'none' }}>suporte@gravadormedico.com.br</a>
                        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid ' + colors.border }}>
                          <p style={{ color: colors.textSecondary, fontSize: '12px', margin: 0 }}>© 2026 Gravador Médico. Todos os direitos reservados.</p>
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

export default WelcomeEmail
