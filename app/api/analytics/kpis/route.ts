import { NextRequest, NextResponse } from 'next/server';
import { analyticsDataClient, GA4_PROPERTY_ID } from '@/lib/google-analytics';

export async function GET(request: NextRequest) {
  try {
    if (!GA4_PROPERTY_ID) {
      return NextResponse.json(
        { error: 'GA4_PROPERTY_ID não configurado', totalUsers: 0, totalViews: 0, totalEvents: 0, totalSessions: 0 },
        { status: 500 }
      );
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
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'eventCount' },
        { name: 'sessions' },
      ],
    });

    const row = response.rows?.[0];
    const data = {
      totalUsers: parseInt(row?.metricValues?.[0]?.value || '0', 10),
      totalViews: parseInt(row?.metricValues?.[1]?.value || '0', 10),
      totalEvents: parseInt(row?.metricValues?.[2]?.value || '0', 10),
      totalSessions: parseInt(row?.metricValues?.[3]?.value || '0', 10),
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao buscar KPIs:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar KPIs', totalUsers: 0, totalViews: 0, totalEvents: 0, totalSessions: 0 },
      { status: 500 }
    );
  }
}
