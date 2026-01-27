/**
 * Helper para gerar URLs de redirecionamento após pagamento aprovado
 * Usado pelos webhooks do Mercado Pago e Appmax
 */

interface RedirectParams {
  orderId: string;
  status: 'approved' | 'success';
  paymentMethod: 'credit_card' | 'pix' | 'boleto';
  amount: number;
  transactionId?: string;
}

/**
 * Gera URL de redirecionamento para página de obrigado
 * @param params - Parâmetros do pagamento
 * @returns URL completa de redirecionamento
 */
export function generateRedirectUrl(params: RedirectParams): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const searchParams = new URLSearchParams({
    order_id: params.orderId,
    status: params.status,
    payment_method: params.paymentMethod,
    amount: params.amount.toString(),
  });

  if (params.transactionId) {
    searchParams.set('transaction_id', params.transactionId);
  }

  return `${baseUrl}/obrigado?${searchParams.toString()}`;
}

/**
 * Valida se uma URL de redirecionamento é segura
 * @param url - URL para validar
 * @returns true se a URL é segura
 */
export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const allowedHosts = [
      'localhost',
      '127.0.0.1',
      process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, ''),
    ].filter(Boolean);

    return allowedHosts.some(host => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

/**
 * Extrai parâmetros da URL de redirecionamento
 * @param url - URL para extrair parâmetros
 * @returns Objeto com parâmetros extraídos
 */
export function parseRedirectUrl(url: string): RedirectParams | null {
  try {
    const parsedUrl = new URL(url);
    const params = parsedUrl.searchParams;

    const orderId = params.get('order_id');
    const status = params.get('status');
    const paymentMethod = params.get('payment_method');
    const amount = params.get('amount');

    if (!orderId || !status || !paymentMethod || !amount) {
      return null;
    }

    return {
      orderId,
      status: status as 'approved' | 'success',
      paymentMethod: paymentMethod as 'credit_card' | 'pix' | 'boleto',
      amount: parseFloat(amount),
      transactionId: params.get('transaction_id') || undefined,
    };
  } catch {
    return null;
  }
}
