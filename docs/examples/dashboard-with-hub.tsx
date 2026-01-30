/**
 * =====================================================
 * EXEMPLO: Dashboard usando o Analytics Hub
 * =====================================================
 * Este arquivo demonstra como as páginas do admin
 * devem consumir dados do Hub de Métricas.
 * 
 * REGRA: Zero lógica de negócio na página!
 * =====================================================
 */

'use client';

import { useEffect, useState } from 'react';
import type { UnifiedDashboardData } from '@/lib/analytics-hub';

// =====================================================
// HOOK PARA CARREGAR DADOS DO HUB
// =====================================================

function useDashboardData(period: 'today' | '7days' | '30days' | 'custom') {
  const [data, setData] = useState<UnifiedDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Chamar API que usa o Hub internamente
        const response = await fetch(`/api/admin/dashboard?period=${period}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [period]);

  return { data, loading, error };
}

// =====================================================
// COMPONENTE DE CARD KPI
// =====================================================

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  prefix?: string;
  suffix?: string;
}

function KPICard({ title, value, change, prefix = '', suffix = '' }: KPICardProps) {
  const changeColor = (change || 0) >= 0 ? 'text-green-500' : 'text-red-500';
  const changeIcon = (change || 0) >= 0 ? '↑' : '↓';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm text-gray-500 uppercase tracking-wider">{title}</h3>
      <p className="text-3xl font-bold mt-2">
        {prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}{suffix}
      </p>
      {change !== undefined && (
        <p className={`text-sm mt-1 ${changeColor}`}>
          {changeIcon} {Math.abs(change).toFixed(1)}% vs período anterior
        </p>
      )}
    </div>
  );
}

// =====================================================
// PÁGINA DO DASHBOARD (EXEMPLO)
// =====================================================

export default function DashboardExamplePage() {
  const [period, setPeriod] = useState<'today' | '7days' | '30days'>('7days');
  const { data, loading, error } = useDashboardData(period);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          Erro: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500">{data.period.label}</p>
        </div>

        {/* Filtro de período */}
        <div className="flex gap-2">
          {(['today', '7days', '30days'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {p === 'today' ? 'Hoje' : p === '7days' ? '7 dias' : '30 dias'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Receita"
          value={data.financial.totalRevenue}
          change={data.kpis.changes.revenue}
          prefix="R$ "
        />
        <KPICard
          title="Vendas"
          value={data.financial.totalSales}
          change={data.kpis.changes.sales}
        />
        <KPICard
          title="Visitantes"
          value={data.traffic.visitors}
          change={data.kpis.changes.visitors}
        />
        <KPICard
          title="Conversão"
          value={data.kpis.conversionRateReal}
          change={data.kpis.changes.conversion}
          suffix="%"
        />
      </div>

      {/* KPIs Derivados (cruzando fontes) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard
          title="ROAS Real"
          value={data.kpis.roasReal.toFixed(2)}
          suffix="x"
        />
        <KPICard
          title="CPA Real"
          value={data.kpis.cpaReal}
          prefix="R$ "
        />
        <KPICard
          title="Ticket Médio"
          value={data.kpis.avgTicket}
          prefix="R$ "
        />
      </div>

      {/* Realtime */}
      {data.realtime && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white mb-8">
          <h2 className="text-lg font-semibold mb-2">Agora no Site</h2>
          <p className="text-5xl font-bold">{data.realtime.activeUsers}</p>
          <p className="text-sm opacity-80 mt-1">usuários ativos</p>
          
          {data.realtime.topPages.length > 0 && (
            <div className="mt-4">
              <p className="text-sm opacity-80 mb-2">Páginas mais visitadas:</p>
              <ul className="space-y-1">
                {data.realtime.topPages.slice(0, 3).map((page, i) => (
                  <li key={i} className="text-sm">
                    {page.page} ({page.users})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Status das Integrações */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Status das Integrações</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${
              data.integrations.gateway.healthy ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span>Gateway</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${
              data.integrations.ga4.healthy ? 'bg-green-500' : 
              data.integrations.ga4.configured ? 'bg-yellow-500' : 'bg-gray-300'
            }`} />
            <span>Google Analytics</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${
              data.integrations.meta.healthy ? 'bg-green-500' : 
              data.integrations.meta.configured ? 'bg-yellow-500' : 'bg-gray-300'
            }`} />
            <span>Meta Ads</span>
          </div>
        </div>

        {data.errors.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-100 rounded text-sm">
            <strong>Avisos:</strong>
            <ul className="list-disc list-inside mt-1">
              {data.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Metadados */}
      <div className="mt-4 text-xs text-gray-400 text-right">
        Gerado em: {new Date(data.generatedAt).toLocaleString('pt-BR')}
        {data.cached && ' (cache)'}
      </div>
    </div>
  );
}
