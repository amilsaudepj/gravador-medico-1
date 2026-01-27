/**
 * ============================================
 * 🔄 COMPONENTE: OrderRedirectManager
 * ============================================
 * Gerencia o redirecionamento automático após
 * confirmação do pagamento via webhook
 * ============================================
 */

'use client'

import { useEffect, useState } from 'react'
import { useOrderRedirect } from '@/hooks/useOrderRedirect'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface OrderRedirectManagerProps {
  orderId: string
  customerEmail?: string
  onTimeout?: () => void
}

export function OrderRedirectManager({ 
  orderId, 
  customerEmail,
  onTimeout 
}: OrderRedirectManagerProps) {
  const [showManager, setShowManager] = useState(false)

  const { 
    status, 
    isPolling, 
    attempts, 
    maxAttempts, 
    hasTimedOut,
    error 
  } = useOrderRedirect({
    orderId,
    enabled: true,
    pollingInterval: 3000, // Verifica a cada 3 segundos
    maxAttempts: 40, // 2 minutos total
    onStatusChange: (newStatus) => {
      console.log('📊 Status atualizado:', newStatus)
      
      // Mostrar gerenciador quando status for sucesso
      if (['paid', 'approved', 'completed'].includes(newStatus)) {
        setShowManager(true)
      }
    },
    onRedirect: (url) => {
      console.log('🔄 Redirecionando para:', url)
    }
  })

  // Callback de timeout
  useEffect(() => {
    if (hasTimedOut && onTimeout) {
      onTimeout()
    }
  }, [hasTimedOut, onTimeout])

  // Não mostrar nada se não estiver em status de sucesso
  if (!showManager) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Ícone de Sucesso */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        {/* Título */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-3">
          🎉 Pagamento Confirmado!
        </h2>

        {/* Descrição */}
        {!hasTimedOut ? (
          <>
            <p className="text-center text-gray-600 mb-6">
              Aguarde enquanto preparamos sua experiência...
            </p>

            {/* Loading */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
              <span className="text-sm text-gray-600">
                Redirecionando automaticamente...
              </span>
            </div>

            {/* Progresso */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Processando</span>
                <span>{attempts}/{maxAttempts}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-brand-500 to-brand-600 h-full transition-all duration-300"
                  style={{ width: `${(attempts / maxAttempts) * 100}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-3 mb-6">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <p className="text-center text-gray-700">
                O redirecionamento automático está demorando mais que o esperado.
              </p>
            </div>

            <div className="space-y-3">
              <a
                href={`/obrigado?order_id=${orderId}&email=${customerEmail || ''}`}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Ir para Página de Obrigado
              </a>
              
              <p className="text-xs text-center text-gray-500">
                Ou aguarde mais alguns segundos...
              </p>
            </div>
          </>
        )}

        {error && (
          <p className="text-xs text-red-600 text-center mt-4">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
