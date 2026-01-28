'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { CampaignInsight } from '@/lib/meta-marketing';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, MousePointerClick, Eye, TrendingUp, AlertCircle, 
  RefreshCw, Image, Target, ExternalLink, PlayCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

// Formatar moeda BRL
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Formatar número
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
};

// Badge de status
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Ativo' },
    PAUSED: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pausado' },
    DELETED: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Excluído' },
    ARCHIVED: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Arquivado' },
    CAMPAIGN_PAUSED: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pausado' },
    ADSET_PAUSED: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pausado' },
    UNKNOWN: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Desconhecido' },
  };

  const config = statusConfig[status] || statusConfig.UNKNOWN;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

// Opções de período
const periodOptions = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last_7d', label: 'Últimos 7 dias' },
  { value: 'last_14d', label: 'Últimos 14 dias' },
  { value: 'last_30d', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: 'maximum', label: 'Todo período' },
];

const sortOptions = [
  { value: 'status_date', label: 'Ativos + Recentes' },
  { value: 'spend_desc', label: 'Maior gasto' },
  { value: 'conversions_desc', label: 'Mais conversões' },
  { value: 'ctr_desc', label: 'Melhor CTR' },
];

export default function CriativosPage() {
  const [ads, setAds] = useState<CampaignInsight[]>([]);
  const [creativeUrls, setCreativeUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('last_7d');
  const [sortBy, setSortBy] = useState('status_date');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/ads/insights?period=${selectedPeriod}&level=ad`);
      const data = await res.json();
      setAds(Array.isArray(data) ? data : []);
      
      // Buscar URLs dos criativos
      if (data.length > 0) {
        const adIds = data.map((ad: any) => ad.ad_id).filter(Boolean).join(',');
        if (adIds) {
          const creativesRes = await fetch(`/api/ads/creatives?adIds=${adIds}`);
          const creativesData = await creativesRes.json();
          setCreativeUrls(creativesData);
        }
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao carregar criativos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchData();
  }, [selectedPeriod, fetchData]);

  // Ordenar ads - prioriza ativos primeiro, depois por data mais recente
  const sortedAds = useMemo(() => {
    return [...ads].sort((a, b) => {
      switch (sortBy) {
        case 'status_date':
          // Primeiro: ativos antes de inativos
          const aActive = (a as any).effective_status === 'ACTIVE' || (a as any).status === 'ACTIVE' ? 1 : 0;
          const bActive = (b as any).effective_status === 'ACTIVE' || (b as any).status === 'ACTIVE' ? 1 : 0;
          if (bActive !== aActive) return bActive - aActive;
          // Depois: por data de criação/atualização (mais recente primeiro)
          const aDate = new Date((a as any).created_time || (a as any).updated_time || 0).getTime();
          const bDate = new Date((b as any).created_time || (b as any).updated_time || 0).getTime();
          if (bDate !== aDate) return bDate - aDate;
          // Fallback: maior gasto
          return Number(b.spend || 0) - Number(a.spend || 0);
        case 'spend_desc': return Number(b.spend || 0) - Number(a.spend || 0);
        case 'conversions_desc': return Number((b as any).conversions || 0) - Number((a as any).conversions || 0);
        case 'ctr_desc': return Number(b.ctr || 0) - Number(a.ctr || 0);
        default: return Number(b.spend || 0) - Number(a.spend || 0);
      }
    });
  }, [ads, sortBy]);

  // Calcular totais e métricas
  const totals = useMemo(() => {
    const result = {
      count: ads.length,
      spend: 0,
      reach: 0,
      impressions: 0,
      clicks: 0,
      outbound_clicks: 0,
      purchases: 0,
      revenue: 0,
      leads: 0,
      cpm: 0,
      ctr: 0,
      cpc: 0,
      cpl: 0,
      checkoutComplete: 0,
    };
    
    ads.forEach(ad => {
      result.spend += Number(ad.spend || 0);
      result.reach += Number(ad.reach || 0);
      result.impressions += Number(ad.impressions || 0);
      result.clicks += Number(ad.clicks || 0);
      
      // Cliques de saída
      const outboundClicks = ad.outbound_clicks?.reduce(
        (sum, oc) => sum + Number(oc.value || 0), 0
      ) || 0;
      result.outbound_clicks += outboundClicks;
      
      // Compras
      const purchases = ad.actions?.find(a => 
        a.action_type === 'purchase' || 
        a.action_type === 'omni_purchase' ||
        a.action_type === 'offsite_conversion.fb_pixel_purchase'
      );
      result.purchases += Number(purchases?.value || 0);
      
      // Leads
      const leads = ad.actions?.find(a => 
        a.action_type === 'lead' || 
        a.action_type === 'offsite_conversion.fb_pixel_lead'
      );
      result.leads += Number(leads?.value || 0);
      
      // Checkout Complete (InitiateCheckout)
      const checkoutComplete = ad.actions?.find(a => 
        a.action_type === 'omni_initiated_checkout' ||
        a.action_type === 'offsite_conversion.fb_pixel_initiate_checkout'
      );
      result.checkoutComplete += Number(checkoutComplete?.value || 0);
      
      // Receita
      const purchaseValue = ad.action_values?.find(a => 
        a.action_type === 'purchase' || 
        a.action_type === 'omni_purchase' ||
        a.action_type === 'offsite_conversion.fb_pixel_purchase'
      );
      result.revenue += Number(purchaseValue?.value || 0);
    });
    
    // Calcular métricas derivadas
    result.cpm = result.impressions > 0 ? (result.spend / result.impressions) * 1000 : 0;
    result.ctr = result.impressions > 0 ? (result.clicks / result.impressions) * 100 : 0;
    result.cpc = result.clicks > 0 ? result.spend / result.clicks : 0;
    result.cpl = result.leads > 0 ? result.spend / result.leads : 0;
    
    return result;
  }, [ads]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg">
            <Image className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Criativos</h1>
            <p className="text-gray-400">Performance por anúncio individual</p>
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
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-800">{opt.label}</option>
            ))}
          </select>
          
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* KPIs Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-pink-500/20 to-rose-600/20 rounded-2xl border border-pink-500/30 p-4">
          <p className="text-xs text-pink-300 mb-1">QTD de Anúncios</p>
          <p className="text-2xl font-bold text-white">{totals.count}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-2xl border border-blue-500/30 p-4">
          <p className="text-xs text-blue-300 mb-1">CPM</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totals.cpm)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-violet-600/20 rounded-2xl border border-purple-500/30 p-4">
          <p className="text-xs text-purple-300 mb-1">CPL</p>
          <p className="text-2xl font-bold text-white">
            {totals.leads > 0 ? formatCurrency(totals.cpl) : '—'}
          </p>
        </div>
        <div className="bg-gradient-to-br from-orange-500/20 to-amber-600/20 rounded-2xl border border-orange-500/30 p-4">
          <p className="text-xs text-orange-300 mb-1">Finalizações</p>
          <p className="text-2xl font-bold text-white">{formatNumber(totals.checkoutComplete)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-2xl border border-green-500/30 p-4">
          <p className="text-xs text-green-300 mb-1">Compras</p>
          <p className="text-2xl font-bold text-white">{formatNumber(totals.purchases)}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/20 to-amber-600/20 rounded-2xl border border-yellow-500/30 p-4">
          <p className="text-xs text-yellow-300 mb-1">Receita</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totals.revenue)}</p>
        </div>
      </div>

      {/* Tabela de Criativos */}
      <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Anúncios ({sortedAds.length})</h2>
        </div>
        
        {loading ? (
          <div className="p-8 space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 bg-white/10" />
            ))}
          </div>
        ) : sortedAds.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum anúncio encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3">Anúncio</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3">URL do Criativo</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Gasto</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Impressões</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">CPM</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Cliques</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">CTR</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">CPL</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Finalizações</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Compras</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Receita</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Custo/Compra</th>
                </tr>
              </thead>
              <tbody>
                {sortedAds.map((ad, index) => {
                  const spend = Number(ad.spend || 0);
                  const reach = Number(ad.reach || 0);
                  const impressions = Number(ad.impressions || 0);
                  const clicks = Number(ad.clicks || 0);
                  const ctr = Number(ad.ctr || 0);
                  const cpc = Number(ad.cpc || 0);
                  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
                  
                  // Cliques de saída (outbound clicks)
                  const outboundClicks = ad.outbound_clicks?.reduce(
                    (sum, oc) => sum + Number(oc.value || 0), 0
                  ) || 0;
                  
                  // Extrair compras das actions
                  const purchases = ad.actions?.find(a => 
                    a.action_type === 'purchase' || 
                    a.action_type === 'omni_purchase' ||
                    a.action_type === 'offsite_conversion.fb_pixel_purchase'
                  );
                  const purchaseCount = Number(purchases?.value || 0);
                  
                  // Extrair leads
                  const leads = ad.actions?.find(a => 
                    a.action_type === 'lead' || 
                    a.action_type === 'offsite_conversion.fb_pixel_lead'
                  );
                  const leadCount = Number(leads?.value || 0);
                  const cpl = leadCount > 0 ? spend / leadCount : 0;
                  
                  // Extrair finalizações de checkout
                  const checkoutComplete = ad.actions?.find(a => 
                    a.action_type === 'omni_initiated_checkout' ||
                    a.action_type === 'offsite_conversion.fb_pixel_initiate_checkout'
                  );
                  const checkoutCount = Number(checkoutComplete?.value || 0);
                  
                  // Extrair valor das compras
                  const purchaseValue = ad.action_values?.find(a => 
                    a.action_type === 'purchase' || 
                    a.action_type === 'omni_purchase' ||
                    a.action_type === 'offsite_conversion.fb_pixel_purchase'
                  );
                  const purchaseAmount = Number(purchaseValue?.value || 0);
                  
                  const status = (ad as any).effective_status || 'UNKNOWN';
                  const creativeUrl = creativeUrls[ad.ad_id || ''];
                  
                  return (
                    <motion.tr
                      key={ad.ad_id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-t border-white/5 hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white text-sm">{ad.ad_name || 'Sem nome'}</p>
                      </td>
                      <td className="px-4 py-3">
                        {creativeUrl ? (
                          <a 
                            href={creativeUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ver Criativo
                          </a>
                        ) : (
                          <span className="text-gray-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={status} />
                      </td>
                      <td className="text-right px-4 py-3 text-green-400 font-medium">{formatCurrency(spend)}</td>
                      <td className="text-right px-4 py-3 text-gray-400">{formatNumber(impressions)}</td>
                      <td className="text-right px-4 py-3 text-blue-400">{formatCurrency(cpm)}</td>
                      <td className="text-right px-4 py-3 text-white">{formatNumber(clicks)}</td>
                      <td className="text-right px-4 py-3 text-purple-400">{ctr.toFixed(2)}%</td>
                      <td className="text-right px-4 py-3 text-violet-400">
                        {leadCount > 0 ? formatCurrency(cpl) : <span className="text-gray-500">—</span>}
                      </td>
                      <td className="text-right px-4 py-3 text-orange-400">
                        {checkoutCount > 0 ? formatNumber(checkoutCount) : <span className="text-gray-500">0</span>}
                      </td>
                      <td className="text-right px-4 py-3">
                        {purchaseCount > 0 ? (
                          <span className="font-semibold text-emerald-400">{purchaseCount}</span>
                        ) : (
                          <span className="text-gray-500">0</span>
                        )}
                      </td>
                      <td className="text-right px-4 py-3">
                        {purchaseAmount > 0 ? (
                          <span className="font-semibold text-yellow-400">{formatCurrency(purchaseAmount)}</span>
                        ) : (
                          <span className="text-gray-500">R$ 0,00</span>
                        )}
                      </td>
                      <td className="text-right px-4 py-3">
                        {purchaseCount > 0 ? (
                          <span className="font-semibold text-pink-400">{formatCurrency(spend / purchaseCount)}</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
                {/* Total */}
                <tr className="border-t-2 border-white/20 bg-white/5 font-bold">
                  <td className="px-4 py-3 text-white">Total geral</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3">-</td>
                  <td className="text-right px-4 py-3 text-green-400">{formatCurrency(totals.spend)}</td>
                  <td className="text-right px-4 py-3 text-gray-400">{formatNumber(totals.impressions)}</td>
                  <td className="text-right px-4 py-3 text-blue-400">{formatCurrency(totals.cpm)}</td>
                  <td className="text-right px-4 py-3 text-white">{formatNumber(totals.clicks)}</td>
                  <td className="text-right px-4 py-3 text-purple-400">{totals.ctr.toFixed(2)}%</td>
                  <td className="text-right px-4 py-3 text-violet-400">
                    {totals.leads > 0 ? formatCurrency(totals.cpl) : '—'}
                  </td>
                  <td className="text-right px-4 py-3 text-orange-400">{formatNumber(totals.checkoutComplete)}</td>
                  <td className="text-right px-4 py-3 text-emerald-400">{formatNumber(totals.purchases)}</td>
                  <td className="text-right px-4 py-3 text-yellow-400">{formatCurrency(totals.revenue)}</td>
                  <td className="text-right px-4 py-3 text-pink-400">
                    {totals.purchases > 0 ? formatCurrency(totals.spend / totals.purchases) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
