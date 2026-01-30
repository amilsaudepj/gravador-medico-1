/**
 * =====================================================
 * ANALYTICS HUB - Internal Data Connector
 * =====================================================
 * Camada de acesso às funções SQL internas
 * Wrapper tipado para as funções SECURITY DEFINER
 * =====================================================
 */

import { supabaseAdmin } from '@/lib/supabase';

// =====================================================
// TYPES
// =====================================================

export interface GatewaySalesResult {
  totalSales: number;
  totalRevenue: number;
  avgTicket: number;
  salesByDay: Array<{ date: string; sales: number; revenue: number }>;
  salesByGateway: Array<{ gateway: string; sales: number; revenue: number; percentage: number }>;
  salesByProduct: Array<{ product: string; sales: number; revenue: number; avgPrice: number }>;
}

export interface CheckoutFunnelResult {
  pageViews: number;
  productViews: number;
  addToCart: number;
  checkoutStarted: number;
  checkoutCompleted: number;
  purchaseConfirmed: number;
  funnelStages: Array<{ stage: string; count: number; percentage: number }>;
  dropRates: {
    viewToProduct: number;
    productToCart: number;
    cartToCheckout: number;
    checkoutToPurchase: number;
    overallConversion: number;
  };
}

export interface SaleForCapi {
  saleId: string;
  orderId: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerName: string | null;
  totalAmount: number;
  productName: string | null;
  productIds: string[];
  gateway: string | null;
  createdAt: string;
  eventId: string;
}

export interface AnalyticsSummaryResult {
  visitors: number;
  uniqueSessions: number;
  totalSales: number;
  totalRevenue: number;
  avgTicket: number;
  conversionRate: number;
  prevVisitors: number;
  prevSales: number;
  prevRevenue: number;
  visitorsChange: number;
  salesChange: number;
  revenueChange: number;
}

// =====================================================
// INTERNAL DATA FUNCTIONS
// =====================================================

/**
 * Busca vendas do gateway com métricas agregadas
 * Fonte da verdade financeira
 */
export async function getGatewaySales(
  startDate: Date,
  endDate: Date,
  status: 'approved' | 'all' = 'approved'
): Promise<GatewaySalesResult | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_gateway_sales', {
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
      p_status: status,
    });

    if (error) {
      console.error('❌ [InternalConnector] get_gateway_sales error:', error);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    return {
      totalSales: row.total_sales || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      avgTicket: parseFloat(row.avg_ticket) || 0,
      salesByDay: (row.sales_by_day || []).map((d: any) => ({
        date: d.date,
        sales: d.sales,
        revenue: parseFloat(d.revenue) || 0,
      })),
      salesByGateway: (row.sales_by_gateway || []).map((g: any) => ({
        gateway: g.gateway,
        sales: g.sales,
        revenue: parseFloat(g.revenue) || 0,
        percentage: g.percentage || 0,
      })),
      salesByProduct: (row.sales_by_product || []).map((p: any) => ({
        product: p.product,
        sales: p.sales,
        revenue: parseFloat(p.revenue) || 0,
        avgPrice: parseFloat(p.avg_price) || 0,
      })),
    };
  } catch (error) {
    console.error('💥 [InternalConnector] Exception in getGatewaySales:', error);
    return null;
  }
}

/**
 * Busca dados do funil de conversão
 * Eventos de navegação do checkout
 */
export async function getCheckoutFunnel(
  startDate: Date,
  endDate: Date
): Promise<CheckoutFunnelResult | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_checkout_funnel', {
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
    });

    if (error) {
      console.error('❌ [InternalConnector] get_checkout_funnel error:', error);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    return {
      pageViews: row.page_views || 0,
      productViews: row.product_views || 0,
      addToCart: row.add_to_cart || 0,
      checkoutStarted: row.checkout_started || 0,
      checkoutCompleted: row.checkout_completed || 0,
      purchaseConfirmed: row.purchase_confirmed || 0,
      funnelStages: row.funnel_stages || [],
      dropRates: row.drop_rates || {
        viewToProduct: 0,
        productToCart: 0,
        cartToCheckout: 0,
        checkoutToPurchase: 0,
        overallConversion: 0,
      },
    };
  } catch (error) {
    console.error('💥 [InternalConnector] Exception in getCheckoutFunnel:', error);
    return null;
  }
}

