'use client'

import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, CreditCard, Users } from 'lucide-react'

interface BigNumberProps {
  title: string
  value: string
  delta: number
  deltaText: string
  icon: React.ReactNode
  loading?: boolean
}

function BigNumberCard({ title, value, delta, deltaText, icon, loading }: BigNumberProps) {
  const isPositive = delta > 0
  const isNeutral = delta === 0

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-700 rounded w-24"></div>
          <div className="h-8 w-8 bg-gray-700 rounded-lg"></div>
        </div>
        <div className="h-8 bg-gray-700 rounded w-32 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-20"></div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 hover:border-gray-600 transition-all">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-400">{title}</span>
        <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400">
          {icon}
        </div>
      </div>
      
      <div className="mb-2">
        <h3 className="text-3xl font-bold text-white">{value}</h3>
      </div>
      
      <div className="flex items-center gap-1.5">
        {!isNeutral && delta !== undefined && delta !== null && (
          <div className={`flex items-center gap-0.5 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-semibold">
              {isPositive ? '+' : ''}{Math.abs(delta).toFixed(1)}%
            </span>
          </div>
        )}
        <span className="text-sm text-gray-500">{deltaText}</span>
      </div>
    </div>
  )
}

interface BigNumbersProps {
  metrics: {
    revenue: number
    sales: number
    conversion_rate: number
    average_order_value: number
    revenue_change: number
    aov_change: number
    visitors_change: number
    time_change: number
  }
  loading?: boolean
}

export default function BigNumbers({ metrics, loading }: BigNumbersProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Previne erro se metrics estiver null
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <BigNumberCard title="Faturamento Bruto" value="R$ 0" delta={0} deltaText="vs últimos 30 dias" icon={<DollarSign className="w-5 h-5" />} loading={true} />
        <BigNumberCard title="Ticket Médio (AOV)" value="R$ 0" delta={0} deltaText="vs período anterior" icon={<ShoppingCart className="w-5 h-5" />} loading={true} />
        <BigNumberCard title="Taxa de Conversão" value="0.0%" delta={0} deltaText="visitantes → vendas" icon={<CreditCard className="w-5 h-5" />} loading={true} />
        <BigNumberCard title="Total de Vendas" value="0" delta={0} deltaText="últimos 30 dias" icon={<Users className="w-5 h-5" />} loading={true} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <BigNumberCard
        title="Faturamento Bruto"
        value={formatCurrency(metrics.revenue || 0)}
        delta={metrics.revenue_change || 0}
        deltaText="vs últimos 30 dias"
        icon={<DollarSign className="w-5 h-5" />}
        loading={loading}
      />
      
      <BigNumberCard
        title="Ticket Médio (AOV)"
        value={formatCurrency(metrics.average_order_value || 0)}
        delta={metrics.aov_change || 0}
        deltaText="vs período anterior"
        icon={<ShoppingCart className="w-5 h-5" />}
        loading={loading}
      />
      
      <BigNumberCard
        title="Taxa de Conversão"
        value={formatPercent(metrics.conversion_rate || 0)}
        delta={metrics.visitors_change || 0}
        deltaText="visitantes → vendas"
        icon={<CreditCard className="w-5 h-5" />}
        loading={loading}
      />
      
      <BigNumberCard
        title="Total de Vendas"
        value={metrics.sales?.toString() || '0'}
        delta={metrics.time_change || 0}
        deltaText="últimos 30 dias"
        icon={<Users className="w-5 h-5" />}
        loading={loading}
      />
    </div>
  )
}
