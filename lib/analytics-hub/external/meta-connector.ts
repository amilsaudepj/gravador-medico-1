/**
 * =====================================================
 * META CONNECTOR - Analytics Hub
 * =====================================================
 * Responsável por:
 * - Buscar dados de Custo/Impressões da Marketing API
 * - Validar status do CAPI
 * - Cache de 5-10 minutos para performance
 * 
 * Parte do Hub de Métricas Centralizado
 * =====================================================
 */

import { unstable_cache } from 'next/cache';

// =====================================================
// TYPES
// =====================================================

export interface MetaAdsMetrics {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  avgCpc: number;
  avgCtr: number;
  totalPurchases: number;
  totalPurchaseValue: number;
  totalLeads: number;
  roas: number;
  cpa: number;
  cpl: number;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  purchaseValue: number;
  leads: number;
  roas: number;
}

export interface MetaCapiStatus {
  isConfigured: boolean;
  pixelId: string | null;
  lastEventSent: string | null;
  eventsReceived24h: number;
  matchRate: number;
  testMode: boolean;
}

export interface MetaConnectorResult {
  success: boolean;
  metrics: MetaAdsMetrics | null;
  campaigns: MetaCampaign[];
  capiStatus: MetaCapiStatus;
  error?: string;
  cached: boolean;
  cachedAt?: string;
}

// =====================================================
// CONFIGURATION
// =====================================================

const META_CONFIG = {
  adAccountId: process.env.FACEBOOK_AD_ACCOUNT_ID,
  accessToken: process.env.FACEBOOK_ACCESS_TOKEN,
  pixelId: process.env.FACEBOOK_PIXEL_ID,
  testEventCode: process.env.META_TEST_EVENT_CODE,
  apiVersion: 'v19.0',
  baseUrl: 'https://graph.facebook.com',
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60;

// Action types para extração de métricas
const ACTION_TYPES = {
  purchases: ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'],
  leads: ['lead', 'offsite_conversion.fb_pixel_lead'],
  checkout: ['omni_initiated_checkout', 'offsite_conversion.fb_pixel_initiate_checkout'],
} as const;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Extrai valor de actions/action_values por tipo
 */
function extractActionValue(
  actions: Array<{ action_type: string; value: string }> | undefined,
  types: readonly string[]
): number {
  if (!actions || !Array.isArray(actions)) return 0;
  return actions
    .filter((a) => types.includes(a.action_type))
    .reduce((sum, a) => sum + Number(a.value || 0), 0);
}

/**
 * Formata datas para a API do Facebook (YYYY-MM-DD)
 */
function formatDateForMeta(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Valida se as credenciais estão configuradas
 */
function isConfigured(): boolean {
  return !!(META_CONFIG.adAccountId && META_CONFIG.accessToken);
}

// =====================================================
// FETCH FUNCTIONS (Raw - sem cache)
// =====================================================

/**
 * Busca insights da conta de anúncios
 */
async function fetchAdsInsights(
  startDate: Date,
  endDate: Date,
  level: 'account' | 'campaign' = 'account'
): Promise<any[]> {
  if (!isConfigured()) {
    console.warn('⚠️ [MetaConnector] Credenciais não configuradas');
    return [];
  }

  const fields = [
    'campaign_name',
    'campaign_id',
    'spend',
    'impressions',
    'clicks',
    'cpc',
    'ctr',
    'reach',
    'actions',
    'action_values',
    'date_start',
    'date_stop',
  ].join(',');

  const timeRange = JSON.stringify({
    since: formatDateForMeta(startDate),
    until: formatDateForMeta(endDate),
  });

  const url = new URL(
    `${META_CONFIG.baseUrl}/${META_CONFIG.apiVersion}/act_${META_CONFIG.adAccountId}/insights`
  );
  
  url.searchParams.set('fields', fields);
  url.searchParams.set('time_range', timeRange);
  url.searchParams.set('level', level);
  url.searchParams.set('access_token', META_CONFIG.accessToken!);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [MetaConnector] Erro na API:', errorData);
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('💥 [MetaConnector] Erro ao buscar insights:', error);
    throw error;
  }
}

/**
 * Busca status do Pixel/CAPI
 */
async function fetchCapiStatus(): Promise<MetaCapiStatus> {
  const status: MetaCapiStatus = {
    isConfigured: !!(META_CONFIG.pixelId && META_CONFIG.accessToken),
    pixelId: META_CONFIG.pixelId || null,
    lastEventSent: null,
    eventsReceived24h: 0,
    matchRate: 0,
    testMode: !!META_CONFIG.testEventCode,
  };

  if (!status.isConfigured || !META_CONFIG.pixelId) {
    return status;
  }

  try {
    // Buscar estatísticas do pixel
    const url = new URL(
      `${META_CONFIG.baseUrl}/${META_CONFIG.apiVersion}/${META_CONFIG.pixelId}`
    );
    url.searchParams.set('fields', 'last_fired_time,is_unavailable');
    url.searchParams.set('access_token', META_CONFIG.accessToken!);

    const response = await fetch(url.toString());
    if (response.ok) {
      const data = await response.json();
      status.lastEventSent = data.last_fired_time || null;
    }

    // Buscar estatísticas de eventos (últimas 24h)
    const statsUrl = new URL(
      `${META_CONFIG.baseUrl}/${META_CONFIG.apiVersion}/${META_CONFIG.pixelId}/stats`
    );
    statsUrl.searchParams.set('access_token', META_CONFIG.accessToken!);

    const statsResponse = await fetch(statsUrl.toString());
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      const recentStats = statsData.data?.[0];
      if (recentStats) {
        status.eventsReceived24h = recentStats.count || 0;
        status.matchRate = recentStats.match_rate || 0;
      }
    }
  } catch (error) {
    console.error('⚠️ [MetaConnector] Erro ao buscar status CAPI:', error);
    // Não throw - status parcial é melhor que erro total
  }

  return status;
}

