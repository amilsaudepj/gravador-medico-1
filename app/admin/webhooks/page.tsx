"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Webhook, Search, Filter, Calendar, CheckCircle, XCircle, Clock, Eye } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatMoney } from '@/lib/format'

interface WebhookLog {
  id: string
  event_type: string
  payload: any
  ip_address: string | null
  created_at: string
}

export default function WebhooksPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEventType, setSelectedEventType] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null)

  useEffect(() => {
    loadWebhooks()
  }, [])

  useEffect(() => {
    filterLogs()
  }, [searchTerm, selectedEventType, logs])

  const loadWebhooks = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabaseAdmin
        .from('webhooks_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Erro ao buscar webhooks:', error)
        return
      }

      setLogs(data || [])
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterLogs = () => {
    let filtered = [...logs]

    // Filtrar por tipo de evento
    if (selectedEventType !== 'all') {
      filtered = filtered.filter((log) => log.event_type === selectedEventType)
    }

    // Filtrar por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (log) =>
          log.event_type.toLowerCase().includes(term) ||
          log.ip_address?.toLowerCase().includes(term) ||
          JSON.stringify(log.payload).toLowerCase().includes(term)
      )
    }

    setFilteredLogs(filtered)
  }

  const getEventTypes = () => {
    const types = new Set(logs.map((log) => log.event_type))
    return Array.from(types)
  }

  const EventTypeBadge = ({ type }: { type: string }) => {
    const styles: Record<string, string> = {
      'order.approved': 'bg-green-500/20 text-green-400 border-green-500/30',
      'order.pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'order.rejected': 'bg-red-500/20 text-red-400 border-red-500/30',
      'order.refunded': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      'pix.generated': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'pix.paid': 'bg-green-500/20 text-green-400 border-green-500/30',
    }

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold border ${
          styles[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        }`}
      >
        {type}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">Carregando webhooks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Webhooks</h1>
          <p className="text-gray-400 mt-1">Histórico de notificações da Appmax</p>
        </div>
        <button
          onClick={loadWebhooks}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-xl hover:shadow-lg hover:shadow-brand-500/30 transition-all"
        >
          <Clock className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Webhook className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-400 text-sm font-semibold">Total de Webhooks</h3>
          </div>
          <p className="text-3xl font-black text-white">{logs.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-400 text-sm font-semibold">Aprovados</h3>
          </div>
          <p className="text-3xl font-black text-white">
            {logs.filter((l) => l.event_type.includes('approved') || l.event_type.includes('paid')).length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-400 text-sm font-semibold">Hoje</h3>
          </div>
          <p className="text-3xl font-black text-white">
            {logs.filter((l) => {
              const logDate = format(new Date(l.created_at), 'dd/MM/yyyy')
              const today = format(new Date(), 'dd/MM/yyyy')
              return logDate === today
            }).length}
          </p>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar em webhooks, IP, payload..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
            >
              <option value="all">Todos os Eventos</option>
              {getEventTypes().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Logs */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Evento
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  IP de Origem
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">
                      {format(new Date(log.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                    <div className="text-xs text-gray-400">
                      {format(new Date(log.created_at), 'HH:mm:ss', { locale: ptBR })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <EventTypeBadge type={log.event_type} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400 font-mono">
                      {log.ip_address || 'Não identificado'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">
                      {log.payload?.customer?.name || log.payload?.nome || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {log.payload?.customer?.email || log.payload?.email || ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-green-400">
                      {log.payload?.amount || log.payload?.valor
                        ? `R$ ${formatMoney(log.payload?.amount || log.payload?.valor)}`
                        : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-brand-400 hover:text-brand-300 font-semibold text-sm transition-colors"
                    >
                      <Eye className="w-5 h-5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-12 text-center">
            <Webhook className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Nenhum webhook encontrado</h3>
            <p className="text-gray-400">
              {searchTerm ? 'Tente buscar por outro termo' : 'Aguardando primeira notificação da Appmax'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden border border-gray-700"
          >
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Detalhes do Webhook</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {format(new Date(selectedLog.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Evento</label>
                  <div className="mt-1">
                    <EventTypeBadge type={selectedLog.event_type} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">IP de Origem</label>
                  <div className="mt-1 text-white font-mono text-sm">
                    {selectedLog.ip_address || 'Não identificado'}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase">Payload Completo</label>
                  <pre className="mt-2 p-4 bg-gray-900 rounded-xl text-xs text-green-400 font-mono overflow-x-auto border border-gray-700">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
