/**
 * SNIPPET DE INTEGRAÇÃO - WEBHOOK WHATSAPP
 * 
 * Este arquivo contém o código que deve ser adicionado ao webhook do WhatsApp
 * para integrar o sistema de atribuição.
 * 
 * LOCALIZAÇÃO: app/api/webhooks/whatsapp/route.ts
 * 
 * INSTRUÇÕES:
 * 1. Importe a função processAttribution no início do arquivo
 * 2. Adicione a chamada após salvar a mensagem no banco
 */

// ============================================================================
// PASSO 1: ADICIONAR IMPORT NO TOPO DO ARQUIVO
// ============================================================================

import { processAttribution } from '@/lib/attribution';

// ============================================================================
// PASSO 2: ADICIONAR CHAMADA APÓS UPSERT DA MENSAGEM
// ============================================================================

// Exemplo de onde adicionar (após salvar a mensagem):

async function handleMessage(payload: EvolutionMessagePayload) {
  // ... código existente de salvar mensagem ...
  
  // ✅ ADICIONAR AQUI - Logo após upsert da mensagem
  if (!message.from_me) {
    // Só processa atribuição para mensagens recebidas (não enviadas)
    try {
      const remoteJid = message.remote_jid;
      const messageText = message.content || '';
      
      // Tenta capturar IP do request (se disponível)
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                       request.headers.get('x-real-ip') || 
                       undefined;
      
      // Processa atribuição (Lead/Contact)
      const attribution = await processAttribution({
        messageText,
        remoteJid,
        ipAddress,
        eventType: 'Contact', // Ou 'Lead' se preferir
        customerPhone: remoteJid.replace('@s.whatsapp.net', ''),
        eventData: {
          message_id: message.id,
          timestamp: message.timestamp,
          has_media: !!message.media_url,
        },
      });
      
      if (attribution.success) {
        console.log('✅ Atribuição processada:', {
          refCode: attribution.attribution?.refCode,
          method: attribution.attribution?.method,
          eventId: attribution.eventId,
        });
      }
    } catch (error) {
      console.error('❌ Erro ao processar atribuição:', error);
      // Não falha o webhook se atribuição falhar
    }
  }
}

// ============================================================================
// PASSO 3: ADICIONAR ATRIBUIÇÃO EM VENDAS (OPCIONAL)
// ============================================================================

// Se você tem um webhook/action de vendas, adicione também:

async function handleSale(saleData: any) {
  try {
    await processAttribution({
      remoteJid: saleData.customer_phone + '@s.whatsapp.net',
      eventType: 'Purchase',
      saleId: saleData.id,
      customerEmail: saleData.customer_email,
      customerPhone: saleData.customer_phone,
      eventData: {
        value: saleData.total_amount,
        currency: 'BRL',
        product_name: saleData.product_name,
        order_id: saleData.appmax_order_id,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao processar atribuição de venda:', error);
  }
}

// ============================================================================
// EXEMPLO COMPLETO DE INTEGRAÇÃO
// ============================================================================

/*
import { NextRequest, NextResponse } from 'next/server';
import { upsertWhatsAppMessage, upsertWhatsAppContact } from '@/lib/whatsapp-db';
import { processAttribution } from '@/lib/attribution'; // ← ADICIONAR

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    // Processar mensagem
    const messageData = extractMessageData(payload);
    const message = await upsertWhatsAppMessage(messageData);
    
    // ✅ ATRIBUIÇÃO - Processar se for mensagem recebida
    if (!message.from_me) {
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                       request.headers.get('x-real-ip') || 
                       undefined;
      
      processAttribution({
        messageText: message.content || '',
        remoteJid: message.remote_jid,
        ipAddress,
        eventType: 'Contact',
        customerPhone: message.remote_jid.replace('@s.whatsapp.net', ''),
        eventData: {
          message_id: message.id,
          timestamp: message.timestamp,
        },
      }).catch(err => console.error('Erro atribuição:', err));
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
*/

// ============================================================================
// NOTAS IMPORTANTES
// ============================================================================

/*
1. A função processAttribution é assíncrona mas pode ser chamada sem await
   para não bloquear o webhook (use .catch() para logs de erro)

2. O eventType pode ser:
   - 'Contact': Quando alguém manda mensagem pela primeira vez
   - 'Lead': Quando demonstra interesse real
   - 'Purchase': Quando completa uma compra

3. A atribuição tenta encontrar o ref code de duas formas:
   - Diretamente na mensagem (ref:XXXXXX)
   - Por IP address (últimas 24 horas)

4. Se encontrar atribuição, automaticamente:
   - Salva no funnel_events_map
   - Enfileira evento para Meta Pixel (se integração ativa)

5. Mesmo sem atribuição encontrada, o webhook continua funcionando normalmente
*/
