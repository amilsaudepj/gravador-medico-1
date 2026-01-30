/**
 * =====================================================
 * GA4 CONNECTOR - Analytics Hub
 * =====================================================
 * Responsável por:
 * - Buscar sessões/origens da Google Analytics Data API
 * - Dados em tempo real (usuários ativos)
 * - Tráfego por fonte/mídia
 * - Cache de 5-10 minutos para performance
 * 
 * Parte do Hub de Métricas Centralizado
 * =====================================================
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { unstable_cache } from 'next/cache';

// =====================================================
// TYPES
// =====================================================

export interface GA4RealtimeData {
  activeUsers: number;
  pagesByUsers: Array<{
    page: string;
    users: number;
  }>;
}

export interface GA4TrafficData {
  totalSessions: number;
  totalUsers: number;
  totalPageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
  dailyData: Array<{
    date: string;
    users: number;
    sessions: number;
    pageViews: number;
  }>;
}

export interface GA4Source {
  source: string;
  medium: string;
  users: number;
  sessions: number;
  percentage: number;
  color: string;
}

export interface GA4GeoData {
  countries: Array<{
    country: string;
    users: number;
    percentage: number;
  }>;
  cities: Array<{
    city: string;
    country: string;
    users: number;
  }>;
}

export interface GA4DeviceData {
  desktop: number;
  mobile: number;
  tablet: number;
  percentages: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

export interface GA4ConnectorResult {
  success: boolean;
  realtime: GA4RealtimeData | null;
  traffic: GA4TrafficData | null;
  sources: GA4Source[];
  geo: GA4GeoData | null;
  devices: GA4DeviceData | null;
  error?: string;
  cached: boolean;
  cachedAt?: string;
}

// =====================================================
// CONFIGURATION
// =====================================================

const GA4_CONFIG = {
  propertyId: process.env.GA4_PROPERTY_ID,
  projectId: process.env.GOOGLE_PROJECT_ID,
};

// Cache duration: 5 minutes
const CACHE_DURATION_TRAFFIC = 5 * 60;
// Realtime é mais curto: 1 minuto
const CACHE_DURATION_REALTIME = 60;

// Cores para gráficos de fontes
const SOURCE_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

// =====================================================
// CLIENT INITIALIZATION
// =====================================================

function getCredentials() {
  const rawJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
  
  if (rawJson) {
    try {
      const unquoted = rawJson.startsWith("'") && rawJson.endsWith("'")
        ? rawJson.slice(1, -1)
        : rawJson.startsWith('"') && rawJson.endsWith('"')
          ? rawJson.slice(1, -1)
          : rawJson;
      
      const creds = JSON.parse(unquoted);
      
      if (creds.private_key?.includes('\\n')) {
        creds.private_key = creds.private_key.replace(/\\n/g, '\n');
      }
      
      return creds;
    } catch (e) {
      console.error('❌ [GA4Connector] Erro ao parsear credenciais:', e);
    }
  }

  // Fallback: variáveis separadas
  const key = process.env.GOOGLE_PRIVATE_KEY?.trim();
  return {
    client_email: process.env.GOOGLE_CLIENT_EMAIL?.trim(),
    private_key: key?.includes('\\n') ? key.replace(/\\n/g, '\n') : key,
  };
}

let analyticsClient: BetaAnalyticsDataClient | null = null;

function getClient(): BetaAnalyticsDataClient | null {
  if (!GA4_CONFIG.propertyId) {
    console.warn('⚠️ [GA4Connector] GA4_PROPERTY_ID não configurado');
    return null;
  }

  if (!analyticsClient) {
    try {
      analyticsClient = new BetaAnalyticsDataClient({
        credentials: getCredentials(),
        projectId: GA4_CONFIG.projectId,
      });
    } catch (error) {
      console.error('❌ [GA4Connector] Erro ao inicializar cliente:', error);
      return null;
    }
  }

  return analyticsClient;
}

// =====================================================
// FETCH FUNCTIONS (Raw - sem cache)
// =====================================================

/**
 * Busca dados em tempo real
 */
