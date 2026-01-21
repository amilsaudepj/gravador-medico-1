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
 * Busca a foto de perfil do contato com estratégia de fallback robusta
 * 
 * ESTRATÉGIA DEFINITIVA (após múltiplos testes):
 * 1. Tenta extrair do próprio payload da mensagem (às vezes a Evolution envia)
 * 2. Tenta buscar via POST /contact/checkNumbers (MAIS ROBUSTO na v2)
 * 3. Se qualquer erro ocorrer, retorna null e NÃO TRAVA o processo
 * 
 * IMPORTANTE: A mensagem SEMPRE será salva, mesmo sem foto
 */
async function fetchProfilePicture(
  remoteJid: string, 
  messagePayload?: any
): Promise<string | null> {
  // Wrapper try-catch global para garantir que NUNCA trava
  try {
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
    const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      console.warn('⚠️ [FOTO] Variáveis de ambiente não configuradas - salvando sem foto')
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
        console.log(`✅ [FOTO] Encontrada no payload: ${photoFromPayload}`)
        return photoFromPayload
      }
    }

    // ================================================================
    // ESTRATÉGIA 2: POST /contact/checkNumbers (MAIS ROBUSTO na v2)
    // Extrai apenas o número (sem @s.whatsapp.net)
    // ================================================================
    const phoneNumber = remoteJid.split('@')[0]
    const url = `${EVOLUTION_API_URL}/contact/checkNumbers/${EVOLUTION_INSTANCE_NAME}`
    
    console.log(`📸 [FOTO] Tentando POST /contact/checkNumbers`)
    console.log(`📸 [FOTO] URL: ${url}`)
    console.log(`📸 [FOTO] Numbers: [${phoneNumber}]`)
    
    // Timeout de 5 segundos para não travar o webhook
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        numbers: [phoneNumber]
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`⚠️ [FOTO] HTTP ${response.status} em checkNumbers - salvando sem foto`)
      return null
    }

    const data = await response.json()
    
    console.log(`📸 [FOTO] Resposta checkNumbers:`, JSON.stringify(data, null, 2))
    
    // A resposta é um array. Pegue o primeiro item
    const contacts = Array.isArray(data) ? data : []
    
    if (contacts.length === 0) {
      console.log(`⚠️ [FOTO] Array vazio retornado - salvando sem foto`)
      return null
    }
    
    // Extrair profilePicUrl do primeiro item
    const firstContact = contacts[0]
    const photoUrl = 
      firstContact.profilePicUrl || 
      firstContact.profilePictureUrl ||
      firstContact.picture ||
      firstContact.imgUrl ||
      firstContact.image ||
      null

    if (photoUrl && typeof photoUrl === 'string') {
      console.log(`✅ [FOTO] Encontrada via checkNumbers: ${photoUrl}`)
      return photoUrl
    }

    console.log(`⚠️ [FOTO] Contato retornado mas sem campo profilePicUrl - salvando sem foto`)
    return null
    
  } catch (error) {
    // CRÍTICO: Mesmo com erro, retorna null para não travar o webhook
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('⏱️ [FOTO] Timeout ao buscar foto - continuando sem foto')
    } else {
      console.error('❌ [FOTO] Erro ao buscar (não crítico - continuando):', error)
    }
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
    // PASSO 1: Buscar foto de perfil (NÃO CRÍTICO - nunca trava)
    // Usa endpoint /chat/findContacts confirmado via teste curl
    // ================================================================
    console.log('📸 [FOTO] Iniciando busca de foto de perfil...')
    const profilePictureUrl = await fetchProfilePicture(key.remoteJid, payload.data)
    
    if (profilePictureUrl) {
      console.log(`✅ [FOTO] Foto obtida com sucesso: ${profilePictureUrl.substring(0, 50)}...`)
    } else {
      console.log(`ℹ️ [FOTO] Nenhuma foto encontrada - salvando contato sem foto`)
    }

    // ================================================================
    // PASSO 2: UPSERT do contato PRIMEIRO (resolver FK constraint)
    // GARANTIA: Sempre salva o contato, mesmo sem foto
    // ================================================================
    console.log('🔄 [CONTATO] Criando/atualizando contato...')
    try {
      await upsertWhatsAppContact({
        remote_jid: key.remoteJid,
        push_name: pushName || undefined,
        profile_picture_url: profilePictureUrl || undefined, // ✅ null é aceito
        is_group: key.remoteJid.includes('@g.us')
      })
      console.log(`✅ [CONTATO] Salvo: ${key.remoteJid} (foto: ${profilePictureUrl ? 'SIM' : 'NÃO'})`)
    } catch (contactError) {
      console.error('❌ [CONTATO] Erro ao salvar contato:', contactError)
      throw contactError // Re-throw para não salvar mensagem órfã
    }

    // ================================================================
    // PASSO 3: INSERT da mensagem (agora o FK existe)
    // ================================================================
    console.log('💬 [MENSAGEM] Salvando mensagem...')
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
    console.log(`✅ [MENSAGEM] Salva com sucesso: ${savedMessage.id}`)

    return NextResponse.json({
      success: true,
      message: 'Mensagem processada com sucesso',
      messageId: savedMessage.id,
      hasProfilePicture: !!profilePictureUrl
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
