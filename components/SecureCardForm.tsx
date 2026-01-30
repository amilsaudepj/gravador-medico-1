'use client'

import { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react'
import { CreditCard, Lock, AlertCircle, CheckCircle2 } from 'lucide-react'

declare global {
  interface Window {
    MercadoPago: any
  }
}

interface SecureCardFormProps {
  amount: number
  onTokenReady: (tokenData: {
    token: string
    installments: number
    paymentMethodId: string
    issuerId: string
    deviceId: string | null
  }) => void
  onError: (error: string) => void
  cpf: string
  documentType: 'CPF' | 'CNPJ'
  disabled?: boolean
}

export interface SecureCardFormHandle {
  generateToken: () => Promise<{
    token: string
    installments: number
    paymentMethodId: string
    issuerId: string
    deviceId: string | null
  } | null>
}

const SecureCardForm = forwardRef<SecureCardFormHandle, SecureCardFormProps>(({
  amount,
  onTokenReady,
  onError,
  cpf,
  documentType,
  disabled = false
}, ref) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardBrand, setCardBrand] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const cardFormRef = useRef<any>(null)
  const initRef = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (initRef.current || disabled) return
    
    const initSecureFields = async () => {
      try {
        setIsLoading(true)
        
        // Aguarda o SDK carregar
        let attempts = 0
        while (!window.MercadoPago && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }

        if (!window.MercadoPago) {
          throw new Error('Mercado Pago SDK não carregou')
        }

        const publicKey = (process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '').trim()
        
        if (!publicKey) {
          throw new Error('Chave pública do Mercado Pago não configurada')
        }

        console.log('🔐 Inicializando Secure Fields...')

        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' })

        // Criar CardForm com Secure Fields
        const cardForm = mp.cardForm({
          amount: String(amount),
          iframe: true,
          form: {
            id: 'secure-card-form',
            cardNumber: {
              id: 'cardNumber-container',
              placeholder: '0000 0000 0000 0000',
              style: {
                fontSize: '16px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                fontWeight: '400',
                color: '#1a1a1a',
                'placeholder-color': '#9ca3af'
              }
            },
            expirationDate: {
              id: 'expirationDate-container',
              placeholder: 'MM/AA',
              style: {
                fontSize: '16px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                fontWeight: '400',
                color: '#1a1a1a',
                'placeholder-color': '#9ca3af'
              }
            },
            securityCode: {
              id: 'securityCode-container',
              placeholder: 'CVV',
              style: {
                fontSize: '16px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                fontWeight: '400',
                color: '#1a1a1a',
                'placeholder-color': '#9ca3af'
              }
            },
            cardholderName: {
              id: 'cardholderName-container',
              placeholder: 'NOME COMO ESTÁ NO CARTÃO'
            },
            installments: {
              id: 'installments-container',
              placeholder: 'Parcelas'
            },
            identificationType: {
              id: 'identificationType-container'
            },
            identificationNumber: {
              id: 'identificationNumber-container',
              placeholder: documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'
            },
            issuer: {
              id: 'issuer-container',
              placeholder: 'Banco emissor'
            }
          },
          callbacks: {
            onFormMounted: (mountError: any) => {
              if (mountError) {
                console.error('❌ Erro ao montar Secure Fields:', mountError)
                setError('Erro ao carregar formulário seguro')
                setIsLoading(false)
              } else {
                console.log('✅ Secure Fields montados!')
                setIsReady(true)
                setIsLoading(false)
              }
            },
            onSubmit: (event: Event) => {
              event.preventDefault()
            },
            onPaymentMethodsReceived: (err: any, data: any) => {
              if (!err && data && data.length > 0) {
                console.log('💳 Bandeira detectada:', data[0].id)
                setCardBrand(data[0].id)
              }
            },
            onCardTokenReceived: (err: any, token: string) => {
              if (err) {
                console.error('❌ Erro no token:', err)
              } else {
                console.log('✅ Token recebido:', token?.substring(0, 20) + '...')
              }
            },
            onValidityChange: (err: any, field: string) => {
              // Pode adicionar validação visual aqui
            }
          }
        })

        cardFormRef.current = cardForm
        initRef.current = true

      } catch (err: any) {
        console.error('❌ Erro ao inicializar:', err)
        setError(err.message)
        setIsLoading(false)
        onError(err.message)
      }
    }

    // Delay para garantir DOM pronto
    const timer = setTimeout(initSecureFields, 300)
    return () => clearTimeout(timer)
  }, [amount, documentType, disabled])

  // Atualiza amount quando muda
  useEffect(() => {
    if (cardFormRef.current && isReady) {
      try {
        cardFormRef.current.update('amount', String(amount))
      } catch (e) {
        console.warn('Não foi possível atualizar amount')
      }
    }
  }, [amount, isReady])

  // Função para gerar token sob demanda (chamada pelo componente pai)
  const generateToken = async (): Promise<{
    token: string
    installments: number
    paymentMethodId: string
    issuerId: string
    deviceId: string | null
  } | null> => {
    if (!cardFormRef.current || isProcessing) {
      return null
    }

    try {
      setIsProcessing(true)
      setError(null)

      console.log('🔐 Gerando token do cartão...')
      
      const formData = cardFormRef.current.getCardFormData()
      
      console.log('📦 Dados do formulário:', {
        hasToken: !!formData.token,
        paymentMethodId: formData.paymentMethodId,
        installments: formData.installments
      })

      if (!formData.token) {
        throw new Error('Por favor, preencha todos os dados do cartão')
      }

      // Obter device ID
      let deviceId = null
      try {
        deviceId = window.MercadoPago?.deviceId || null
      } catch (e) {}

      const tokenData = {
        token: formData.token,
        installments: parseInt(formData.installments) || 1,
        paymentMethodId: formData.paymentMethodId || '',
        issuerId: formData.issuerId || '',
        deviceId
      }

      // Também chama callback para manter compatibilidade
      onTokenReady(tokenData)
      
      return tokenData

    } catch (err: any) {
      console.error('❌ Erro ao gerar token:', err)
      const errorMsg = err.message || 'Erro ao processar cartão'
      setError(errorMsg)
      onError(errorMsg)
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  // Expor função generateToken via ref para o componente pai
  useImperativeHandle(ref, () => ({
    generateToken
  }), [isReady, isProcessing])

  if (disabled) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header com segurança */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <Lock className="w-4 h-4 text-green-600" />
        <span>Seus dados estão protegidos com criptografia SSL</span>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          <span className="ml-3 text-gray-600">Carregando formulário seguro...</span>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Formulário Secure Fields */}
      <form 
        id="secure-card-form" 
        ref={formRef}
        className={isLoading ? 'hidden' : 'space-y-4'}
        onSubmit={(e) => e.preventDefault()}
      >
        {/* Número do Cartão */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Número do Cartão *
          </label>
          <div 
            id="cardNumber-container"
            className="w-full h-[52px] px-4 py-3 border-2 border-gray-200 rounded-xl focus-within:border-brand-500 transition-colors bg-white"
          />
          {cardBrand && (
            <div className="flex items-center gap-2 mt-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500 capitalize">{cardBrand}</span>
            </div>
          )}
        </div>

        {/* Nome no Cartão */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Nome no Cartão *
          </label>
          <input
            id="cardholderName-container"
            type="text"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors uppercase"
            placeholder="NOME COMO ESTÁ NO CARTÃO"
          />
        </div>

        {/* Validade e CVV */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Validade *
            </label>
            <div 
              id="expirationDate-container"
              className="w-full h-[52px] px-4 py-3 border-2 border-gray-200 rounded-xl focus-within:border-brand-500 transition-colors bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              CVV *
            </label>
            <div 
              id="securityCode-container"
              className="w-full h-[52px] px-4 py-3 border-2 border-gray-200 rounded-xl focus-within:border-brand-500 transition-colors bg-white"
            />
          </div>
        </div>

        {/* Parcelas */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Parcelas *
          </label>
          <select
            id="installments-container"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors bg-white"
          >
            <option value="">Selecione...</option>
          </select>
        </div>

        {/* Documento - Hidden, preenchido automaticamente */}
        <input type="hidden" id="identificationType-container" value={documentType} />
        <input type="hidden" id="identificationNumber-container" value={cpf.replace(/\D/g, '')} />
        <select id="issuer-container" className="hidden">
          <option value="">Banco emissor</option>
        </select>
      </form>

      {/* Badge de segurança */}
      {isReady && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Lock className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-400">Pagamento seguro via Mercado Pago</span>
        </div>
      )}
    </div>
  )
})

SecureCardForm.displayName = 'SecureCardForm'

export default SecureCardForm
