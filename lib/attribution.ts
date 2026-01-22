/**
 * Lógica de Atribuição
 * Sistema para identificar origem de conversões via ref code ou IP
 */

import { supabaseAdmin } from '@/lib/supabase';
import { extractRefCodeFromMessage } from '@/lib/tracking-utils';
import { AttributionResult, AttributionParams } from '@/lib/types/tracking';

/**
 * Encontra atribuição de um contato/mensagem
 * Tenta por ref code primeiro, depois por IP
 * 
 * @param params - Parâmetros de atribuição
 * @returns Resultado da atribuição
 */
export async function findAttribution(params: AttributionParams): Promise<AttributionResult> {
  const { messageText, remoteJid, ipAddress } = params;

  // Método 1: Buscar por ref code na mensagem
  if (messageText) {
    const refCode = extractRefCodeFromMessage(messageText);
    
    if (refCode) {
      const result = await findByRefCode(refCode);
      if (result.found) {
        return result;
      }
    }
  }

  // Método 2: Buscar por IP address (últimas 24 horas)
  if (ipAddress) {
    const result = await findByIP(ipAddress);
    if (result.found) {
      return result;
    }
  }

  // Nenhuma atribuição encontrada
  return {
    found: false,
    method: 'none',
  };
}

/**
 * Busca atribuição por ref code
 */
async function findByRefCode(refCode: string): Promise<AttributionResult> {
  try {
    // Busca o clique pelo ref_code
    const { data: click, error } = await supabaseAdmin
      .from('tracking_clicks')
      .select(`
        *,
        link:tracking_links(*)
      `)
      .eq('ref_code', refCode)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !click) {
      return { found: false };
    }

    return {
      found: true,
      refCode,
      method: 'ref_code',
      clickData: click,
      linkData: click.link,
    };
  } catch (error) {
    console.error('Erro ao buscar por ref code:', error);
    return { found: false };
  }
}

/**
 * Busca atribuição por IP address (últimas 24 horas)
 */
async function findByIP(ipAddress: string): Promise<AttributionResult> {
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data: click, error } = await supabaseAdmin
      .from('tracking_clicks')
      .select(`
        *,
        link:tracking_links(*)
      `)
      .eq('ip_address', ipAddress)
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !click) {
      return { found: false };
    }

    return {
      found: true,
      refCode: click.ref_code,
      method: 'ip_address',
      clickData: click,
      linkData: click.link,
    };
  } catch (error) {
    console.error('Erro ao buscar por IP:', error);
    return { found: false };
  }
}

/**
 * Salva evento de atribuição no funil
 */
export async function saveAttributionEvent(params: {
  refCode: string;
  eventType: 'Lead' | 'Contact' | 'Purchase';
  eventId: string;
  remoteJid?: string;
  customerEmail?: string;
  customerPhone?: string;
  saleId?: string;
  eventData?: Record<string, any>;
}) {
  try {
    const { error } = await supabaseAdmin
      .from('funnel_events_map')
      .insert({
        ref_code: params.refCode,
        event_type: params.eventType,
        event_id: params.eventId,
        remote_jid: params.remoteJid,
        customer_email: params.customerEmail,
        customer_phone: params.customerPhone,
        sale_id: params.saleId,
        event_data: params.eventData,
      });

    if (error) {
      console.error('Erro ao salvar evento de atribuição:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao salvar evento de atribuição:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Enfileira evento para envio ao Meta Pixel
 */
export async function enqueuePixelEvent(params: {
  integrationId: string;
  eventId: string;
  eventType: 'Lead' | 'Contact' | 'Purchase' | 'InitiateCheckout' | 'AddToCart';
  eventData: Record<string, any>;
  userData?: Record<string, any>;
  customData?: Record<string, any>;
}) {
  try {
    const { error } = await supabaseAdmin
      .from('tracking_events_queue')
      .insert({
        integration_id: params.integrationId,
        event_id: params.eventId,
        event_type: params.eventType,
        event_data: params.eventData,
        user_data: params.userData,
        custom_data: params.customData,
        status: 'pending',
      });

    if (error) {
      console.error('Erro ao enfileirar evento:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao enfileirar evento:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Processa atribuição completa quando um lead/venda é gerado
 * 
 * Exemplo de uso:
 * await processAttribution({
 *   messageText: "Olá! Quero saber mais sobre o produto ref:ABC123",
 *   remoteJid: "5511999999999@s.whatsapp.net",
 *   ipAddress: "192.168.1.1",
 *   eventType: 'Lead',
 *   saleId: 'sale-uuid-here'
 * });
 */
export async function processAttribution(params: {
  messageText?: string;
  remoteJid: string;
  ipAddress?: string;
  eventType: 'Lead' | 'Contact' | 'Purchase';
  saleId?: string;
  customerEmail?: string;
  customerPhone?: string;
  eventData?: Record<string, any>;
}) {
  try {
    // 1. Tenta encontrar atribuição
    const attribution = await findAttribution({
      messageText: params.messageText,
      remoteJid: params.remoteJid,
      ipAddress: params.ipAddress,
    });

    if (!attribution.found || !attribution.refCode) {
      console.log('Nenhuma atribuição encontrada para:', params.remoteJid);
      return { success: false, reason: 'no_attribution' };
    }

    console.log(`Atribuição encontrada via ${attribution.method}:`, attribution.refCode);

    // 2. Gera event ID único
    const eventId = crypto.randomUUID();

    // 3. Salva no funil de eventos
    await saveAttributionEvent({
      refCode: attribution.refCode,
      eventType: params.eventType,
      eventId,
      remoteJid: params.remoteJid,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      saleId: params.saleId,
      eventData: params.eventData,
    });

    // 4. Busca integração do Meta para enfileirar evento
    if (attribution.linkData) {
      const { data: integration } = await supabaseAdmin
        .from('integrations_meta')
        .select('id')
        .eq('user_id', attribution.linkData.user_id)
        .eq('is_active', true)
        .single();

      if (integration) {
        await enqueuePixelEvent({
          integrationId: integration.id,
          eventId,
          eventType: params.eventType,
          eventData: {
            ref_code: attribution.refCode,
            link_id: attribution.linkData.id,
            ...params.eventData,
          },
          userData: {
            em: params.customerEmail, // Email (será hasheado)
            ph: params.customerPhone, // Phone (será hasheado)
          },
          customData: {
            currency: 'BRL',
            value: params.eventType === 'Purchase' ? (params.eventData?.value || 0) : 0,
          },
        });
      }
    }

    return {
      success: true,
      attribution,
      eventId,
    };
  } catch (error: any) {
    console.error('Erro ao processar atribuição:', error);
    return { success: false, error: error.message };
  }
}
