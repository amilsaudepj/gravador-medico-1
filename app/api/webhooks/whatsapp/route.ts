// ================================================================
// WEBHOOK: Evolution API v2 - MESSAGES_UPSERT
// ================================================================
// Endpoint: POST /api/webhooks/whatsapp
// Recebe eventos de mensagens da Evolution API e salva no banco
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { upsertWhatsAppMessage, upsertWhatsAppContact, messageExists } from '@/lib/whatsapp-db'
import type { EvolutionMessagePayload, CreateMessageInput } from '@/lib/types/whatsapp'

/**
 * Busca a foto de perfil do contato com estratégia de fallback
 * 
 * ESTRATÉGIA:
 * 1. Tenta extrair do próprio payload da mensagem (às vezes a Evolution envia)
 * 2. Tenta buscar via GET /chat/findContacts/{instance}?where[remoteJid]=xxx
 * 3. Se falhar tudo, retorna null (não trava o processo)
 */
async function fetchProfilePicture(
  remoteJid: string, 
  messagePayload?: any
): Promise<string | null> {
  try {
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
    const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      console.warn('⚠️ Variáveis de ambiente Evolution API não configuradas')
      return null
    }

    // ================================================================
    // ESTRATÉGIA 1: Verificar se a foto já vem no payload da mensagem
    // ================================================================
    if (messagePayload) {
      const photoFromPayload = 
        messagePayload.profilePictureUrl ||
        messagePayload.profilePicUrl ||
        messagePayload.picture ||
        messagePayload.imgUrl ||
        (messagePayload.pushName && messagePayload.profilePicture) ||
        null

      if (photoFromPayload) {
        console.log(`✅ Foto encontrada no payload da mensagem: ${photoFromPayload}`)
        return photoFromPayload
      }
    }

    // ================================================================
    // ESTRATÉGIA 2: Buscar via endpoint findContacts (ÚNICO que funciona)
    // ================================================================
    const url = `${EVOLUTION_API_URL}/chat/findContacts/${EVOLUTION_INSTANCE_NAME}?where[remoteJid]=${encodeURIComponent(remoteJid)}`
    
    console.log(`📸 Buscando foto via findContacts: ${url}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    })

    if (!response.ok) {
      console.warn(`⚠️ Erro HTTP ${response.status} ao buscar contatos para ${remoteJid}`)
      return null
    }

    const data = await response.json()
    
    console.log(`📸 Resposta findContacts:`, JSON.stringify(data, null, 2))
    
    // A resposta pode ser um array de contatos
    const contacts = Array.isArray(data) ? data : [data]
    
    for (const contact of contacts) {
      const photoUrl = 
        contact.profilePictureUrl || 
        contact.profilePicUrl || 
        contact.picture || 
        contact.imgUrl ||
        null

      if (photoUrl) {
        console.log(`✅ Foto de perfil encontrada via findContacts: ${photoUrl}`)
        return photoUrl
      }
    }

    console.log(`⚠️ Nenhuma foto de perfil encontrada - salvando como null`)
    return null
    
  } catch (error) {
    console.error('❌ Erro ao buscar foto de perfil (não crítico):', error)
    return null
  }
}

/**
 * Extrai conteúdo e tipo da mensagem do payload da Evolution API
 */
function extractMessageContent(message: any, messageType: string) {
  let content: string | undefined
  let media_url: string | undefined
  let caption: string | undefined
  let type: CreateMessageInput['message_type'] = 'text'

  // Texto simples
  if (message.conversation) {
    content = message.conversation
    type = 'text'
  }
  // Texto estendido (resposta, etc)
  else if (message.extendedTextMessage?.text) {
    content = message.extendedTextMessage.text
    type = 'text'
  }
  // Imagem
  else if (message.imageMessage) {
    media_url = message.imageMessage.url
    caption = message.imageMessage.caption
    content = caption || '[Imagem]'
    type = 'image'
  }
  // Vídeo
  else if (message.videoMessage) {
    media_url = message.videoMessage.url
    caption = message.videoMessage.caption
    content = caption || '[Vídeo]'
    type = 'video'
  }
  // Áudio
  else if (message.audioMessage) {
    media_url = message.audioMessage.url
    content = '[Áudio]'
    type = 'audio'
  }
  // Documento
  else if (message.documentMessage) {
    media_url = message.documentMessage.url
    caption = message.documentMessage.caption
    content = message.documentMessage.fileName || '[Documento]'
    type = 'document'
  }
  // Sticker
  else if (message.stickerMessage) {
    media_url = message.stickerMessage.url
    content = '[Sticker]'
    type = 'sticker'
  }
  // Localização
  else if (message.locationMessage) {
    content = `📍 Localização: ${message.locationMessage.degreesLatitude}, ${message.locationMessage.degreesLongitude}`
    type = 'location'
  }
  // Contato
  else if (message.contactMessage) {
    content = `👤 Contato: ${message.contactMessage.displayName || 'Sem nome'}`
    type = 'contact'
  }
  // Tipo desconhecido
  else {
    content = `[${messageType}]`
  }

  return { content, media_url, caption, type }
}

export async function POST(request: NextRequest) {
  try {
    const payload: EvolutionMessagePayload = await request.json()

    console.log('📥 Webhook recebido:', {
      event: payload.event,
      instance: payload.instance,
      remoteJid: payload.data.key.remoteJid,
      fromMe: payload.data.key.fromMe,
      messageType: payload.data.messageType
    })

    // Ignorar eventos que não são de mensagens
    if (payload.event !== 'messages.upsert') {
      return NextResponse.json({ 
        success: true, 
        message: 'Evento ignorado (não é messages.upsert)' 
      })
    }

    const { key, message, messageType, messageTimestamp, pushName, status } = payload.data

    // Verificar se mensagem já existe (evitar duplicatas)
    const exists = await messageExists(key.id)
    if (exists) {
      console.log('⚠️ Mensagem já existe:', key.id)
      return NextResponse.json({ 
        success: true, 
        message: 'Mensagem já existe' 
      })
    }

    // Extrair conteúdo da mensagem
    const { content, media_url, caption, type } = extractMessageContent(message, messageType)

    // ================================================================
    // PASSO 1: Buscar foto de perfil do contato
    // Estratégia: 1) Tentar no payload, 2) Buscar via API, 3) null
    // ================================================================
    console.log('📸 Buscando foto de perfil com fallback...')
    const profilePictureUrl = await fetchProfilePicture(key.remoteJid, payload.data)

    // ================================================================
    // PASSO 2: UPSERT do contato PRIMEIRO (resolver FK constraint)
    // ================================================================
    console.log('🔄 Criando/atualizando contato primeiro...')
    await upsertWhatsAppContact({
      remote_jid: key.remoteJid,
      push_name: pushName || undefined,
      profile_picture_url: profilePictureUrl || undefined,
      is_group: key.remoteJid.includes('@g.us')
    })
    console.log('✅ Contato garantido:', key.remoteJid)

    // ================================================================
    // PASSO 3: INSERT da mensagem (agora o FK existe)
    // ================================================================
    const messageInput: CreateMessageInput = {
      message_id: key.id,
      remote_jid: key.remoteJid,
      content,
      message_type: type,
      media_url,
      caption,
      from_me: key.fromMe,
      timestamp: new Date(messageTimestamp * 1000).toISOString(),
      status: status as any,
      raw_payload: payload.data
    }

    const savedMessage = await upsertWhatsAppMessage(messageInput)
    console.log('✅ Mensagem salva:', savedMessage.id)

    return NextResponse.json({
      success: true,
      message: 'Mensagem processada com sucesso',
      messageId: savedMessage.id
    })

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Permitir GET para health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    webhook: 'whatsapp-evolution-api-v2',
    timestamp: new Date().toISOString()
  })
}
