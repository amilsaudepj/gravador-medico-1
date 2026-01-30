import { NextRequest, NextResponse } from 'next/server';
import { analyticsDataClient, GA4_PROPERTY_ID } from '@/lib/google-analytics';

export async function GET(request: NextRequest) {
  try {
    if (!GA4_PROPERTY_ID) {
      return NextResponse.json({ error: 'GA4_PROPERTY_ID não configurado' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    const normalizeDate = (value: string) => {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString().split('T')[0];
    };

    const since = startParam ? normalizeDate(startParam) : null;
    const until = endParam ? normalizeDate(endParam) : null;

    const dateRanges = since && until
      ? [{ startDate: since, endDate: until }]
      : [{ startDate: '7daysAgo', endDate: 'today' }];

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges,
      dimensions: [{ name: 'userAgeBracket' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ dimension: { dimensionName: 'userAgeBracket' } }],
    });

    const data = response.rows?.map((row) => ({
      age: row.dimensionValues?.[0]?.value || 'Desconhecido',
      users: parseInt(row.metricValues?.[0]?.value || '0', 10),
    })).filter(a => a.age !== '(not set)') || [];

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao buscar faixas etárias:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 });
  }
}
