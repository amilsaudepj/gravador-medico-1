'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { BarChart3, Users, TrendingUp, Target, DollarSign, Clock, Eye, Zap, MousePointer } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { motion } from 'framer-motion'

interface HealthMetrics {
  unique_visitors: number
  sales: number
  revenue: number
  average_order_value: number
  avg_time_seconds: number
  conversion_rate: number
  visitors_change: number
  revenue_change: number
  aov_change: number
  time_change: number
}

interface MarketingAttribution {
  source: string
  medium: string
  campaign: string
  visitors: number
  sessions: number
  sales_count: number
  total_revenue: number
  conversion_rate: number
  average_order_value: number
  primary_device: string
}

interface FunnelData {
  step_visitors: number
  step_interested: number
  step_checkout_started: number
  step_purchased: number
}

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444']

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState<HealthMetrics | null>(null)
  const [attribution, setAttribution] = useState<MarketingAttribution[]>([])
  const [funnel, setFunnel] = useState<FunnelData | null>(null)
  const [onlineVisitors, setOnlineVisitors] = useState(0)

  useEffect(() => {
    loadAnalytics()
    const interval = setInterval(loadOnlineVisitors, 5000)
    return () => clearInterval(interval)
  }, [])

  async function loadAnalytics() {
    try {
      // Health Metrics
      const { data: healthData } = await supabase
        .from('analytics_health')
        .select('*')
        .single()
      
      if (healthData) setHealth(healthData)

      // Marketing Attribution
      const { data: attrData } = await supabase
        .from('marketing_attribution')
        .select('*')
        .limit(10)
      
      if (attrData) setAttribution(attrData)

      // Funnel
      const { data: funnelData } = await supabase
        .from('analytics_funnel')
        .select('*')
        .single()
      
      if (funnelData) setFunnel(funnelData)

      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar analytics:', error)
      setLoading(false)
    }
  }

  async function loadOnlineVisitors() {
    const { data } = await supabase
      .from('analytics_visitors_online')
      .select('online_count')
      .single()
    
    if (data) setOnlineVisitors(data.online_count || 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando Analytics...</p>
        </div>
      </div>
    )
  }

  const funnelChartData = funnel ? [
    { name: 'Visitantes', value: funnel.step_visitors, fill: '#8B5CF6' },
    { name: 'Interessados', value: funnel.step_interested, fill: '#06B6D4' },
    { name: 'Checkout', value: funnel.step_checkout_started, fill: '#10B981' },
    { name: 'Compraram', value: funnel.step_purchased, fill: '#F59E0B' },
  ] : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white flex items-center gap-3">
              <BarChart3 className="w-10 h-10 text-brand-400" />
              Revenue Attribution
            </h1>
            <p className="text-gray-400 mt-2">
              De onde vem o dinheiro e onde ele trava?
            </p>
          </div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-r from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-2xl px-6 py-4 border border-green-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              <div>
                <p className="text-xs text-gray-400">Online Agora</p>
                <p className="text-2xl font-bold text-white">{onlineVisitors}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* KPIs de Saúde */}
        {health && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              icon={<Users className="w-6 h-6" />}
              label="Visitantes"
              value={(health.unique_visitors || 0).toLocaleString()}
              change={health.visitors_change || 0}
              color="purple"
            />
            <MetricCard
              icon={<DollarSign className="w-6 h-6" />}
              label="Receita"
              value={`R$ ${((health.revenue || 0) / 1000).toFixed(1)}k`}
              change={health.revenue_change || 0}
              color="green"
            />
            <MetricCard
              icon={<Target className="w-6 h-6" />}
              label="Conversão"
              value={`${(health.conversion_rate || 0).toFixed(1)}%`}
              change={0}
              color="cyan"
            />
            <MetricCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Ticket Médio"
              value={`R$ ${(health.average_order_value || 0).toFixed(0)}`}
              change={health.aov_change || 0}
              color="orange"
            />
            <MetricCard
              icon={<Clock className="w-6 h-6" />}
              label="Tempo Médio"
              value={`${Math.round((health.avg_time_seconds || 0) / 60)}m`}
              change={health.time_change || 0}
              color="blue"
            />
          </div>
        )}

        {/* Funil de Conversão */}
        {funnel && (
          <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800 p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Funil de Conversão (30 dias)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              
              <div className="space-y-4">
                <FunnelStep 
                  label="Visitantes" 
                  value={funnel.step_visitors} 
                  percentage={100}
                  color="purple"
                />
                <FunnelStep 
                  label="Interessados (Pricing/Checkout)" 
                  value={funnel.step_interested} 
                  percentage={(funnel.step_interested / funnel.step_visitors) * 100}
                  color="cyan"
                />
                <FunnelStep 
                  label="Iniciaram Checkout" 
                  value={funnel.step_checkout_started} 
                  percentage={(funnel.step_checkout_started / funnel.step_visitors) * 100}
                  color="green"
                />
                <FunnelStep 
                  label="Compraram" 
                  value={funnel.step_purchased} 
                  percentage={(funnel.step_purchased / funnel.step_visitors) * 100}
                  color="orange"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Atribuição de Marketing */}
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <MousePointer className="w-5 h-5 text-brand-400" />
            Atribuição de Marketing (Top 10 Fontes)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Fonte</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Campanha</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Visitantes</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Vendas</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Receita</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Conv%</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Ticket</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-400">Device</th>
                </tr>
              </thead>
              <tbody>
                {attribution.map((row, idx) => (
                  <motion.tr
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white font-medium">{row.source}</p>
                        <p className="text-xs text-gray-500">{row.medium}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400">{row.campaign}</td>
                    <td className="py-3 px-4 text-right text-white">{row.visitors.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-white font-semibold">{row.sales_count}</td>
                    <td className="py-3 px-4 text-right text-green-400 font-bold">
                      R$ {(row.total_revenue / 1000).toFixed(1)}k
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        row.conversion_rate >= 5 ? 'bg-green-500/20 text-green-400' :
                        row.conversion_rate >= 2 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {row.conversion_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-white">R$ {row.average_order_value.toFixed(0)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-800 text-gray-300">
                        {row.primary_device}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Análise de Receita por Fonte */}
        <Card className="bg-gray-900/50 backdrop-blur-xl border-gray-800 p-6">
          <h3 className="text-xl font-bold text-white mb-6">Receita por Fonte de Tráfego</h3>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={attribution.slice(0, 8)}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="source" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Area 
                type="monotone" 
                dataKey="total_revenue" 
                stroke="#8B5CF6" 
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, change, color }: {
  icon: React.ReactNode
  label: string
  value: string
  change: number
  color: string
}) {
  const colorClasses = {
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    cyan: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} backdrop-blur-sm rounded-2xl p-5 border`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-gray-400">{icon}</div>
        {change !== 0 && (
          <span className={`text-xs font-semibold ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
    </motion.div>
  )
}

function FunnelStep({ label, value, percentage, color }: {
  label: string
  value: number
  percentage: number
  color: string
}) {
  const colorClasses = {
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-white font-semibold">{value.toLocaleString()} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div 
          className={`${colorClasses[color as keyof typeof colorClasses]} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  )
}
