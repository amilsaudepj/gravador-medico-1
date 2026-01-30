/**
 * =====================================================
 * TRACKING CORE - Blindagem de Disparo
 * =====================================================
 * 
 * 🎯 OBJETIVO:
 * Isolar a lógica de disparo para Meta CAPI e GA4.
 * Esta função deve ser "Burra e Robusta":
 * - Recebeu a venda? Dispara.
 * - Deu erro no Meta? Loga e continua.
 * - Deu erro no GA4? Loga e continua.
 * - NUNCA para o processo principal.
 * 
 * 📊 EVENTOS SUPORTADOS:
 * - Purchase (venda confirmada)
 * - InitiateCheckout (checkout iniciado)
 * - AddToCart (produto adicionado)
 * - Lead (lead capturado)
 * - PageView (visualização de página)
 * 
 * 🔒 GARANTIAS:
 * - event_id único para deduplicação
 * - email/phone hasheados (SHA256)
 * - value em BRL
 * - Logging completo para debug
 * 
 * =====================================================
 */

import crypto from 'crypto';

// =====================================================
// TYPES
// =====================================================

export type TrackingEventType = 
  | 'Purchase' 
  | 'InitiateCheckout' 
  | 'AddToCart' 
  | 'Lead' 
  | 'ViewContent' 
  | 'PageView';

export interface TrackingUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  ipAddress?: string;
  userAgent?: string;
  fbc?: string; // Facebook Click ID
  fbp?: string; // Facebook Browser ID
}

export interface TrackingEventData {
  value?: number;
  currency?: string;
  contentName?: string;
  contentIds?: string[];
  contentType?: string;
  numItems?: number;
  orderId?: string;
  eventSourceUrl?: string;
}

export interface TrackingPayload {
  eventType: TrackingEventType;
  eventId: string;
  eventTime: number;
  userData: TrackingUserData;
  eventData: TrackingEventData;
}

export interface TrackingResult {
  success: boolean;
  eventId: string;
  meta: { sent: boolean; error?: string };
  ga4: { sent: boolean; error?: string };
  logs: string[];
}

// =====================================================
// CONFIGURATION
// =====================================================

const META_CONFIG = {
  pixelId: process.env.FACEBOOK_PIXEL_ID,
  accessToken: process.env.FACEBOOK_ACCESS_TOKEN,
  testEventCode: process.env.META_TEST_EVENT_CODE,
  apiVersion: 'v19.0',
};

const GA4_CONFIG = {
  measurementId: process.env.GA4_MEASUREMENT_ID,
  apiSecret: process.env.GA4_API_SECRET,
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Hash SHA256 para dados do usuário (privacidade Meta)
 */
function hashSha256(data: string | undefined): string | undefined {
  if (!data) return undefined;
  return crypto
    .createHash('sha256')
    .update(data.toLowerCase().trim())
    .digest('hex');
}

/**
 * Normaliza telefone para formato internacional
 */
function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/\D/g, '');
  // Adicionar código do Brasil se não tiver
  if (cleaned.length === 11 && !cleaned.startsWith('55')) {
    return '55' + cleaned;
  }
  return cleaned;
}

/**
 * Gera Event ID único se não fornecido
 */
function generateEventId(): string {
  return crypto.randomUUID();
}

/**
 * Log estruturado para tracking
 */
function trackingLog(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const prefix = {
    info: '📊 [Tracking]',
    warn: '⚠️ [Tracking]',
    error: '❌ [Tracking]',
  }[level];
  
  console[level](prefix, message, data ? JSON.stringify(data, null, 2) : '');
}

// =====================================================
// META CAPI SENDER
// =====================================================

