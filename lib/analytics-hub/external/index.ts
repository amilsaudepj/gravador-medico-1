/**
 * =====================================================
 * ANALYTICS HUB - External Index
 * =====================================================
 * Re-exporta todos os conectores externos
 * =====================================================
 */

export {
  getMetaAdsData,
  getCapiStatus,
  isMetaConfigured,
  isCapiConfigured,
  invalidateMetaCache,
  type MetaAdsMetrics,
  type MetaCampaign,
  type MetaCapiStatus,
  type MetaConnectorResult,
} from './meta-connector';

export {
  getGA4Data,
  getGA4Realtime,
  getGA4Sources,
  isGA4Configured,
  getGA4PropertyId,
  type GA4RealtimeData,
  type GA4TrafficData,
  type GA4Source,
  type GA4GeoData,
  type GA4DeviceData,
  type GA4ConnectorResult,
} from './ga4-connector';
