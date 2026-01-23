// ================================================================
// Notification Provider - Context para notificações globais
// ================================================================

'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react'
import type { Notification, NotificationContextValue } from '@/lib/types/notifications'
import { toast } from 'sonner'
import { supabaseAdmin } from '@/lib/supabase'
import type { WhatsAppMessage } from '@/lib/types/whatsapp'
import type { AdminChatMessage } from '@/lib/types/admin-chat'

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const lastWhatsAppMessageIdRef = useRef<string | null>(null)
  const lastAdminChatMessageIdRef = useRef<string | null>(null)
  const seenNotificationsRef = useRef<Set<string>>(new Set())

  // Calcular não lidas
  const unreadCount = notifications.filter(n => !n.read).length

  const normalizeFromMe = (value: unknown) =>
    value === true || value === 'true' || value === 1 || value === '1'

  const getDedupeKey = (
    notification: Omit<Notification, 'id' | 'created_at' | 'read'>
  ) => {
    const meta = notification.metadata
    if (notification.type === 'whatsapp_message' && meta?.whatsapp_message_id) {
      return `whatsapp:${meta.whatsapp_message_id}`
    }
    if (notification.type === 'admin_chat_message' && meta?.admin_chat_message_id) {
      return `admin_chat:${meta.admin_chat_message_id}`
    }
    return null
  }

  // Adicionar notificação
  const addNotification = useCallback((
    notification: Omit<Notification, 'id' | 'created_at' | 'read'>
  ) => {
    const dedupeKey = getDedupeKey(notification)
    if (dedupeKey) {
      const seen = seenNotificationsRef.current
      if (seen.has(dedupeKey)) {
        return
      }
      seen.add(dedupeKey)
      if (seen.size > 1000) {
        seen.clear()
        seen.add(dedupeKey)
      }
    }

    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      read: false
    }

    setNotifications(prev => [newNotification, ...prev])

    // Toast visual
    const toastTitle = notification.title
    const toastMessage = notification.message

    toast.success(toastTitle, {
      description: toastMessage,
      duration: 5000,
      action: notification.metadata ? {
        label: 'Ver',
        onClick: () => {
          // Redirecionar baseado no tipo
          const meta = notification.metadata
          if (!meta) return
          
          if (notification.type === 'whatsapp_message' && meta.whatsapp_remote_jid) {
            window.location.href = `/admin/whatsapp?chat=${encodeURIComponent(meta.whatsapp_remote_jid)}`
          } else if (notification.type === 'admin_chat_message' && meta.admin_chat_conversation_id) {
            window.location.href = `/admin/chat?conversation=${meta.admin_chat_conversation_id}`
          }
        }
      } : undefined
    })

    // Notificação do navegador (se permitido)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(toastTitle, {
        body: toastMessage,
        icon: notification.metadata?.profile_picture_url || '/favicon.ico',
        badge: '/favicon.ico',
        tag: newNotification.id
      })
    }
  }, [])

  // Marcar como lida
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }, [])

  // Marcar todas como lidas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  // Limpar todas
  const clearAll = useCallback(() => {
    setNotifications([])
    seenNotificationsRef.current.clear()
  }, [])

  // Pedir permissão para notificações do navegador
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // ================================================================
  // REALTIME: Escutar mensagens WhatsApp e Chat Interno
  // ================================================================
  useEffect(() => {
    console.log('🔌 NotificationProvider: Conectando ao Realtime...')

    // Canal WhatsApp
    const whatsappChannel = supabaseAdmin
      .channel('global-whatsapp-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        async (payload) => {
          const newMessage = payload.new as WhatsAppMessage
          const fromMe = normalizeFromMe(newMessage.from_me)
          lastWhatsAppMessageIdRef.current = newMessage.id
          
          console.log('🔔 [NotificationProvider] Nova mensagem via Realtime:', {
            from_me: newMessage.from_me,
            content: newMessage.content?.substring(0, 30),
            remote_jid: newMessage.remote_jid
          })
          
          // ⚠️ IMPORTANTE: Só notificar mensagens RECEBIDAS (não enviadas por mim)
          // from_me === true = mensagem enviada pelo SISTEMA
          // from_me === false = mensagem recebida do CLIENTE
          if (fromMe) {
            console.log('🚫 [NotificationProvider] Ignorando notificação (mensagem enviada por mim)')
            return
          }
          
          // Buscar dados do contato
          const { data: contact } = await supabaseAdmin
            .from('whatsapp_contacts')
            .select('name, push_name, profile_picture_url')
            .eq('remote_jid', newMessage.remote_jid)
            .single()
          
          const contactName = contact?.name || contact?.push_name || newMessage.remote_jid.split('@')[0]
          
          console.log('✅ [NotificationProvider] Criando notificação:', contactName)
          
          addNotification({
            type: 'whatsapp_message',
            title: contactName,
            message: newMessage.content || '[Mídia]',
            metadata: {
              whatsapp_remote_jid: newMessage.remote_jid,
              whatsapp_message_id: newMessage.id,
              profile_picture_url: contact?.profile_picture_url
            }
          })
        }
      )
      .subscribe((status) => {
        console.log('📡 WhatsApp Realtime:', status)
      })

    // Canal Chat Interno
    const chatChannel = supabaseAdmin
      .channel('global-admin-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_chat_messages'
        },
        async (payload) => {
          const newMessage = payload.new as AdminChatMessage
          lastAdminChatMessageIdRef.current = newMessage.id
          
          // Buscar dados do sender
          const { data: sender } = await supabaseAdmin
            .from('users')
            .select('name, email, avatar_url')
            .eq('id', newMessage.sender_id)
            .single()
          
          const senderName = sender?.name || sender?.email || 'Admin'
          
          addNotification({
            type: 'admin_chat_message',
            title: senderName,
            message: newMessage.content || '[Mídia]',
            metadata: {
              admin_chat_conversation_id: newMessage.conversation_id,
              admin_chat_message_id: newMessage.id,
              profile_picture_url: sender?.avatar_url
            }
          })
        }
      )
      .subscribe((status) => {
        console.log('📡 Admin Chat Realtime:', status)
      })

    return () => {
      supabaseAdmin.removeChannel(whatsappChannel)
      supabaseAdmin.removeChannel(chatChannel)
    }
  }, [addNotification])

  // ================================================================
  // FALLBACK: Polling para garantir toasts mesmo se Realtime falhar
  // ================================================================
  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      try {
        const { data: latestMessage } = await supabaseAdmin
          .from('whatsapp_messages')
          .select('id')
          .order('timestamp', { ascending: false })
          .limit(1)

        if (!cancelled) {
          lastWhatsAppMessageIdRef.current = latestMessage?.[0]?.id ?? null
        }
      } catch {
        // Ignorar falhas no bootstrap
      }

      try {
        const { data: latestChat } = await supabaseAdmin
          .from('admin_chat_messages')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)

        if (!cancelled) {
          lastAdminChatMessageIdRef.current = latestChat?.[0]?.id ?? null
        }
      } catch {
        // Ignorar falhas no bootstrap
      }
    }

    const pollNotifications = async () => {
      try {
        const { data } = await supabaseAdmin
          .from('whatsapp_messages')
          .select('id, remote_jid, content, from_me, timestamp')
          .order('timestamp', { ascending: false })
          .limit(1)

        const latest = data?.[0]
        if (latest && latest.id !== lastWhatsAppMessageIdRef.current) {
          lastWhatsAppMessageIdRef.current = latest.id
          const fromMe = normalizeFromMe(latest.from_me)
          if (!fromMe) {
            const { data: contact } = await supabaseAdmin
              .from('whatsapp_contacts')
              .select('name, push_name, profile_picture_url')
              .eq('remote_jid', latest.remote_jid)
              .single()

            const contactName =
              contact?.name ||
              contact?.push_name ||
              latest.remote_jid.split('@')[0]

            addNotification({
              type: 'whatsapp_message',
              title: contactName,
              message: latest.content || '[Mídia]',
              metadata: {
                whatsapp_remote_jid: latest.remote_jid,
                whatsapp_message_id: latest.id,
                profile_picture_url: contact?.profile_picture_url
              }
            })
          }
        }
      } catch {
        // Silenciar erros de polling para evitar ruído no console
      }

      try {
        const { data } = await supabaseAdmin
          .from('admin_chat_messages')
          .select('id, conversation_id, sender_id, content, created_at')
          .order('created_at', { ascending: false })
          .limit(1)

        const latest = data?.[0]
        if (latest && latest.id !== lastAdminChatMessageIdRef.current) {
          lastAdminChatMessageIdRef.current = latest.id
          const { data: sender } = await supabaseAdmin
            .from('users')
            .select('name, email, avatar_url')
            .eq('id', latest.sender_id)
            .single()

          const senderName = sender?.name || sender?.email || 'Admin'

          addNotification({
            type: 'admin_chat_message',
            title: senderName,
            message: latest.content || '[Mídia]',
            metadata: {
              admin_chat_conversation_id: latest.conversation_id,
              admin_chat_message_id: latest.id,
              profile_picture_url: sender?.avatar_url
            }
          })
        }
      } catch {
        // Silenciar erros de polling para evitar ruído no console
      }
    }

    let intervalId: ReturnType<typeof setInterval> | null = null

    bootstrap().finally(() => {
      if (cancelled) return
      intervalId = setInterval(pollNotifications, 8000)
    })

    return () => {
      cancelled = true
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [addNotification])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
