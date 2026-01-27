/**
 * ============================================
 * 🔄 HOOK: useOrderRedirect
 * ============================================
 * Hook para verificar status do pedido e
 * redirecionar automaticamente para /obrigado
 * quando o pagamento for confirmado
 * ============================================
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UseOrderRedirectOptions {
  orderId: string
  enabled?: boolean
  pollingInterval?: number // ms (padrão: 3000)
  maxAttempts?: number // máximo de tentativas (padrão: 40)
  onStatusChange?: (status: string) => void
  onRedirect?: (url: string) => void
}

interface OrderStatus {
  order_id: string
  status: string
  redirect_url: string | null
  has_redirect: boolean
}

export function useOrderRedirect({
  orderId,
  enabled = true,
  pollingInterval = 3000,
  maxAttempts = 40, // 2 minutos total
  onStatusChange,
  onRedirect
}: UseOrderRedirectOptions) {
  const [status, setStatus] = useState<string>('pending')
  const [isPolling, setIsPolling] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const checkOrderStatus = useCallback(async () => {
    if (!orderId || !enabled || attempts >= maxAttempts) {
      return
    }

    try {
      setIsPolling(true)
      
      const response = await fetch(
        `/api/order/status?order_id=${encodeURIComponent(orderId)}`,
        { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: OrderStatus = await response.json()
      
      // Atualizar status
      if (data.status !== status) {
        setStatus(data.status)
        onStatusChange?.(data.status)
      }

      // Se tem redirect_url, redirecionar
      if (data.has_redirect && data.redirect_url) {
        console.log('✅ Redirect URL disponível:', data.redirect_url)
        onRedirect?.(data.redirect_url)
        
        // Redirecionar após 500ms
        setTimeout(() => {
          router.push(data.redirect_url!)
        }, 500)
        
        return
      }

      // Se status é sucesso mas ainda não tem URL, continuar tentando
      if (['paid', 'approved', 'completed'].includes(data.status)) {
        console.log('⏳ Pagamento confirmado, aguardando URL...')
      }

    } catch (err: any) {
      console.error('❌ Erro ao verificar status:', err)
      setError(err.message)
    } finally {
      setIsPolling(false)
      setAttempts(prev => prev + 1)
    }
  }, [orderId, enabled, attempts, maxAttempts, status, onStatusChange, onRedirect, router])

  // Polling automático
  useEffect(() => {
    if (!enabled || attempts >= maxAttempts) {
      return
    }

    const interval = setInterval(() => {
      checkOrderStatus()
    }, pollingInterval)

    // Primeira verificação imediata
    checkOrderStatus()

    return () => clearInterval(interval)
  }, [enabled, attempts, maxAttempts, pollingInterval, checkOrderStatus])

  return {
    status,
    isPolling,
    attempts,
    maxAttempts,
    hasTimedOut: attempts >= maxAttempts,
    error,
    checkNow: checkOrderStatus
  }
}