// =====================================================
// AGGREGATION FUNCTIONS
// =====================================================

/**
 * Agrega insights em métricas consolidadas
 */
function aggregateMetrics(insights: any[]): MetaAdsMetrics {
  const metrics: MetaAdsMetrics = {
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalReach: 0,
    avgCpc: 0,
    avgCtr: 0,
    totalPurchases: 0,
    totalPurchaseValue: 0,
    totalLeads: 0,
    roas: 0,
    cpa: 0,
    cpl: 0,
  };

  if (!insights || insights.length === 0) {
    return metrics;
  }

  for (const insight of insights) {
    metrics.totalSpend += parseFloat(insight.spend || '0');
    metrics.totalImpressions += parseInt(insight.impressions || '0', 10);
    metrics.totalClicks += parseInt(insight.clicks || '0', 10);
    metrics.totalReach += parseInt(insight.reach || '0', 10);
    metrics.totalPurchases += extractActionValue(insight.actions, ACTION_TYPES.purchases);
    metrics.totalPurchaseValue += extractActionValue(insight.action_values, ACTION_TYPES.purchases);
    metrics.totalLeads += extractActionValue(insight.actions, ACTION_TYPES.leads);
  }

  // Calcular médias e derivados
  if (metrics.totalClicks > 0) {
    metrics.avgCpc = metrics.totalSpend / metrics.totalClicks;
  }
  if (metrics.totalImpressions > 0) {
    metrics.avgCtr = (metrics.totalClicks / metrics.totalImpressions) * 100;
  }
  if (metrics.totalSpend > 0) {
    metrics.roas = metrics.totalPurchaseValue / metrics.totalSpend;
    if (metrics.totalPurchases > 0) {
      metrics.cpa = metrics.totalSpend / metrics.totalPurchases;
    }
    if (metrics.totalLeads > 0) {
      metrics.cpl = metrics.totalSpend / metrics.totalLeads;
    }
  }

  return metrics;
}

/**
 * Transforma insights em lista de campanhas
 */
