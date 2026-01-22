// ================================================================
// Contact List - Lista lateral de conversas (estilo WhatsApp)
// ================================================================

'use client'

import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { WhatsAppConversation } from '@/lib/types/whatsapp'

interface ContactListProps {
  conversations: WhatsAppConversation[]
  selectedRemoteJid?: string
  onSelectConversation: (remoteJid: string) => void
}

export default function ContactList({
  conversations,
  selectedRemoteJid,
  onSelectConversation
}: ContactListProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700/30 scrollbar-track-transparent hover:scrollbar-thumb-gray-700/50">
      {conversations.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <p className="text-sm">Nenhuma conversa encontrada</p>
        </div>
      ) : (
        <div>
          {conversations.map((conversation) => (
            <ContactItem
              key={conversation.remote_jid}
              conversation={conversation}
              isSelected={conversation.remote_jid === selectedRemoteJid}
              onClick={() => onSelectConversation(conversation.remote_jid)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ContactItem({
  conversation,
  isSelected,
  onClick
}: {
  conversation: WhatsAppConversation
  isSelected: boolean
  onClick: () => void
}) {
  const displayName = conversation.name || conversation.push_name || formatPhoneNumber(conversation.remote_jid)
  
  // Formatar hora exata (HH:mm ou dd/MM se for mais antigo)
  const lastMessageTime = conversation.last_message_timestamp
    ? (() => {
        const date = new Date(conversation.last_message_timestamp)
        if (isToday(date)) {
          return format(date, 'HH:mm')
        } else if (isYesterday(date)) {
          return 'Ontem'
        } else {
          return format(date, 'dd/MM/yy')
        }
      })()
    : ''

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 hover:bg-[#202c33] transition-colors text-left border-b border-gray-800 ${
        isSelected ? 'bg-[#2a3942]' : 'bg-[#111b21]'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 pt-1">
          {conversation.profile_picture_url ? (
            <img
              src={conversation.profile_picture_url}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#6b7c85] flex items-center justify-center text-white font-semibold text-lg">
              {displayName[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="font-medium text-white truncate text-[16px]">
              {displayName}
            </h3>
            {lastMessageTime && (
              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                {lastMessageTime}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400 truncate flex-1">
              {conversation.last_message_from_me && (
                <span className="text-gray-500 mr-1">Você: </span>
              )}
              {conversation.last_message_content || 'Sem mensagens'}
            </p>

            {conversation.unread_count > 0 && (
              <span className="ml-2 bg-[#00a884] text-white text-xs font-semibold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 flex-shrink-0">
                {conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

/**
 * Formata número de telefone do remoteJid
 * Ex: 5521999999999@s.whatsapp.net → +55 21 99999-9999
 */
function formatPhoneNumber(remoteJid: string): string {
  const number = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '')
  
  if (number.length === 13 && number.startsWith('55')) {
    // Brasileiro: 5521999999999 → +55 21 99999-9999
    return `+55 ${number.slice(2, 4)} ${number.slice(4, 9)}-${number.slice(9)}`
  }
  
  return `+${number}`
}
