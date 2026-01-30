import { useEffect, useRef, useCallback } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

/**
 * 🔥 HOOK: Auto-Save de Checkout (Shadow Save)
 * 
 * Salva dados do formulário automaticamente enquanto o usuário digita
 * Previne perda de dados por:
 * - Fechamento acidental da aba
 * - Erros de conexão
 * - Falhas no gateway
 * - Timeout de sessão
 * 
 * @param formData - Dados atuais do formulário
 * @param enabled - Se o auto-save está habilitado
 * @param onSaveSuccess - Callback quando salva com sucesso
 * @param onSaveError - Callback quando há erro
 */

interface AutoSaveOptions {
  enabled?: boolean
  debounceMs?: number
  onSaveSuccess?: () => void
  onSaveError?: (error: Error) => void
}

export function useAutoSave<T extends Record<string, any>>(
  formData: T,
  options: AutoSaveOptions = {}
) {
  const {
    enabled = true,
    debounceMs = 1000, // 1 segundo de debounce
    onSaveSuccess,
    onSaveError,
  } = options

  const sessionIdRef = useRef<string | null>(null)
  const lastSavedDataRef = useRef<string>('')
  const saveInProgressRef = useRef(false)

  // Debounce dos dados do formulário
  const debouncedFormData = useDebounce(formData, debounceMs)

  /**
   * Gera ou recupera o ID da sessão de checkout
   * Esse ID identifica o cliente mesmo após F5
   */
  const getOrCreateSessionId = useCallback((): string => {
    if (sessionIdRef.current) return sessionIdRef.current

    // Tentar recuperar do localStorage
    const stored = localStorage.getItem('checkout_session_id')
    if (stored) {
      sessionIdRef.current = stored
      return stored
    }

    // Criar novo ID único
    const newId = `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('checkout_session_id', newId)
    sessionIdRef.current = newId
    
    console.log('🆔 [Auto-Save] Nova sessão criada:', newId)
    return newId
  }, [])

  /**
   * Salva o draft no backend
   */
  const saveDraft = useCallback(async (data: T) => {
    if (!enabled) return
    if (saveInProgressRef.current) return

    // Verificar se há dados mínimos para salvar
    const hasMinimalData = data.email || data.customer_name || data.customer_cpf
    if (!hasMinimalData) {
      console.log('⏭️ [Auto-Save] Sem dados mínimos, ignorando...')
      return
    }

    // Verificar se os dados mudaram desde o último save
    const currentDataStr = JSON.stringify(data)
    if (currentDataStr === lastSavedDataRef.current) {
      console.log('⏭️ [Auto-Save] Dados não mudaram, ignorando...')
      return
    }

    try {
      saveInProgressRef.current = true
      const sessionId = getOrCreateSessionId()

      console.log('💾 [Auto-Save] Salvando draft...', {
        sessionId,
        fields: Object.keys(data).filter(k => data[k])
      })

      const response = await fetch('/api/checkout/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          draft_data: data,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao salvar draft')
      }

      const result = await response.json()
      lastSavedDataRef.current = currentDataStr

      console.log('✅ [Auto-Save] Draft salvo com sucesso:', result.action)
      onSaveSuccess?.()

    } catch (error) {
      console.error('❌ [Auto-Save] Erro ao salvar:', error)
      onSaveError?.(error as Error)
    } finally {
      saveInProgressRef.current = false
    }
  }, [enabled, getOrCreateSessionId, onSaveSuccess, onSaveError])

  /**
   * Recupera draft salvo anteriormente
   */
  const loadDraft = useCallback(async (): Promise<T | null> => {
    const sessionId = getOrCreateSessionId()

    try {
      console.log('🔍 [Auto-Save] Buscando draft salvo...', sessionId)

      const response = await fetch(`/api/checkout/load-draft?session_id=${sessionId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('ℹ️ [Auto-Save] Nenhum draft encontrado (primeira visita)')
          return null
        }
        throw new Error('Erro ao carregar draft')
      }

      const result = await response.json()
      
      if (result.draft_data) {
        console.log('✅ [Auto-Save] Draft recuperado:', {
          fields: Object.keys(result.draft_data).filter(k => result.draft_data[k]),
          saved_at: result.updated_at
        })
        return result.draft_data as T
      }

      return null

    } catch (error) {
      console.error('❌ [Auto-Save] Erro ao carregar draft:', error)
      return null
    }
  }, [getOrCreateSessionId])

  /**
   * Limpa o draft após checkout concluído
   */
  const clearDraft = useCallback(async () => {
    const sessionId = sessionIdRef.current
    if (!sessionId) return

    try {
      await fetch('/api/checkout/save-draft', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      })

      localStorage.removeItem('checkout_session_id')
      sessionIdRef.current = null
      lastSavedDataRef.current = ''

      console.log('🗑️ [Auto-Save] Draft limpo com sucesso')
    } catch (error) {
      console.error('❌ [Auto-Save] Erro ao limpar draft:', error)
    }
  }, [])

  /**
   * Effect: Salva automaticamente quando dados mudam (com debounce)
   */
  useEffect(() => {
    if (!enabled) return
    saveDraft(debouncedFormData)
  }, [debouncedFormData, enabled, saveDraft])

  /**
   * Effect: Salva antes de sair da página (beforeunload)
   */
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = () => {
      // Tentar salvar de forma síncrona (último recurso)
      const sessionId = getOrCreateSessionId()
      const data = JSON.stringify({
        session_id: sessionId,
        draft_data: formData,
        timestamp: new Date().toISOString()
      })

      // Usando sendBeacon para garantir envio mesmo ao fechar aba
      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' })
        navigator.sendBeacon('/api/checkout/save-draft', blob)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [enabled, formData, getOrCreateSessionId])

  return {
    sessionId: sessionIdRef.current,
    saveDraft,
    loadDraft,
    clearDraft,
    isSaving: saveInProgressRef.current
  }
}
