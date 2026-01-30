/**
 * =====================================================
 * API: Dashboard Unificado
 * =====================================================
 * Endpoint único para dados do dashboard admin.
 * Usa o Analytics Hub internamente.
 * 
 * GET /api/admin/dashboard?period=7days
 * GET /api/admin/dashboard?start=2026-01-01&end=2026-01-29
 * =====================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUnifiedDashboardData,
  getTodayDashboard,
  getLast7DaysDashboard,
  getLast30DaysDashboard,
} from '@/lib/analytics-hub';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period');
    const startStr = searchParams.get('start');
    const endStr = searchParams.get('end');

    let data;

    // Atalhos de período
    if (period === 'today') {
      data = await getTodayDashboard();
    } else if (period === '7days' || period === 'last7') {
      data = await getLast7DaysDashboard();
    } else if (period === '30days' || period === 'last30') {
      data = await getLast30DaysDashboard();
    } else if (startStr && endStr) {
      // Período customizado
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Datas inválidas. Use formato ISO (YYYY-MM-DD)' },
          { status: 400 }
        );
      }

      data = await getUnifiedDashboardData({
        startDate,
        endDate,
        label: `${startStr} a ${endStr}`,
      });
    } else {
      // Default: últimos 7 dias
      data = await getLast7DaysDashboard();
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ [API Dashboard] Erro:', error);
    
    return NextResponse.json(
      {
        error: 'Erro ao carregar dashboard',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
