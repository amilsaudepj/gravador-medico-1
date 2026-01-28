import { NextRequest, NextResponse } from 'next/server';
import { getAdsInsights, DatePreset, InsightLevel } from '@/lib/meta-marketing';

const AD_ACCOUNT_ID = process.env.FACEBOOK_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

export const dynamic = 'force-dynamic';

// Busca todas as campanhas com status e data de criação (com paginação)
async function getCampaignsMetadata(): Promise<Map<string, { status: string; created_time: string; name: string }>> {
  const map = new Map();
  if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) return map;

  try {
    let url: string | null = `https://graph.facebook.com/v19.0/act_${AD_ACCOUNT_ID}/campaigns?` + new URLSearchParams({
      access_token: ACCESS_TOKEN,
      fields: 'id,name,status,effective_status,created_time',
      limit: '500'
    });
    
    // Paginar para buscar todas as campanhas
    while (url) {
      const res: Response = await fetch(url, { next: { revalidate: 300 } });
      const data: any = await res.json();
      
      if (data.data) {
        data.data.forEach((c: any) => {
          map.set(c.id, { 
            status: c.effective_status || c.status, 
            created_time: c.created_time,
            name: c.name 
          });
        });
      }
      
      // Próxima página
      url = data.paging?.next || null;
    }
  } catch (e) {
    console.error('Erro ao buscar metadata:', e);
  }
  return map;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datePreset = (searchParams.get('period') || 'maximum') as DatePreset;
    const level = (searchParams.get('level') || 'campaign') as InsightLevel;
    
    // Se for adset ou ad, retorna direto sem enriquecimento (não tem metadata)
    if (level === 'adset' || level === 'ad') {
      const insights = await getAdsInsights(datePreset, level);
      return NextResponse.json(insights);
    }
    
    // Para campanhas, buscar insights e metadata em paralelo
    const [insights, metadata] = await Promise.all([
      getAdsInsights(datePreset, 'campaign'),
      getCampaignsMetadata()
    ]);
    
    // IDs das campanhas que já têm insights
    const insightIds = new Set(insights.map(i => i.campaign_id));
    
    // Enriquecer insights com status e created_time
    const enrichedInsights = insights.map(insight => {
      const meta = metadata.get(insight.campaign_id || '');
      return {
        ...insight,
        effective_status: meta?.status || 'UNKNOWN',
        created_time: meta?.created_time || null
      };
    });
    
    // Adicionar campanhas ATIVAS que não têm insights (campanhas novas sem gastos ainda)
    metadata.forEach((meta, id) => {
      if (!insightIds.has(id) && meta.status === 'ACTIVE') {
        enrichedInsights.push({
          campaign_id: id,
          campaign_name: meta.name,
          spend: '0',
          impressions: '0',
          clicks: '0',
          cpc: '0',
          ctr: '0',
          reach: '0',
          date_start: '',
          date_stop: '',
          effective_status: meta.status,
          created_time: meta.created_time
        } as any);
      }
    });
    
    // Ordenar por created_time (mais recente primeiro) como padrão
    enrichedInsights.sort((a, b) => {
      const dateA = a.created_time || '';
      const dateB = b.created_time || '';
      return dateB.localeCompare(dateA);
    });
    
    return NextResponse.json(enrichedInsights);
  } catch (error) {
    console.error('Erro ao buscar insights de anúncios:', error);
    return NextResponse.json([], { status: 500 });
  }
}