/**
 * Busca vendas formatadas para disparo no Meta CAPI
 * MESMA definição de venda aprovada do gateway
 */
export async function getSalesForCapi(
  saleId?: string,
  sinceMinutes: number = 5
): Promise<SaleForCapi[]> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_sales_for_capi', {
      p_sale_id: saleId || null,
      p_since_minutes: sinceMinutes,
    });

    if (error) {
      console.error('❌ [InternalConnector] get_sales_for_capi error:', error);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((row: any) => ({
      saleId: row.sale_id,
      orderId: row.order_id,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      customerName: row.customer_name,
      totalAmount: parseFloat(row.total_amount) || 0,
      productName: row.product_name,
      productIds: row.product_ids || [],
      gateway: row.gateway,
      createdAt: row.created_at,
      eventId: row.event_id,
    }));
  } catch (error) {
    console.error('💥 [InternalConnector] Exception in getSalesForCapi:', error);
    return [];
  }
}

/**
 * Busca resumo analítico com comparação de períodos
 */
export async function getAnalyticsSummary(
  startDate: Date,
  endDate: Date
): Promise<AnalyticsSummaryResult | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_analytics_summary', {
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
    });

    if (error) {
      console.error('❌ [InternalConnector] get_analytics_summary error:', error);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    return {
      visitors: row.visitors || 0,
      uniqueSessions: row.unique_sessions || 0,
      totalSales: row.total_sales || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      avgTicket: parseFloat(row.avg_ticket) || 0,
      conversionRate: parseFloat(row.conversion_rate) || 0,
      prevVisitors: row.prev_visitors || 0,
      prevSales: row.prev_sales || 0,
      prevRevenue: parseFloat(row.prev_revenue) || 0,
      visitorsChange: parseFloat(row.visitors_change) || 0,
      salesChange: parseFloat(row.sales_change) || 0,
      revenueChange: parseFloat(row.revenue_change) || 0,
    };
  } catch (error) {
    console.error('💥 [InternalConnector] Exception in getAnalyticsSummary:', error);
    return null;
  }
}

/**
 * Verifica se as funções SQL estão disponíveis
 * Útil para health check
 */
export async function checkInternalFunctionsHealth(): Promise<{
  gatewaySales: boolean;
  checkoutFunnel: boolean;
  analyticsSummary: boolean;
  salesForCapi: boolean;
}> {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const results = await Promise.allSettled([
    supabaseAdmin.rpc('get_gateway_sales', {
      p_start_date: yesterday.toISOString().split('T')[0],
      p_end_date: today.toISOString().split('T')[0],
      p_status: 'approved',
    }),
    supabaseAdmin.rpc('get_checkout_funnel', {
      p_start_date: yesterday.toISOString().split('T')[0],
      p_end_date: today.toISOString().split('T')[0],
    }),
    supabaseAdmin.rpc('get_analytics_summary', {
      p_start_date: yesterday.toISOString().split('T')[0],
      p_end_date: today.toISOString().split('T')[0],
    }),
    supabaseAdmin.rpc('get_sales_for_capi', {
      p_sale_id: null,
      p_since_minutes: 5,
    }),
  ]);

  return {
    gatewaySales: results[0].status === 'fulfilled' && !results[0].value.error,
    checkoutFunnel: results[1].status === 'fulfilled' && !results[1].value.error,
    analyticsSummary: results[2].status === 'fulfilled' && !results[2].value.error,
    salesForCapi: results[3].status === 'fulfilled' && !results[3].value.error,
  };
}
