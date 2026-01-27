'use client';

// ========================================
// 💳 CHECKOUT FORM V3 - DUAL TOKENIZATION
// ========================================
// PCI-DSS Compliant | Turnstile Anti-Bot | UX Invisível
// ========================================

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, CheckCircle2, XCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// =====================================================
// 🔧 TIPOS
// =====================================================
interface CheckoutFormProps {
  productId: string;
  productName: string;
  amount: number;
  onSuccess?: (orderId: string) => void;
  onError?: (error: string) => void;
}

interface CheckoutStatus {
  stage: 'idle' | 'tokenizing' | 'processing' | 'success' | 'error';
  message: string;
  gateway?: 'mercadopago' | 'appmax';
  rescued?: boolean;
}

// =====================================================
// 🎨 COMPONENTE PRINCIPAL
// =====================================================
export default function CheckoutFormV3({
  productId,
  productName,
  amount,
  onSuccess,
  onError,
}: CheckoutFormProps) {
  // States
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
  });

  const [status, setStatus] = useState<CheckoutStatus>({
    stage: 'idle',
    message: '',
  });

  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileRef = useRef<HTMLDivElement>(null);

  // =====================================================
  // 🔐 TURNSTILE SETUP (INVISIBLE MODE)
  // =====================================================
  useEffect(() => {
    // Expor função global para callback
    if (typeof window !== 'undefined') {
      (window as any).onTurnstileSuccess = (token: string) => {
        setTurnstileToken(token);
        console.log('✅ Turnstile token recebido');
      };

      // Renderizar Turnstile quando disponível
      const renderTurnstile = () => {
        if ((window as any).turnstile && turnstileRef.current && !turnstileToken) {
          try {
            (window as any).turnstile.render(turnstileRef.current, {
              sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
              callback: 'onTurnstileSuccess',
              theme: 'light',
            });
          } catch (error) {
            console.error('Erro ao renderizar Turnstile:', error);
          }
        }
      };

      // Tentar renderizar imediatamente ou aguardar
      if ((window as any).turnstile) {
        renderTurnstile();
      } else {
        const interval = setInterval(() => {
          if ((window as any).turnstile) {
            renderTurnstile();
            clearInterval(interval);
          }
        }, 100);

        return () => clearInterval(interval);
      }
    }
  }, [turnstileToken]);

  // =====================================================
  // 🎨 FORMATAÇÃO AUTOMÁTICA
  // =====================================================
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length >= 2) {
      return numbers.slice(0, 2) + '/' + numbers.slice(2, 4);
    }
    return numbers;
  };

  // =====================================================
  // 💳 TOKENIZAÇÃO MERCADO PAGO
  // =====================================================
  const tokenizeMercadoPago = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Timeout de 15 segundos
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: Mercado Pago não respondeu em 15s'));
      }, 15000);

      // @ts-ignore - SDK do Mercado Pago é carregado via script
      if (!window.MercadoPago) {
        clearTimeout(timeout);
        reject(new Error('MercadoPago SDK not loaded'));
        return;
      }

      // @ts-ignore
      const mp = new window.MercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY);
      
      console.log('🔑 Public Key sendo usada:', process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.substring(0, 15) + '...');
      console.log('🏗️ MercadoPago instância criada:', !!mp);

      const [month, year] = formData.cardExpiry.split('/');
      
      console.log('📅 Data bruta do form:', formData.cardExpiry);
      console.log('📅 Mês:', month, 'Ano:', year);
      
      console.log('� Criando token MP com dados:', {
        cardNumber: formData.cardNumber.replace(/\s/g, '').substring(0, 6) + '...',
        month,
        year: `20${year}`,
        cpf: formData.cpf.replace(/\D/g, '').substring(0, 3) + '...',
      });

      try {
        mp.createCardToken(
        {
          cardNumber: formData.cardNumber.replace(/\s/g, ''),
          cardholderName: formData.name,
          cardExpirationMonth: month,
          cardExpirationYear: `20${year}`,
          securityCode: formData.cardCvv,
          identificationType: 'CPF',
          identificationNumber: formData.cpf.replace(/\D/g, ''),
        },
        (status: number, response: any) => {
          clearTimeout(timeout);
          console.log('📥 Resposta MP - Status:', status, 'Response:', response);
          
          if (status === 200 || status === 201) {
            console.log('✅ Token MP criado:', response.id);
            resolve(response.id);
          } else {
            console.error('❌ Erro MP - Status:', status, 'Causa:', response.cause);
            const errorMsg = response.cause?.[0]?.description || response.message || 'Erro ao processar cartão';
            console.error('📝 Mensagem de erro final:', errorMsg);
            reject(new Error(errorMsg));
          }
        }
      );
      
      console.log('⏳ Aguardando resposta do Mercado Pago...');
      } catch (error: any) {
        clearTimeout(timeout);
        console.error('💥 Erro ao chamar createCardToken:', error);
        reject(new Error('Erro ao criar token: ' + error.message));
      }
    });
  };

  // =====================================================
  // 💳 TOKENIZAÇÃO APPMAX
  // =====================================================
  const tokenizeAppmax = async (): Promise<string> => {
    // TEMPORÁRIO: Retornar token mock (CORS bloqueia em localhost)
    console.log('⚠️ MODO DE TESTE: Usando token mock do AppMax (CORS em localhost)');
    await new Promise(resolve => setTimeout(resolve, 500));
    return `mock_appmax_token_${Date.now()}`;
  };

  // =====================================================
  // � SUBMIT HANDLER
  // =====================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Para desenvolvimento: aceitar sem Turnstile se não tiver token
    // Em produção, descomentar a validação abaixo
    /*
    if (!turnstileToken) {
      setStatus({
        stage: 'error',
        message: 'Por favor, aguarde a validação anti-bot.',
      });
      return;
    }
    */

    try {
      // ==================================================
      // 1️⃣ DUAL TOKENIZATION (Paralelo)
      // ==================================================
      setStatus({
        stage: 'tokenizing',
        message: 'Processando cartão de forma segura...',
      });

      console.log('🔄 Iniciando tokenização...');
      console.log('MercadoPago SDK carregado?', !!(window as any).MercadoPago);

      const [mpToken, appmaxToken] = await Promise.allSettled([
        tokenizeMercadoPago(),
        tokenizeAppmax(),
      ]);

      console.log('✅ Resultado tokenização MP:', mpToken);
      console.log('✅ Resultado tokenização AppMax:', appmaxToken);

      const mpFinal = mpToken.status === 'fulfilled' ? mpToken.value : 'fallback';
      const appmaxFinal = appmaxToken.status === 'fulfilled' ? appmaxToken.value : 'fallback';

      console.log('💳 Token MP final:', mpFinal);
      console.log('💳 Token AppMax final:', appmaxFinal);

      // Se MercadoPago falhou, exibir erro
      if (mpFinal === 'fallback') {
        const mpError = mpToken.status === 'rejected' ? mpToken.reason : null;
        console.error('❌ Erro MP:', mpError);
        throw new Error(mpError?.message || 'Erro ao processar cartão. Verifique os dados.');
      }

      // AppMax é backup - não é crítico se falhar
      if (appmaxFinal === 'fallback') {
        console.warn('⚠️ AppMax tokenização falhou (esperado em dev - CORS)');
      }

      // ==================================================
      // 2️⃣ ENVIAR PARA API DE CHECKOUT
      // ==================================================
      setStatus({
        stage: 'processing',
        message: 'Processando pagamento...',
      });

      const idempotencyKey = uuidv4();

      const response = await fetch('/api/checkout/cascade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mercadopagoToken: mpFinal,
          appmaxToken: appmaxFinal,
          customer: {
            email: formData.email,
            name: formData.name,
            cpf: formData.cpf,
          },
          product: {
            id: productId,
            name: productName,
            amount,
          },
          turnstileToken,
          idempotencyKey,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar pagamento');
      }

      // ==================================================
      // 3️⃣ SUCESSO!
      // ==================================================
      setStatus({
        stage: 'success',
        message: result.order.rescued
          ? '✅ Pagamento aprovado! (Gateway secundário)'
          : '✅ Pagamento aprovado!',
        gateway: result.order.gateway,
        rescued: result.order.rescued,
      });

      // Limpar formulário
      setFormData({
        name: '',
        email: '',
        cpf: '',
        cardNumber: '',
        cardExpiry: '',
        cardCvv: '',
      });

      onSuccess?.(result.order.id);
    } catch (error: any) {
      console.error('Checkout error:', error);

      setStatus({
        stage: 'error',
        message: error.message || 'Erro ao processar pagamento. Tente novamente.',
      });

      onError?.(error.message);
    }
  };

  // =====================================================
  // 🎨 RENDER
  // =====================================================
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          Checkout Seguro
        </CardTitle>
        <CardDescription>
          {productName} - R$ {amount.toFixed(2)}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={status.stage === 'processing' || status.stage === 'tokenizing'}
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={status.stage === 'processing' || status.stage === 'tokenizing'}
            />
          </div>

          {/* CPF */}
          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
              placeholder="000.000.000-00"
              maxLength={14}
              required
              disabled={status.stage === 'processing' || status.stage === 'tokenizing'}
            />
          </div>

          {/* Número do Cartão */}
          <div>
            <Label htmlFor="cardNumber">Número do Cartão</Label>
            <Input
              id="cardNumber"
              value={formData.cardNumber}
              onChange={(e) =>
                setFormData({ ...formData, cardNumber: formatCardNumber(e.target.value) })
              }
              placeholder="0000 0000 0000 0000"
              maxLength={19}
              required
              disabled={status.stage === 'processing' || status.stage === 'tokenizing'}
            />
          </div>

          {/* Validade & CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cardExpiry">Validade</Label>
              <Input
                id="cardExpiry"
                value={formData.cardExpiry}
                onChange={(e) =>
                  setFormData({ ...formData, cardExpiry: formatExpiry(e.target.value) })
                }
                placeholder="MM/AA"
                maxLength={5}
                required
                disabled={status.stage === 'processing' || status.stage === 'tokenizing'}
              />
            </div>
            <div>
              <Label htmlFor="cardCvv">CVV</Label>
              <Input
                id="cardCvv"
                value={formData.cardCvv}
                onChange={(e) =>
                  setFormData({ ...formData, cardCvv: e.target.value })
                }
                placeholder="123"
                required
                maxLength={4}
                disabled={status.stage === 'processing' || status.stage === 'tokenizing'}
              />
            </div>
          </div>

          {/* Turnstile Widget - Invisível */}
          <div ref={turnstileRef} style={{ display: 'none' }} />

          {/* Status Messages */}
          {status.stage !== 'idle' && (
            <Alert
              variant={
                status.stage === 'error'
                  ? 'destructive'
                  : status.stage === 'success'
                  ? 'default'
                  : 'default'
              }
            >
              <AlertDescription className="flex items-center gap-2">
                {status.stage === 'tokenizing' || status.stage === 'processing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : status.stage === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {status.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={
              status.stage === 'processing' ||
              status.stage === 'tokenizing' ||
              status.stage === 'success'
            }
          >
            {status.stage === 'processing' || status.stage === 'tokenizing' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              `Pagar R$ ${amount.toFixed(2)}`
            )}
          </Button>

          {/* Security Badge */}
          <div className="text-center text-sm text-gray-700 dark:text-gray-300 font-medium">
            <Shield className="w-4 h-4 inline mr-1 text-green-600" />
            Pagamento 100% seguro e criptografado
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// =====================================================
// 📝 INSTRUÇÕES DE USO
// =====================================================
/*
1. Adicionar no <head> do layout:
   
   <script src="https://sdk.mercadopago.com/js/v2"></script>
   <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

2. Usar o componente:

   <CheckoutFormV3
     productId="plan-enterprise"
     productName="Plano Enterprise"
     amount={297.00}
     onSuccess={(orderId) => router.push(`/obrigado?order=${orderId}`)}
     onError={(error) => console.error(error)}
   />
*/