async function fetchRealtimeData(): Promise<GA4RealtimeData | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const [response] = await client.runRealtimeReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dimensions: [{ name: 'unifiedScreenName' }],
      metrics: [{ name: 'activeUsers' }],
    });

    const activeUsers = response.rows?.reduce((total, row) => {
      return total + parseInt(row.metricValues?.[0]?.value || '0', 10);
    }, 0) || 0;

    const pagesByUsers = response.rows?.map((row) => ({
      page: row.dimensionValues?.[0]?.value || 'Desconhecido',
      users: parseInt(row.metricValues?.[0]?.value || '0', 10),
    })).slice(0, 5) || [];

    return { activeUsers, pagesByUsers };
  } catch (error) {
    console.error('❌ [GA4Connector] Erro realtime:', error);
    return null;
  }
}

/**
 * Busca dados de tráfego por período
 */
async function fetchTrafficData(
  startDate: Date,
  endDate: Date
): Promise<GA4TrafficData | null> {
  const client = getClient();
  if (!client) return null;

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  try {
    // Buscar totais
    const [totalsResponse] = await client.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
    });

    const totals = totalsResponse.rows?.[0];

    // Buscar dados diários
    const [dailyResponse] = await client.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
    });

    const dailyData = dailyResponse.rows?.map((row) => {
      const dateStr = row.dimensionValues?.[0]?.value || '';
      return {
        date: `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}`,
        users: parseInt(row.metricValues?.[0]?.value || '0', 10),
        sessions: parseInt(row.metricValues?.[1]?.value || '0', 10),
        pageViews: parseInt(row.metricValues?.[2]?.value || '0', 10),
      };
    }) || [];

    return {
      totalSessions: parseInt(totals?.metricValues?.[0]?.value || '0', 10),
      totalUsers: parseInt(totals?.metricValues?.[1]?.value || '0', 10),
      totalPageViews: parseInt(totals?.metricValues?.[2]?.value || '0', 10),
      avgSessionDuration: parseFloat(totals?.metricValues?.[3]?.value || '0'),
      bounceRate: parseFloat(totals?.metricValues?.[4]?.value || '0') * 100,
      dailyData,
    };
  } catch (error) {
    console.error('❌ [GA4Connector] Erro traffic:', error);
    return null;
  }
}

/**
 * Busca fontes de tráfego
 */
async function fetchTrafficSources(
  startDate: Date,
  endDate: Date
): Promise<GA4Source[]> {
  const client = getClient();
  if (!client) return [];

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  try {
    const [response] = await client.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
      dimensions: [
        { name: 'sessionDefaultChannelGroup' },
        { name: 'sessionMedium' },
      ],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    });

    const totalSessions = response.rows?.reduce(
      (sum, row) => sum + parseInt(row.metricValues?.[1]?.value || '0', 10),
      0
    ) || 1;

    return response.rows?.map((row, index) => {
      const sessions = parseInt(row.metricValues?.[1]?.value || '0', 10);
      return {
        source: row.dimensionValues?.[0]?.value || 'Desconhecido',
        medium: row.dimensionValues?.[1]?.value || '(none)',
        users: parseInt(row.metricValues?.[0]?.value || '0', 10),
        sessions,
        percentage: Math.round((sessions / totalSessions) * 100),
        color: SOURCE_COLORS[index % SOURCE_COLORS.length],
      };
    }) || [];
  } catch (error) {
    console.error('❌ [GA4Connector] Erro sources:', error);
    return [];
  }
}

/**
 * Busca dados geográficos
 */
async function fetchGeoData(
  startDate: Date,
  endDate: Date
): Promise<GA4GeoData | null> {
  const client = getClient();
  if (!client) return null;

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  try {
    // Países
    const [countriesResponse] = await client.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 5,
    });

    const totalCountryUsers = countriesResponse.rows?.reduce(
      (sum, row) => sum + parseInt(row.metricValues?.[0]?.value || '0', 10),
      0
    ) || 1;

    // Cidades
    const [citiesResponse] = await client.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
      dimensions: [{ name: 'city' }, { name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 10,
    });

    return {
      countries: countriesResponse.rows?.map((row) => {
        const users = parseInt(row.metricValues?.[0]?.value || '0', 10);
        return {
          country: row.dimensionValues?.[0]?.value || 'Desconhecido',
          users,
          percentage: Math.round((users / totalCountryUsers) * 100),
        };
      }) || [],
      cities: citiesResponse.rows?.map((row) => ({
        city: row.dimensionValues?.[0]?.value || 'Desconhecido',
        country: row.dimensionValues?.[1]?.value || '',
        users: parseInt(row.metricValues?.[0]?.value || '0', 10),
      })) || [],
    };
  } catch (error) {
    console.error('❌ [GA4Connector] Erro geo:', error);
    return null;
  }
}

