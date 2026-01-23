// ================================================================
// Types para Sistema de Notificações
// ================================================================

export type NotificationType = 
  | 'whatsapp_message'      // Nova mensagem WhatsApp
  | 'admin_chat_message'    // Mensagem do chat interno
  | 'system'                // Notificação do sistema
  | 'order'                 // Pedido novo/atualizado
  | 'customer'              // Novo cliente

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  
  // Metadata específica por tipo
  metadata?: {
    whatsapp_remote_jid?: string       // Para redirecionar ao chat
    whatsapp_message_id?: string       // Dedupe de notificações WhatsApp
    admin_chat_conversation_id?: string // Para redirecionar ao chat interno
    admin_chat_message_id?: string     // Dedupe de notificações do chat interno
    order_id?: string
    customer_id?: string
    profile_picture_url?: string       // Foto do remetente
  }
  
  // Controle
  read: boolean
  created_at: string
  user_id?: string  // Se for notificação específica para um admin
}

export interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
}
