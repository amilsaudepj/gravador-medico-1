/**
 * =====================================================
 * ANALYTICS HUB - Internal Index
 * =====================================================
 * Re-exporta todos os conectores internos (SQL)
 * =====================================================
 */

export {
  getGatewaySales,
  getCheckoutFunnel,
  getSalesForCapi,
  getAnalyticsSummary,
  checkInternalFunctionsHealth,
  type GatewaySalesResult,
  type CheckoutFunnelResult,
  type SaleForCapi,
  type AnalyticsSummaryResult,
} from './data-connector';
