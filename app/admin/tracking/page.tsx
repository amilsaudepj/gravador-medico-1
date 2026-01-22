/**
 * Dashboard de Tracking
 * Página principal do módulo de rastreamento
 * URL: /admin/tracking
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTrackingStats } from '@/actions/tracking';
import { 
  MousePointerClick, 
  Zap, 
  Clock, 
  AlertCircle, 
  Link2, 
  TrendingUp,
  ArrowRight 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrackingDashboardStats } from '@/lib/types/tracking';

export default function TrackingDashboard() {
  const [stats, setStats] = useState<TrackingDashboardStats>({
    totalClicks: 0,
    totalEvents: 0,
    pendingEvents: 0,
    failedEvents: 0,
    activeLinks: 0,
    conversions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // TODO: Pegar userId do contexto de autenticação
      const userId = 'temp-user-id'; // Placeholder
      const result = await getTrackingStats(userId);
      if (result.success && result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Rastreamento & Atribuição
          </h1>
          <p className="text-gray-600 mt-2">
            Módulo Tintim Killer - Rastreie cliques e atribua vendas
          </p>
        </div>
        
        <div className="flex gap-3">
          <Link href="/admin/tracking/pixels">
            <Button variant="outline">
              <Zap className="w-4 h-4 mr-2" />
              Configurar Pixel
            </Button>
          </Link>
          <Link href="/admin/tracking/links">
            <Button>
              <Link2 className="w-4 h-4 mr-2" />
              Gerenciar Links
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total de Cliques */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total de Cliques
            </CardTitle>
            <MousePointerClick className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.totalClicks.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Cliques rastreados em todos os links
            </p>
          </CardContent>
        </Card>

        {/* Eventos Disparados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Eventos Disparados
            </CardTitle>
            <Zap className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.totalEvents.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Total de eventos enviados ao Meta
            </p>
          </CardContent>
        </Card>

        {/* Conversões */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Conversões
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.conversions.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Vendas atribuídas a campanhas
            </p>
          </CardContent>
        </Card>

        {/* Links Ativos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Links Ativos
            </CardTitle>
            <Link2 className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.activeLinks.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Links de rastreamento ativos
            </p>
          </CardContent>
        </Card>

        {/* Eventos Pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Eventos Pendentes
            </CardTitle>
            <Clock className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.pendingEvents.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Na fila para processamento
            </p>
          </CardContent>
        </Card>

        {/* Eventos com Falha */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Eventos com Falha
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.failedEvents.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Requerem atenção
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Como Funciona */}
        <Card>
          <CardHeader>
            <CardTitle>Como Funciona</CardTitle>
            <CardDescription>
              Entenda o fluxo de rastreamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Crie um Link Rastreável</h4>
                <p className="text-sm text-gray-600">
                  Configure a mensagem do WhatsApp e parâmetros UTM
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold text-sm">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Compartilhe o Link</h4>
                <p className="text-sm text-gray-600">
                  Use em anúncios, redes sociais ou e-mail marketing
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold text-sm">3</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Rastreie Conversões</h4>
                <p className="text-sm text-gray-600">
                  Cada clique gera um código único que atribui vendas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso direto às principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/tracking/links">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center">
                  <Link2 className="w-4 h-4 mr-2" />
                  Gerenciar Links Rastreáveis
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <Link href="/admin/tracking/pixels">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center">
                  <Zap className="w-4 h-4 mr-2" />
                  Configurar Meta Pixel
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <div className="pt-3 border-t">
              <p className="text-sm text-gray-600 mb-2">
                Precisa de ajuda?
              </p>
              <Button variant="ghost" className="p-0 h-auto">
                Ver Documentação
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
