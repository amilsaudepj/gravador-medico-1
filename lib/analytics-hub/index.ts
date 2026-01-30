/**
 * =====================================================
 * ANALYTICS HUB - Centro de Métricas Unificado
 * =====================================================
 * 
 * 🎯 OBJETIVO:
 * Ser o ÚNICO ponto de entrada para dados do Dashboard.
 * Nenhuma página do Admin deve chamar APIs/DB diretamente.
 * 
 * 📊 FONTES DE DADOS:
 * 1. Gateway/Banco (SQL Blindado) → Vendas Reais
 * 2. GA4 Connector → Tráfego e Sessões
 * 3. Meta Connector → Investimento em Ads
 * 4. Checkout Events → Funil de Conversão
 * 
 * 💡 BENEFÍCIOS:
 * - Consistência: Mesma definição de "venda" em todo lugar
 * - Performance: Cache inteligente por camada
 * - Resiliência: Falha em uma fonte não quebra o dashboard
 * - Manutenção: Um lugar para atualizar lógica de negócio
 * 
 * =====================================================
 */

import { supabaseAdmin } from '@/lib/supabase';
import { getMetaAdsData, isMetaConfigured, type MetaAdsMetrics } from './external/meta-connector';
import { getGA4Data, getGA4Realtime, isGA4Configured, type GA4TrafficData, type GA4RealtimeData, type GA4Source } from './external/ga4-connector';

// =====================================================
// TYPES - Dados Unificados do Dashboard
// =====================================================

export interface UnifiedPeriod {
  startDate: Date;
  endDate: Date;
  daysCount: number;
  label: string;
}

export interface FinancialMetrics {
  totalSales: number;
  totalRevenue: number;
  avgTicket: number;
  salesByDay: Array<{ date: string; sales: number; revenue: number }>;
  salesByGateway: Array<{ gateway: string; sales: number; revenue: number; percentage: number }>;
  salesByProduct: Array<{ product: string; sales: number; revenue: number; avgPrice: number }>;
}

export interface TrafficMetrics {
  visitors: number;
  sessions: number;
  pageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
  sources: GA4Source[];
  dailyData: Array<{ date: string; users: number; sessions: number; pageViews: number }>;
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
    percentages: { desktop: number; mobile: number; tablet: number };
  };
}

export interface InvestmentMetrics {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  avgCpc: number;
  avgCtr: number;
  metaPurchases: number;
  metaLeads: number;
  campaigns: Array<{
    id: string;
    name: string;
    spend: number;
    impressions: number;
    clicks: number;
    purchases: number;
    roas: number;
  }>;
}

export interface FunnelMetrics {
  pageViews: number;
  productViews: number;
  addToCart: number;
  checkoutStarted: number;
  purchaseConfirmed: number;
  stages: Array<{ stage: string; count: number; percentage: number }>;
  dropRates: {
    viewToProduct: number;
    productToCart: number;
    cartToCheckout: number;
    checkoutToPurchase: number;
    overallConversion: number;
  };
}

export interface DerivedKPIs {
  // ROAS Real = Receita Gateway / Gasto Meta
  roasReal: number;
  // Conversão Real = Vendas Gateway / Visitantes (GA4 ou Checkout)
  conversionRateReal: number;
  // Custo por Aquisição Real = Gasto Meta / Vendas Gateway
  cpaReal: number;
  // Ticket Médio
  avgTicket: number;
  // LTV Estimado (se aplicável)
  ltv: number | null;
  // Comparações com período anterior
  changes: {
    revenue: number;
    sales: number;
    visitors: number;
    conversion: number;
  };
}

export interface RealtimeMetrics {
  activeUsers: number;
  topPages: Array<{ page: string; users: number }>;
  lastUpdated: string;
}

export interface UnifiedDashboardData {
  // Período consultado
  period: UnifiedPeriod;
  
  // Métricas por categoria
  financial: FinancialMetrics;
  traffic: TrafficMetrics;
  investment: InvestmentMetrics | null;
  funnel: FunnelMetrics;
  
  // KPIs calculados (cruzando fontes)
  kpis: DerivedKPIs;
  
  // Tempo real (separado pois atualiza mais frequente)
  realtime: RealtimeMetrics | null;
  
  // Status das integrações
  integrations: {
    ga4: { configured: boolean; healthy: boolean };
    meta: { configured: boolean; healthy: boolean };
    gateway: { configured: boolean; healthy: boolean };
  };
  
  // Metadados
  generatedAt: string;
  cached: boolean;
  errors: string[];
}

// =====================================================
// INTERNAL DATA FETCHERS (SQL Functions)
// =====================================================