function transformToCampaigns(insights: any[]): MetaCampaign[] {
  const campaignMap = new Map<string, MetaCampaign>();

  for (const insight of insights) {
    const campaignId = insight.campaign_id;
    if (!campaignId) continue;

    const existing = campaignMap.get(campaignId);
    const spend = parseFloat(insight.spend || '0');
    const purchases = extractActionValue(insight.actions, ACTION_TYPES.purchases);
    const purchaseValue = extractActionValue(insight.action_values, ACTION_TYPES.purchases);

    if (existing) {
      existing.spend += spend;
      existing.impressions += parseInt(insight.impressions || '0', 10);
      existing.clicks += parseInt(insight.clicks || '0', 10);
      existing.purchases += purchases;
      existing.purchaseValue += purchaseValue;
      existing.leads += extractActionValue(insight.actions, ACTION_TYPES.leads);
    } else {
      campaignMap.set(campaignId, {
        id: campaignId,
        name: insight.campaign_name || 'Campanha sem nome',
        status: 'ACTIVE', // Não temos essa info nos insights
        spend,
        impressions: parseInt(insight.impressions || '0', 10),
        clicks: parseInt(insight.clicks || '0', 10),
        purchases,
        purchaseValue,
        leads: extractActionValue(insight.actions, ACTION_TYPES.leads),
        roas: spend > 0 ? purchaseValue / spend : 0,
      });
    }
  }

  // Recalcular ROAS por campanha
  for (const campaign of campaignMap.values()) {
    campaign.roas = campaign.spend > 0 ? campaign.purchaseValue / campaign.spend : 0;
  }

  return Array.from(campaignMap.values()).sort((a, b) => b.spend - a.spend);
}

// =====================================================
// CACHED PUBLIC API
// =====================================================

/**
 * Busca métricas do Meta Ads com cache
 * @param startDate - Data inicial
 * @param endDate - Data final
 * @returns Métricas consolidadas, campanhas e status do CAPI
 */
export const getMetaAdsData = unstable_cache(
  async (startDate: Date, endDate: Date): Promise<MetaConnectorResult> => {
    const result: MetaConnectorResult = {
      success: false,
      metrics: null,
      campaigns: [],
      capiStatus: {
        isConfigured: false,
        pixelId: null,
        lastEventSent: null,
        eventsReceived24h: 0,
        matchRate: 0,
        testMode: false,
      },
      cached: true,
      cachedAt: new Date().toISOString(),
    };

    try {
      // Buscar em paralelo: insights (account + campaign) e status CAPI
      const [accountInsights, campaignInsights, capiStatus] = await Promise.all([
        fetchAdsInsights(startDate, endDate, 'account'),
        fetchAdsInsights(startDate, endDate, 'campaign'),
        fetchCapiStatus(),
      ]);

      result.metrics = aggregateMetrics(accountInsights);
      result.campaigns = transformToCampaigns(campaignInsights);
      result.capiStatus = capiStatus;
      result.success = true;

      console.log('✅ [MetaConnector] Dados carregados:', {
        spend: result.metrics?.totalSpend,
        campaigns: result.campaigns.length,
        capiConfigured: result.capiStatus.isConfigured,
      });
    } catch (error) {
      console.error('❌ [MetaConnector] Erro:', error);
      result.error = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Ainda retornar status do CAPI mesmo com erro nos insights
      try {
        result.capiStatus = await fetchCapiStatus();
      } catch {
        // Ignore
      }
    }

    return result;
  },
  ['meta-ads-data'],
  {
    revalidate: CACHE_DURATION,
    tags: ['meta-ads'],
  }
);

/**
 * Busca apenas o status do CAPI (mais leve, cache separado)
 */
export const getCapiStatus = unstable_cache(
  async (): Promise<MetaCapiStatus> => {
    return fetchCapiStatus();
  },
  ['meta-capi-status'],
  {
    revalidate: CACHE_DURATION,
    tags: ['meta-capi'],
  }
);

/**
 * Verifica se a integração Meta está configurada
 */
export function isMetaConfigured(): boolean {
  return isConfigured();
}

/**
 * Verifica se o CAPI (Pixel) está configurado
 */
export function isCapiConfigured(): boolean {
  return !!(META_CONFIG.pixelId && META_CONFIG.accessToken);
}

/**
 * Invalida o cache do Meta Ads (forçar refresh)
 * Usar após mudanças significativas
 */
export async function invalidateMetaCache(): Promise<void> {
  // O Next.js não tem uma API pública para invalidar cache por tag
  // Isso seria feito via revalidateTag('meta-ads') em uma Server Action
  console.log('⚠️ [MetaConnector] Cache invalidation requested');
}
