// ================================================================
// Database Functions: Admin Chat (Chat Interno)
// ================================================================

import { supabaseAdmin } from './supabase'
import type {
  AdminChatConversation,
  AdminChatMessage,
  UserConversation,
  CreateAdminChatMessageInput
} from './types/admin-chat'

/**
 * Listar conversas de um usuário
 */
export async function getUserConversations(userId: string): Promise<UserConversation[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_chat_participants')
      .select(`
        conversation_id,
        unread_count,
        last_read_at,
        conversation:admin_chat_conversations(
          id,
          type,
          name,
          created_at,
          updated_at,
          last_message_content,
          last_message_timestamp,
          last_message_from
        )
      `)
      .eq('user_id', userId)
      .order('conversation(updated_at)', { ascending: false })

    if (error) throw error

    // Processar para incluir dados do outro participante (se direct)
    const conversations = await Promise.all(
      (data || []).map(async (item: any) => {
        const conv = item.conversation
        
        let otherParticipantName: string | undefined
        let otherParticipantAvatar: string | undefined
        let otherParticipantEmail: string | undefined

        if (conv.type === 'direct') {
          // Buscar o outro participante
          const { data: participants } = await supabaseAdmin
            .from('admin_chat_participants')
            .select('user_id, users(name, email, avatar_url)')
            .eq('conversation_id', conv.id)
            .neq('user_id', userId)
            .limit(1)
            .single()

          if (participants && participants.users) {
            otherParticipantName = (participants.users as any).name || (participants.users as any).email
            otherParticipantEmail = (participants.users as any).email
            otherParticipantAvatar = (participants.users as any).avatar_url
          }
        }

        return {
          ...conv,
          unread_count: item.unread_count,
          other_participant_name: otherParticipantName,
          other_participant_email: otherParticipantEmail,
          other_participant_avatar: otherParticipantAvatar
        } as UserConversation
      })
    )

    return conversations
  } catch (error) {
    console.error('❌ Erro ao buscar conversas:', error)
    return []
  }
}

/**
 * Buscar mensagens de uma conversa
 */
export async function getConversationMessages(
  conversationId: string,
  limit = 100
): Promise<AdminChatMessage[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_chat_messages')
      .select(`
        *,
        sender:users(name, email, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) throw error

    // Processar para incluir dados do sender
    return (data || []).map((msg: any) => ({
      ...msg,
      sender_name: msg.sender?.name || msg.sender?.email,
      sender_email: msg.sender?.email,
      sender_avatar: msg.sender?.avatar_url
    }))
  } catch (error) {
    console.error('❌ Erro ao buscar mensagens:', error)
    return []
  }
}

/**
 * Criar ou retornar conversa direta entre 2 usuários
 */
export async function createOrGetDirectConversation(
  user1Id: string,
  user2Id: string
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('create_direct_conversation', {
      user1_id: user1Id,
      user2_id: user2Id
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('❌ Erro ao criar conversa direta:', error)
    return null
  }
}

/**
 * Enviar mensagem
 */
export async function sendAdminChatMessage(
  input: CreateAdminChatMessageInput
): Promise<AdminChatMessage | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_chat_messages')
      .insert({
        conversation_id: input.conversation_id,
        sender_id: input.sender_id,
        content: input.content,
        message_type: input.message_type || 'text',
        media_url: input.media_url,
        file_name: input.file_name,
        file_size: input.file_size,
        reply_to: input.reply_to
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error)
    return null
  }
}

/**
 * Marcar conversa como lida
 */
export async function markAdminChatAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.rpc('mark_admin_chat_as_read', {
      p_conversation_id: conversationId,
      p_user_id: userId
    })

    if (error) throw error
  } catch (error) {
    console.error('❌ Erro ao marcar como lida:', error)
  }
}

/**
 * Criar grupo de chat
 */
export async function createGroupConversation(
  creatorId: string,
  name: string,
  participantIds: string[]
): Promise<string | null> {
  try {
    // Criar conversa
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('admin_chat_conversations')
      .insert({
        type: 'group',
        name,
        created_by: creatorId
      })
      .select()
      .single()

    if (convError) throw convError

    // Adicionar participantes
    const participants = participantIds.map(userId => ({
      conversation_id: conversation.id,
      user_id: userId
    }))

    const { error: partError } = await supabaseAdmin
      .from('admin_chat_participants')
      .insert(participants)

    if (partError) throw partError

    return conversation.id
  } catch (error) {
    console.error('❌ Erro ao criar grupo:', error)
    return null
  }
}

/**
 * Listar todos os administradores (para iniciar conversa)
 */
export async function getAdminUsers() {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, avatar_url, role, is_online, last_seen_at')
      .eq('role', 'admin')
      .order('is_online', { ascending: false }) // Online primeiro
      .order('name')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('❌ Erro ao buscar admins:', error)
    return []
  }
}