async function fetchGatewaySales(
  startDate: Date,
  endDate: Date
): Promise<FinancialMetrics> {
  const defaultMetrics: FinancialMetrics = {
    totalSales: 0,
    totalRevenue: 0,
    avgTicket: 0,
    salesByDay: [],
    salesByGateway: [],
    salesByProduct: [],
  };

  try {
    const { data, error } = await supabaseAdmin.rpc('get_gateway_sales', {
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
      p_status: 'approved',
    });

    if (error) {
      console.error('❌ [AnalyticsHub] Erro get_gateway_sales:', error);
      return defaultMetrics;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return defaultMetrics;

    return {
      totalSales: row.total_sales || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      avgTicket: parseFloat(row.avg_ticket) || 0,
      salesByDay: row.sales_by_day || [],
      salesByGateway: row.sales_by_gateway || [],
      salesByProduct: row.sales_by_product || [],
    };
  } catch (error) {
    console.error('💥 [AnalyticsHub] Erro ao buscar vendas:', error);
    return defaultMetrics;
  }
}

async function fetchCheckoutFunnel(
  startDate: Date,
  endDate: Date
): Promise<FunnelMetrics> {
  const defaultFunnel: FunnelMetrics = {
    pageViews: 0,
    productViews: 0,
    addToCart: 0,
    checkoutStarted: 0,
    purchaseConfirmed: 0,
    stages: [],
    dropRates: {
      viewToProduct: 0,
      productToCart: 0,
      cartToCheckout: 0,
      checkoutToPurchase: 0,
      overallConversion: 0,
    },
  };

  try {
    const { data, error } = await supabaseAdmin.rpc('get_checkout_funnel', {
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
    });

    if (error) {
      console.error('❌ [AnalyticsHub] Erro get_checkout_funnel:', error);
      return defaultFunnel;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return defaultFunnel;

    return {
      pageViews: row.page_views || 0,
      productViews: row.product_views || 0,
      addToCart: row.add_to_cart || 0,
      checkoutStarted: row.checkout_started || 0,
      purchaseConfirmed: row.purchase_confirmed || 0,
      stages: row.funnel_stages || [],
      dropRates: row.drop_rates || defaultFunnel.dropRates,
    };
  } catch (error) {
    console.error('💥 [AnalyticsHub] Erro ao buscar funil:', error);
    return defaultFunnel;
  }
}

async function fetchAnalyticsSummary(
  startDate: Date,
  endDate: Date
): Promise<{
  visitors: number;
  sales: number;
  revenue: number;
  changes: { revenue: number; sales: number; visitors: number };
}> {
  const defaultSummary = {
    visitors: 0,
    sales: 0,
    revenue: 0,
    changes: { revenue: 0, sales: 0, visitors: 0 },
  };

  try {
    const { data, error } = await supabaseAdmin.rpc('get_analytics_summary', {
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
    });

    if (error) {
      console.error('❌ [AnalyticsHub] Erro get_analytics_summary:', error);
      return defaultSummary;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return defaultSummary;

    return {
      visitors: row.visitors || 0,
      sales: row.total_sales || 0,
      revenue: parseFloat(row.total_revenue) || 0,
      changes: {
        revenue: row.revenue_change || 0,
        sales: row.sales_change || 0,
        visitors: row.visitors_change || 0,
      },
    };
  } catch (error) {
    console.error('💥 [AnalyticsHub] Erro ao buscar summary:', error);
    return defaultSummary;
  }
}

// =====================================================
// DERIVED KPIs CALCULATOR
// =====================================================

function calculateDerivedKPIs(
  financial: FinancialMetrics,
  traffic: TrafficMetrics,
  investment: InvestmentMetrics | null,
  summary: { changes: { revenue: number; sales: number; visitors: number } }
): DerivedKPIs {
  const visitors = traffic.visitors || 1;
  const sales = financial.totalSales || 0;
  const revenue = financial.totalRevenue || 0;
  const spend = investment?.totalSpend || 0;

  // ROAS Real = Receita do Gateway / Gasto do Meta
  const roasReal = spend > 0 ? revenue / spend : 0;

  // Conversão Real = Vendas do Gateway / Visitantes do GA4
  const conversionRateReal = visitors > 0 ? (sales / visitors) * 100 : 0;

  // CPA Real = Gasto do Meta / Vendas do Gateway
  const cpaReal = sales > 0 ? spend / sales : 0;

  // Ticket Médio
  const avgTicket = sales > 0 ? revenue / sales : 0;

  // Variação de conversão (período atual vs anterior)
  // Se antes tinha X% e agora tem Y%, variação = ((Y-X)/X)*100
  const prevConversion = conversionRateReal / (1 + (summary.changes.sales - summary.changes.visitors) / 100) || 0;
  const conversionChange = prevConversion > 0 
    ? ((conversionRateReal - prevConversion) / prevConversion) * 100 
    : 0;

  return {
    roasReal: Math.round(roasReal * 100) / 100,
    conversionRateReal: Math.round(conversionRateReal * 100) / 100,
    cpaReal: Math.round(cpaReal * 100) / 100,
    avgTicket: Math.round(avgTicket * 100) / 100,
    ltv: null, // Pode ser implementado com dados de recorrência
    changes: {
      revenue: summary.changes.revenue,
      sales: summary.changes.sales,
      visitors: summary.changes.visitors,
      conversion: Math.round(conversionChange * 10) / 10,
    },
  };
}

// =====================================================
// MAIN FUNCTION - getUnifiedDashboardData
// =====================================================

/**
 * 🎯 FUNÇÃO PRINCIPAL DO HUB
 * 
 * Esta é a ÚNICA função que as páginas do Dashboard devem chamar.
 * Ela:
 * 1. Busca dados Financeiros (SQL Gateway)
 * 2. Busca dados de Tráfego (GA4 ou Checkout interno)
 * 3. Busca dados de Investimento (Meta Ads - se configurado)
 * 4. Calcula KPIs Derivados cruzando as fontes
 * 5. Retorna objeto tipado e pronto para renderizar
 * 
 * @param period - Período para consulta (start, end, label)
 * @param options - Opções adicionais (includeRealtime, etc)
 */
export async function getUnifiedDashboardData(
  period: {
    startDate: Date;
    endDate: Date;
    label?: string;
  },
  options: {
    includeRealtime?: boolean;
    includeMeta?: boolean;
    includeGA4?: boolean;
  } = {}
): Promise<UnifiedDashboardData> {
  const {
    includeRealtime = true,
    includeMeta = true,
    includeGA4 = true,
  } = options;

  const startTime = Date.now();
  const errors: string[] = [];

  // Calcular período
  const daysCount = Math.ceil(
    (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const unifiedPeriod: UnifiedPeriod = {
    startDate: period.startDate,
    endDate: period.endDate,
    daysCount,
    label: period.label || `Últimos ${daysCount} dias`,
  };

  // Status das integrações
  const integrations = {
    ga4: { configured: isGA4Configured(), healthy: false },
    meta: { configured: isMetaConfigured(), healthy: false },
    gateway: { configured: true, healthy: false },
  };

  // =====================================================
  // FETCH PARALELO - Todas as fontes ao mesmo tempo
  // =====================================================
  
  const [
    financialData,
    funnelData,
    summaryData,
    ga4Result,
    metaResult,
    realtimeData,
  ] = await Promise.all([
    // 1. Dados financeiros (SQL)
    fetchGatewaySales(period.startDate, period.endDate).catch((e) => {
      errors.push(`Gateway: ${e.message}`);
      return null;
    }),
    
    // 2. Funil do checkout (SQL)
    fetchCheckoutFunnel(period.startDate, period.endDate).catch((e) => {
      errors.push(`Funnel: ${e.message}`);
      return null;
    }),
    
    // 3. Summary com comparação (SQL)
    fetchAnalyticsSummary(period.startDate, period.endDate).catch((e) => {
      errors.push(`Summary: ${e.message}`);
      return null;
    }),
    
    // 4. GA4 (se habilitado e configurado)
    includeGA4 && isGA4Configured()
      ? getGA4Data(period.startDate, period.endDate).catch((e) => {
          errors.push(`GA4: ${e.message}`);
          return null;
        })
      : Promise.resolve(null),
    
    // 5. Meta Ads (se habilitado e configurado)
    includeMeta && isMetaConfigured()
      ? getMetaAdsData(period.startDate, period.endDate).catch((e) => {
          errors.push(`Meta: ${e.message}`);
          return null;
        })
      : Promise.resolve(null),
    
    // 6. Realtime (se habilitado)
    includeRealtime && isGA4Configured()
      ? getGA4Realtime().catch((e) => {
          errors.push(`Realtime: ${e.message}`);
          return null;
        })
      : Promise.resolve(null),
  ]);

  // =====================================================
  // MONTAR ESTRUTURA DE RESPOSTA
  // =====================================================

  // Financial Metrics (sempre do Gateway - fonte da verdade)
  const financial: FinancialMetrics = financialData || {
    totalSales: 0,
    totalRevenue: 0,
    avgTicket: 0,
    salesByDay: [],
    salesByGateway: [],
    salesByProduct: [],
  };
  integrations.gateway.healthy = !!financialData;

  // Funnel Metrics
  const funnel: FunnelMetrics = funnelData || {
    pageViews: 0,
    productViews: 0,
    addToCart: 0,
    checkoutStarted: 0,
    purchaseConfirmed: 0,
    stages: [],
    dropRates: {
      viewToProduct: 0,
      productToCart: 0,
      cartToCheckout: 0,
      checkoutToPurchase: 0,
      overallConversion: 0,
    },
  };

  // Traffic Metrics (GA4 ou fallback do checkout interno)
  const traffic: TrafficMetrics = ga4Result?.success
    ? {
        visitors: ga4Result.traffic?.totalUsers || 0,
        sessions: ga4Result.traffic?.totalSessions || 0,
        pageViews: ga4Result.traffic?.totalPageViews || 0,
        avgSessionDuration: ga4Result.traffic?.avgSessionDuration || 0,
        bounceRate: ga4Result.traffic?.bounceRate || 0,
        sources: ga4Result.sources || [],
        dailyData: ga4Result.traffic?.dailyData || [],
        devices: ga4Result.devices || {
          desktop: 0,
          mobile: 0,
          tablet: 0,
          percentages: { desktop: 0, mobile: 0, tablet: 0 },
        },
      }
    : {
        // Fallback: usar dados do funil interno
        visitors: funnel.pageViews,
        sessions: funnel.pageViews,
        pageViews: funnel.pageViews,
        avgSessionDuration: 0,
        bounceRate: 0,
        sources: [],
        dailyData: [],
        devices: {
          desktop: 0,
          mobile: 0,
          tablet: 0,
          percentages: { desktop: 0, mobile: 0, tablet: 0 },
        },
      };
  integrations.ga4.healthy = ga4Result?.success || false;

  // Investment Metrics (Meta Ads)
  const investment: InvestmentMetrics | null = metaResult?.success && metaResult.metrics
    ? {
        totalSpend: metaResult.metrics.totalSpend,
        totalImpressions: metaResult.metrics.totalImpressions,
        totalClicks: metaResult.metrics.totalClicks,
        totalReach: metaResult.metrics.totalReach,
        avgCpc: metaResult.metrics.avgCpc,
        avgCtr: metaResult.metrics.avgCtr,
        metaPurchases: metaResult.metrics.totalPurchases,
        metaLeads: metaResult.metrics.totalLeads,
        campaigns: metaResult.campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          spend: c.spend,
          impressions: c.impressions,
          clicks: c.clicks,
          purchases: c.purchases,
          roas: c.roas,
        })),
      }
    : null;
  integrations.meta.healthy = metaResult?.success || false;

  // Realtime
  const realtime: RealtimeMetrics | null = realtimeData
    ? {
        activeUsers: realtimeData.activeUsers,
        topPages: realtimeData.pagesByUsers,
        lastUpdated: new Date().toISOString(),
      }
    : null;

  // Summary para changes
  const summary = summaryData || {
    visitors: 0,
    sales: 0,
    revenue: 0,
    changes: { revenue: 0, sales: 0, visitors: 0 },
  };

  // Calcular KPIs derivados
  const kpis = calculateDerivedKPIs(financial, traffic, investment, summary);

  const elapsed = Date.now() - startTime;
  console.log(`✅ [AnalyticsHub] Dashboard carregado em ${elapsed}ms`, {
    sales: financial.totalSales,
    revenue: financial.totalRevenue,
    visitors: traffic.visitors,
    roasReal: kpis.roasReal,
    errors: errors.length,
  });

  return {
    period: unifiedPeriod,
    financial,
    traffic,
    investment,
    funnel,
    kpis,
    realtime,
    integrations,
    generatedAt: new Date().toISOString(),
    cached: ga4Result?.cached || metaResult?.cached || false,
    errors,
  };
}

// =====================================================
// CONVENIENCE FUNCTIONS
// =====================================================

/**
 * Busca dados para "Hoje"
 */
export async function getTodayDashboard(): Promise<UnifiedDashboardData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return getUnifiedDashboardData({
    startDate: today,
    endDate: endOfDay,
    label: 'Hoje',
  });
}

/**
 * Busca dados para "Últimos 7 dias"
 */
export async function getLast7DaysDashboard(): Promise<UnifiedDashboardData> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  return getUnifiedDashboardData({
    startDate: start,
    endDate: end,
    label: 'Últimos 7 dias',
  });
}

/**
 * Busca dados para "Últimos 30 dias"
 */
export async function getLast30DaysDashboard(): Promise<UnifiedDashboardData> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  return getUnifiedDashboardData({
    startDate: start,
    endDate: end,
    label: 'Últimos 30 dias',
  });
}

/**
 * Busca apenas métricas em tempo real
 */
export async function getRealtimeMetrics(): Promise<RealtimeMetrics | null> {
  if (!isGA4Configured()) return null;

  try {
    const data = await getGA4Realtime();
    if (!data) return null;

    return {
      activeUsers: data.activeUsers,
      topPages: data.pagesByUsers,
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// =====================================================
// RE-EXPORTS para conveniência
// =====================================================

export { isMetaConfigured } from './external/meta-connector';
export { isGA4Configured } from './external/ga4-connector';
export type { MetaAdsMetrics } from './external/meta-connector';
export type { GA4TrafficData, GA4RealtimeData, GA4Source } from './external/ga4-connector';