async function sendToMetaCapi(payload: TrackingPayload): Promise<{ sent: boolean; error?: string }> {
  if (!META_CONFIG.pixelId || !META_CONFIG.accessToken) {
    return { sent: false, error: 'Meta CAPI não configurado' };
  }

  try {
    // Montar User Data (hasheado)
    const userData: Record<string, any> = {};
    
    if (payload.userData.email) {
      userData.em = [hashSha256(payload.userData.email)];
    }
    if (payload.userData.phone) {
      userData.ph = [hashSha256(normalizePhone(payload.userData.phone))];
    }
    if (payload.userData.firstName) {
      userData.fn = [hashSha256(payload.userData.firstName)];
    }
    if (payload.userData.lastName) {
      userData.ln = [hashSha256(payload.userData.lastName)];
    }
    if (payload.userData.city) {
      userData.ct = [hashSha256(payload.userData.city)];
    }
    if (payload.userData.state) {
      userData.st = [hashSha256(payload.userData.state)];
    }
    if (payload.userData.country) {
      userData.country = [hashSha256(payload.userData.country)];
    }
    if (payload.userData.zip) {
      userData.zp = [hashSha256(payload.userData.zip)];
    }
    if (payload.userData.ipAddress) {
      userData.client_ip_address = payload.userData.ipAddress;
    }
    if (payload.userData.userAgent) {
      userData.client_user_agent = payload.userData.userAgent;
    }
    if (payload.userData.fbc) {
      userData.fbc = payload.userData.fbc;
    }
    if (payload.userData.fbp) {
      userData.fbp = payload.userData.fbp;
    }

    // Montar Custom Data
    const customData: Record<string, any> = {
      value: payload.eventData.value || 0,
      currency: payload.eventData.currency || 'BRL',
    };
    
    if (payload.eventData.contentName) {
      customData.content_name = payload.eventData.contentName;
    }
    if (payload.eventData.contentIds) {
      customData.content_ids = payload.eventData.contentIds;
    }
    if (payload.eventData.contentType) {
      customData.content_type = payload.eventData.contentType;
    }
    if (payload.eventData.numItems) {
      customData.num_items = payload.eventData.numItems;
    }
    if (payload.eventData.orderId) {
      customData.order_id = payload.eventData.orderId;
    }

    // Payload final
    const apiPayload: Record<string, any> = {
      data: [{
        event_name: payload.eventType,
        event_time: payload.eventTime,
        event_id: payload.eventId,
        event_source_url: payload.eventData.eventSourceUrl || 'https://gravadormedico.com.br',
        action_source: 'website',
        user_data: userData,
        custom_data: customData,
      }],
    };

    // Adicionar test_event_code se configurado
    if (META_CONFIG.testEventCode) {
      apiPayload.test_event_code = META_CONFIG.testEventCode;
    }

    const url = `https://graph.facebook.com/${META_CONFIG.apiVersion}/${META_CONFIG.pixelId}/events?access_token=${META_CONFIG.accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiPayload),
    });

    const result = await response.json();

    if (result.error) {
      return { sent: false, error: result.error.message || 'Erro na API Meta' };
    }

    trackingLog('info', `Meta CAPI: ${payload.eventType} enviado`, {
      eventId: payload.eventId,
      eventsReceived: result.events_received,
    });

    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    trackingLog('error', `Meta CAPI falhou: ${message}`, { eventId: payload.eventId });
    return { sent: false, error: message };
  }
}

// =====================================================
// GA4 MEASUREMENT PROTOCOL SENDER
// =====================================================

async function sendToGA4(payload: TrackingPayload): Promise<{ sent: boolean; error?: string }> {
  if (!GA4_CONFIG.measurementId || !GA4_CONFIG.apiSecret) {
    return { sent: false, error: 'GA4 Measurement Protocol não configurado' };
  }

  try {
    // Mapear evento para nome do GA4
    const eventNameMap: Record<TrackingEventType, string> = {
      Purchase: 'purchase',
      InitiateCheckout: 'begin_checkout',
      AddToCart: 'add_to_cart',
      Lead: 'generate_lead',
      ViewContent: 'view_item',
      PageView: 'page_view',
    };

    const ga4Event: Record<string, any> = {
      name: eventNameMap[payload.eventType],
      params: {
        currency: payload.eventData.currency || 'BRL',
        value: payload.eventData.value || 0,
        transaction_id: payload.eventData.orderId || payload.eventId,
      },
    };

    if (payload.eventData.contentName) {
      ga4Event.params.item_name = payload.eventData.contentName;
    }
    if (payload.eventData.contentIds?.length) {
      ga4Event.params.items = payload.eventData.contentIds.map((id, idx) => ({
        item_id: id,
        item_name: payload.eventData.contentName || `Product ${idx + 1}`,
        price: payload.eventData.value || 0,
        quantity: 1,
      }));
    }

    const ga4Payload = {
      client_id: payload.eventId, // Usar eventId como client_id temporário
      events: [ga4Event],
    };

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_CONFIG.measurementId}&api_secret=${GA4_CONFIG.apiSecret}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ga4Payload),
    });

    if (!response.ok) {
      return { sent: false, error: `HTTP ${response.status}` };
    }

    trackingLog('info', `GA4: ${payload.eventType} enviado`, {
      eventId: payload.eventId,
    });

    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    trackingLog('error', `GA4 falhou: ${message}`, { eventId: payload.eventId });
    return { sent: false, error: message };
  }
}

// =====================================================
// MAIN TRACKING FUNCTIONS
// =====================================================

/**
 * 🎯 FUNÇÃO PRINCIPAL: Dispara evento de tracking
 * 
 * Envia para Meta CAPI e GA4 em paralelo.
 * Se um falhar, o outro continua.
 * NUNCA lança exceção - sempre retorna resultado.
 */
export async function trackEvent(
  eventType: TrackingEventType,
  userData: TrackingUserData,
  eventData: TrackingEventData = {},
  eventId?: string
): Promise<TrackingResult> {
  const finalEventId = eventId || generateEventId();
  const eventTime = Math.floor(Date.now() / 1000);
  const logs: string[] = [];

  logs.push(`Iniciando tracking: ${eventType} (${finalEventId})`);

  const payload: TrackingPayload = {
    eventType,
    eventId: finalEventId,
    eventTime,
    userData,
    eventData,
  };

  // Disparar em paralelo - falha de um não afeta o outro
  const [metaResult, ga4Result] = await Promise.all([
    sendToMetaCapi(payload),
    sendToGA4(payload),
  ]);

  if (metaResult.sent) {
    logs.push('✅ Meta CAPI: Enviado');
  } else {
    logs.push(`⚠️ Meta CAPI: ${metaResult.error}`);
  }

  if (ga4Result.sent) {
    logs.push('✅ GA4: Enviado');
  } else {
    logs.push(`⚠️ GA4: ${ga4Result.error}`);
  }

  const success = metaResult.sent || ga4Result.sent;
  
  trackingLog(success ? 'info' : 'warn', `Tracking ${eventType} concluído`, {
    eventId: finalEventId,
    meta: metaResult.sent,
    ga4: ga4Result.sent,
  });

  return {
    success,
    eventId: finalEventId,
    meta: metaResult,
    ga4: ga4Result,
    logs,
  };
}

/**
 * 🛒 TRACK PURCHASE - Evento de Venda
 * 
 * Função especializada para vendas confirmadas.
 * Usa a mesma definição de venda do Gateway (REGRA DE OURO).
 */
export async function trackPurchase(sale: {
  orderId: string;
  totalAmount: number;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  productName?: string;
  productIds?: string[];
  currency?: string;
  city?: string;
  state?: string;
  country?: string;
  fbc?: string;
  fbp?: string;
  ipAddress?: string;
  userAgent?: string;
  eventSourceUrl?: string;
}): Promise<TrackingResult> {
  const [firstName, ...lastNameParts] = (sale.customerName || '').split(' ');
  const lastName = lastNameParts.join(' ');

  return trackEvent(
    'Purchase',
    {
      email: sale.customerEmail,
      phone: sale.customerPhone,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      city: sale.city,
      state: sale.state,
      country: sale.country || 'BR',
      fbc: sale.fbc,
      fbp: sale.fbp,
      ipAddress: sale.ipAddress,
      userAgent: sale.userAgent,
    },
    {
      value: sale.totalAmount,
      currency: sale.currency || 'BRL',
      orderId: sale.orderId,
      contentName: sale.productName,
      contentIds: sale.productIds || [sale.orderId],
      contentType: 'product',
      numItems: sale.productIds?.length || 1,
      eventSourceUrl: sale.eventSourceUrl,
    },
    sale.orderId // Usar orderId como eventId para deduplicação
  );
}

/**
 * 🛒 TRACK INITIATE CHECKOUT - Checkout Iniciado
 */
export async function trackInitiateCheckout(checkout: {
  sessionId: string;
  cartValue: number;
  customerEmail?: string;
  customerPhone?: string;
  productName?: string;
  fbc?: string;
  fbp?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<TrackingResult> {
  return trackEvent(
    'InitiateCheckout',
    {
      email: checkout.customerEmail,
      phone: checkout.customerPhone,
      fbc: checkout.fbc,
      fbp: checkout.fbp,
      ipAddress: checkout.ipAddress,
      userAgent: checkout.userAgent,
    },
    {
      value: checkout.cartValue,
      currency: 'BRL',
      contentName: checkout.productName,
      contentType: 'product',
    },
    `checkout_${checkout.sessionId}`
  );
}

/**
 * 🛒 TRACK ADD TO CART
 */
export async function trackAddToCart(cart: {
  sessionId: string;
  productId: string;
  productName: string;
  productPrice: number;
  fbc?: string;
  fbp?: string;
}): Promise<TrackingResult> {
  return trackEvent(
    'AddToCart',
    {
      fbc: cart.fbc,
      fbp: cart.fbp,
    },
    {
      value: cart.productPrice,
      currency: 'BRL',
      contentName: cart.productName,
      contentIds: [cart.productId],
      contentType: 'product',
      numItems: 1,
    },
    `cart_${cart.sessionId}_${cart.productId}`
  );
}

/**
 * 👤 TRACK LEAD
 */
export async function trackLead(lead: {
  email?: string;
  phone?: string;
  name?: string;
  source?: string;
  fbc?: string;
  fbp?: string;
  ipAddress?: string;
}): Promise<TrackingResult> {
  const [firstName, ...lastNameParts] = (lead.name || '').split(' ');
  
  return trackEvent(
    'Lead',
    {
      email: lead.email,
      phone: lead.phone,
      firstName: firstName || undefined,
      lastName: lastNameParts.join(' ') || undefined,
      fbc: lead.fbc,
      fbp: lead.fbp,
      ipAddress: lead.ipAddress,
    },
    {
      contentName: lead.source || 'Website Lead',
    }
  );
}

// =====================================================
// VALIDATION & TESTING
// =====================================================

/**
 * Valida se o payload do CAPI está correto
 * Usado em testes unitários
 */
export function validateCapiPayload(payload: TrackingPayload): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // event_id é obrigatório
  if (!payload.eventId) {
    errors.push('event_id é obrigatório');
  }

  // Para Purchase, value é obrigatório
  if (payload.eventType === 'Purchase') {
    if (typeof payload.eventData.value !== 'number' || payload.eventData.value <= 0) {
      errors.push('value é obrigatório para Purchase e deve ser > 0');
    }
  }

  // Pelo menos email ou phone deve estar presente para matching
  if (!payload.userData.email && !payload.userData.phone) {
    errors.push('email ou phone é recomendado para matching');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Gera payload de teste para validação
 */
export function createTestPayload(eventType: TrackingEventType = 'Purchase'): TrackingPayload {
  return {
    eventType,
    eventId: generateEventId(),
    eventTime: Math.floor(Date.now() / 1000),
    userData: {
      email: 'test@example.com',
      phone: '11999999999',
      firstName: 'Test',
      lastName: 'User',
    },
    eventData: {
      value: 297.00,
      currency: 'BRL',
      orderId: 'TEST-' + Date.now(),
      contentName: 'Produto Teste',
      contentIds: ['SKU-001'],
      contentType: 'product',
      numItems: 1,
    },
  };
}
