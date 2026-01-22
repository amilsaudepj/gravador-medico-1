/**
 * Tipos e Interfaces para o Módulo de Tracking e Atribuição
 * Tintim Killer - Rastreamento SaaS v3
 */

// ============================================================================
// INTEGRAÇÕES META
// ============================================================================

export interface IntegrationMeta {
  id: string;
  user_id: string;
  access_token: string;
  pixel_id: string;
  test_event_code?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationMetaInsert {
  user_id: string;
  access_token: string;
  pixel_id: string;
  test_event_code?: string | null;
  is_active?: boolean;
}

export interface IntegrationMetaUpdate {
  access_token?: string;
  pixel_id?: string;
  test_event_code?: string | null;
  is_active?: boolean;
}

// ============================================================================
// LINKS RASTREÁVEIS
// ============================================================================

export interface TrackingLink {
  id: string;
  user_id: string;
  slug: string; // URL curta única (ex: "promo-jan")
  destination_url: string; // URL final de destino
  whatsapp_number: string; // Número do WhatsApp (formato: 5511999999999)
  whatsapp_message: string; // Mensagem pré-preenchida
  campaign_name?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrackingLinkInsert {
  user_id: string;
  slug: string;
  destination_url: string;
  whatsapp_number: string;
  whatsapp_message: string;
  campaign_name?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  is_active?: boolean;
}

export interface TrackingLinkUpdate {
  destination_url?: string;
  whatsapp_number?: string;
  whatsapp_message?: string;
  campaign_name?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  is_active?: boolean;
}

// ============================================================================
// CLIQUES RASTREADOS
// ============================================================================

export interface TrackingClick {
  id: string;
  link_id: string;
  ref_code: string; // Código único de 6 caracteres
  event_id: string; // UUID para rastreamento no Meta Pixel
  ip_address?: string | null;
  user_agent?: string | null;
  referer?: string | null;
  clicked_at: string;
  created_at: string;
}

export interface TrackingClickInsert {
  link_id: string;
  ref_code: string;
  event_id: string;
  ip_address?: string | null;
  user_agent?: string | null;
  referer?: string | null;
}

// ============================================================================
// FILA DE EVENTOS (Meta Pixel)
// ============================================================================

export type EventStatus = 'pending' | 'sent' | 'failed';
export type EventType = 
  | 'PageView' 
  | 'ViewContent' 
  | 'AddToCart' 
  | 'InitiateCheckout' 
  | 'Purchase' 
  | 'Lead'
  | 'Contact'
  | 'CompleteRegistration';

export interface TrackingEventsQueue {
  id: string;
  integration_id: string;
  event_id: string; // UUID compartilhado com tracking_clicks
  event_type: EventType;
  event_data: Record<string, any>; // JSON com dados customizados
  user_data?: Record<string, any> | null; // Dados do usuário (email, phone, etc)
  custom_data?: Record<string, any> | null; // Dados customizados adicionais
  status: EventStatus;
  retry_count: number;
  error_message?: string | null;
  sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackingEventsQueueInsert {
  integration_id: string;
  event_id: string;
  event_type: EventType;
  event_data: Record<string, any>;
  user_data?: Record<string, any> | null;
  custom_data?: Record<string, any> | null;
  status?: EventStatus;
}

export interface TrackingEventsQueueUpdate {
  status?: EventStatus;
  retry_count?: number;
  error_message?: string | null;
  sent_at?: string | null;
}

// ============================================================================
// MAPEAMENTO DE FUNIL
// ============================================================================

export interface FunnelEventsMap {
  id: string;
  ref_code: string;
  event_type: EventType;
  event_id: string;
  remote_jid?: string | null; // Número do WhatsApp do cliente
  customer_email?: string | null;
  customer_phone?: string | null;
  sale_id?: string | null; // Relaciona com tabela sales
  event_data?: Record<string, any> | null;
  created_at: string;
}

export interface FunnelEventsMapInsert {
  ref_code: string;
  event_type: EventType;
  event_id: string;
  remote_jid?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  sale_id?: string | null;
  event_data?: Record<string, any> | null;
}

// ============================================================================
// TIPOS DE RESPOSTA E FORMULÁRIOS
// ============================================================================

export interface TrackingDashboardStats {
  totalClicks: number;
  totalEvents: number;
  pendingEvents: number;
  failedEvents: number;
  activeLinks: number;
  conversions: number;
}

export interface TrackingLinkWithStats extends TrackingLink {
  clicks_count: number;
  conversions_count: number;
  last_click_at?: string | null;
}

export interface RedirectData {
  link: TrackingLink;
  integration: IntegrationMeta | null;
  eventId: string;
  refCode: string;
}

// ============================================================================
// TIPOS PARA ATRIBUIÇÃO
// ============================================================================

export interface AttributionResult {
  found: boolean;
  refCode?: string;
  method?: 'ref_code' | 'ip_address' | 'none';
  clickData?: TrackingClick;
  linkData?: TrackingLink;
}

export interface AttributionParams {
  messageText?: string;
  remoteJid: string;
  ipAddress?: string;
}
