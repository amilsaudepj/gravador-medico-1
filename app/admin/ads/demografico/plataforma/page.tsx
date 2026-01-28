'use client';

import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Formatar moeda BRL
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Formatar número
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
};

const periodOptions = [
  { value: 'last_7d', label: 'Últimos 7 dias' },
  { value: 'last_14d', label: 'Últimos 14 dias' },
  { value: 'last_30d', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
];

// Dados de exemplo
const mockPlatformData = [
  { plataforma: 'Instagram', investimento: 3500, impressoes: 165000, cliques: 2800, conversoes: 580, leads: 480, finalizacoes: 420 },
  { plataforma: 'Facebook', investimento: 1800, impressoes: 52000, cliques: 580, conversoes: 270, leads: 220, finalizacoes: 195 },
  { plataforma: 'Audience Network', investimento: 150, impressoes: 3000, cliques: 46, conversoes: 17, leads: 12, finalizacoes: 10 },
];

export default function PlataformaPage() {
  const [data, setData] = useState(mockPlatformData);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('last_30d');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ads/demographics?period=${selectedPeriod}&breakdown=publisher_platform`);
      const apiData = await res.json();
      
      if (apiData.error) {
        console.error('Erro da API:', apiData.error);
        setData(mockPlatformData);
      } else if (Array.isArray(apiData) && apiData.length > 0) {
        // Mapear dados da API para o formato esperado
        const formattedData = apiData.map((item: any) => ({
          plataforma: item.publisher_platform === 'instagram' ? 'Instagram' :
                      item.publisher_platform === 'facebook' ? 'Facebook' :
                      item.publisher_platform === 'audience_network' ? 'Audience Network' :
                      item.publisher_platform === 'messenger' ? 'Messenger' :
                      item.publisher_platform || 'Outros',
          investimento: item.investimento,
          impressoes: item.impressoes,
          cliques: item.cliques,
          conversoes: item.conversoes,
          leads: item.leads,
          finalizacoes: item.finalizacoes,
        }));
        setData(formattedData);
      } else {
        setData(mockPlatformData);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setData(mockPlatformData);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchData();
  }, [selectedPeriod, fetchData]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Demográfico - Plataforma</h1>
            <p className="text-gray-400">Performance por plataforma (Instagram, Facebook, etc)</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
          >
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-800">{opt.label}</option>
            ))}
          </select>
          
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['Investimento', 'Impressões', 'Cliques', 'Conversões'].map((metric, idx) => (
          <div key={metric} className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 rounded-2xl border border-white/10 p-4">
            <h3 className="text-sm text-gray-400 mb-3">{metric} por Plataforma</h3>
            <div className="h-48">
              {loading ? (
                <Skeleton className="h-full bg-white/10" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
                    <XAxis type="number" stroke="#9ca3af" fontSize={10} />
                    <YAxis type="category" dataKey="plataforma" stroke="#9ca3af" fontSize={10} width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    />
                    <Bar 
                      dataKey={metric === 'Investimento' ? 'investimento' : metric === 'Impressões' ? 'impressoes' : metric === 'Cliques' ? 'cliques' : 'conversoes'} 
                      fill={idx === 0 ? '#10b981' : idx === 1 ? '#3b82f6' : idx === 2 ? '#8b5cf6' : '#f59e0b'} 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5">
                <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3">Plataforma</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Investimento</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Impressões</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">CPM</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Cliques</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">CTR</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">CPC</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">CPL</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Finalizações</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Conversões</th>
                <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Taxa Conv.</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="p-8"><Skeleton className="h-16 bg-white/10" /></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center text-gray-400">Não há dados</td></tr>
              ) : (
                data.map((row, idx) => {
                  const cpm = row.impressoes > 0 ? (row.investimento / row.impressoes) * 1000 : 0;
                  const ctr = row.impressoes > 0 ? (row.cliques / row.impressoes) * 100 : 0;
                  const cpc = row.cliques > 0 ? row.investimento / row.cliques : 0;
                  const cpl = row.leads > 0 ? row.investimento / row.leads : 0;
                  const convRate = row.cliques > 0 ? (row.conversoes / row.cliques) * 100 : 0;
                  
                  return (
                    <tr key={idx} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-white font-medium">{row.plataforma}</td>
                      <td className="text-right px-4 py-3 text-green-400">{formatCurrency(row.investimento)}</td>
                      <td className="text-right px-4 py-3 text-gray-300">{formatNumber(row.impressoes)}</td>
                      <td className="text-right px-4 py-3 text-blue-400">{formatCurrency(cpm)}</td>
                      <td className="text-right px-4 py-3 text-white">{formatNumber(row.cliques)}</td>
                      <td className="text-right px-4 py-3 text-purple-400">{ctr.toFixed(2)}%</td>
                      <td className="text-right px-4 py-3 text-gray-400">{formatCurrency(cpc)}</td>
                      <td className="text-right px-4 py-3 text-violet-400">{formatCurrency(cpl)}</td>
                      <td className="text-right px-4 py-3 text-orange-400">{formatNumber(row.finalizacoes)}</td>
                      <td className="text-right px-4 py-3 text-emerald-400">{formatNumber(row.conversoes)}</td>
                      <td className="text-right px-4 py-3 text-cyan-400">{convRate.toFixed(2)}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
