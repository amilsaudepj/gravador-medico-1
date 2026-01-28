import { NextRequest, NextResponse } from 'next/server';
import { DatePreset } from '@/lib/meta-marketing';

const AD_ACCOUNT_ID = process.env.FACEBOOK_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

export const dynamic = 'force-dynamic';

/**
 * Busca dados demográficos da Meta Ads com breakdowns
 * Suporta breakdowns: gender, age, publisher_platform
 */
export async function GET(request: NextRequest) {
  try {
    if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Credenciais não configuradas' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const datePreset = (searchParams.get('period') || 'last_30d') as DatePreset;
    const breakdown = searchParams.get('breakdown') || 'gender'; // gender, age, publisher_platform

    // Construir URL da API do Facebook
    const url = `https://graph.facebook.com/v19.0/act_${AD_ACCOUNT_ID}/insights?` + new URLSearchParams({
      access_token: ACCESS_TOKEN,
      date_preset: datePreset,
      level: 'account',
      breakdowns: breakdown,
      fields: 'spend,impressions,clicks,cpc,ctr,actions,action_values,reach',
      limit: '100'
    });

    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();

    if (data.error) {
      console.error('Erro da API Meta:', data.error);
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    // Processar e formatar os dados
    const insights = (data.data || []).map((insight: any) => {
      // Extrair leads
      const leads = insight.actions?.find((a: any) => 
        a.action_type === 'lead' || 
        a.action_type === 'offsite_conversion.fb_pixel_lead'
      );
      const leadCount = Number(leads?.value || 0);

      // Extrair finalizações de checkout
      const checkoutComplete = insight.actions?.find((a: any) => 
        a.action_type === 'omni_initiated_checkout' ||
        a.action_type === 'offsite_conversion.fb_pixel_initiate_checkout'
      );
      const checkoutCount = Number(checkoutComplete?.value || 0);

      // Extrair compras (conversões)
      const purchases = insight.actions?.find((a: any) => 
        a.action_type === 'purchase' || 
        a.action_type === 'omni_purchase' ||
        a.action_type === 'offsite_conversion.fb_pixel_purchase'
      );
      const purchaseCount = Number(purchases?.value || 0);

      // Extrair valor das compras
      const purchaseValue = insight.action_values?.find((a: any) => 
        a.action_type === 'purchase' || 
        a.action_type === 'omni_purchase' ||
        a.action_type === 'offsite_conversion.fb_pixel_purchase'
      );
      const revenue = Number(purchaseValue?.value || 0);

      return {
        // Dependendo do breakdown, teremos diferentes chaves
        gender: insight.gender,
        age: insight.age,
        publisher_platform: insight.publisher_platform,
        
        // Métricas
        investimento: Number(insight.spend || 0),
        impressoes: Number(insight.impressions || 0),
        cliques: Number(insight.clicks || 0),
        alcance: Number(insight.reach || 0),
        leads: leadCount,
        finalizacoes: checkoutCount,
        conversoes: purchaseCount,
        receita: revenue,
        
        // Métricas calculadas
        cpm: Number(insight.cpm || 0),
        ctr: Number(insight.ctr || 0),
        cpc: Number(insight.cpc || 0),
      };
    });

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Erro ao buscar dados demográficos:', error);
    return NextResponse.json({ error: 'Erro ao processar dados' }, { status: 500 });
  }
}