/**
 * Busca dados de dispositivos
 */
async function fetchDeviceData(
  startDate: Date,
  endDate: Date
): Promise<GA4DeviceData | null> {
  const client = getClient();
  if (!client) return null;

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  try {
    const [response] = await client.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
    });

    const deviceMap: Record<string, number> = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
    };

    for (const row of response.rows || []) {
      const device = row.dimensionValues?.[0]?.value?.toLowerCase() || 'desktop';
      const users = parseInt(row.metricValues?.[0]?.value || '0', 10);
      if (device in deviceMap) {
        deviceMap[device] = users;
      }
    }

    const total = deviceMap.desktop + deviceMap.mobile + deviceMap.tablet || 1;

    return {
      desktop: deviceMap.desktop,
      mobile: deviceMap.mobile,
      tablet: deviceMap.tablet,
      percentages: {
        desktop: Math.round((deviceMap.desktop / total) * 100),
        mobile: Math.round((deviceMap.mobile / total) * 100),
        tablet: Math.round((deviceMap.tablet / total) * 100),
      },
    };
  } catch (error) {
    console.error('❌ [GA4Connector] Erro devices:', error);
    return null;
  }
}

// =====================================================
// CACHED PUBLIC API
// =====================================================

/**
 * Busca dados em tempo real do GA4 (cache curto: 1 min)
 */
export const getGA4Realtime = unstable_cache(
  async (): Promise<GA4RealtimeData | null> => {
    return fetchRealtimeData();
  },
  ['ga4-realtime'],
  {
    revalidate: CACHE_DURATION_REALTIME,
    tags: ['ga4-realtime'],
  }
);

/**
 * Busca dados completos do GA4 com cache (5 min)
 */
export const getGA4Data = unstable_cache(
  async (startDate: Date, endDate: Date): Promise<GA4ConnectorResult> => {
    const result: GA4ConnectorResult = {
      success: false,
      realtime: null,
      traffic: null,
      sources: [],
      geo: null,
      devices: null,
      cached: true,
      cachedAt: new Date().toISOString(),
    };

    try {
      // Buscar tudo em paralelo
      const [realtime, traffic, sources, geo, devices] = await Promise.all([
        fetchRealtimeData(),
        fetchTrafficData(startDate, endDate),
        fetchTrafficSources(startDate, endDate),
        fetchGeoData(startDate, endDate),
        fetchDeviceData(startDate, endDate),
      ]);

      result.realtime = realtime;
      result.traffic = traffic;
      result.sources = sources;
      result.geo = geo;
      result.devices = devices;
      result.success = true;

      console.log('✅ [GA4Connector] Dados carregados:', {
        activeUsers: realtime?.activeUsers,
        totalSessions: traffic?.totalSessions,
        sources: sources.length,
      });
    } catch (error) {
      console.error('❌ [GA4Connector] Erro:', error);
      result.error = error instanceof Error ? error.message : 'Erro desconhecido';
    }

    return result;
  },
  ['ga4-data'],
  {
    revalidate: CACHE_DURATION_TRAFFIC,
    tags: ['ga4'],
  }
);

/**
 * Busca apenas fontes de tráfego (para gráficos de atribuição)
 */
export const getGA4Sources = unstable_cache(
  async (startDate: Date, endDate: Date): Promise<GA4Source[]> => {
    return fetchTrafficSources(startDate, endDate);
  },
  ['ga4-sources'],
  {
    revalidate: CACHE_DURATION_TRAFFIC,
    tags: ['ga4-sources'],
  }
);

/**
 * Verifica se o GA4 está configurado
 */
export function isGA4Configured(): boolean {
  return !!GA4_CONFIG.propertyId;
}

/**
 * Retorna o Property ID configurado (para debug)
 */
export function getGA4PropertyId(): string | undefined {
  return GA4_CONFIG.propertyId;
}
