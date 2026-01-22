/**
 * Configuração do Meta Pixel
 * Página para gerenciar integração com Meta/Facebook Pixel
 * URL: /admin/tracking/pixels
 */

'use client';

import { useEffect, useState } from 'react';
import { saveIntegration, getIntegration, toggleIntegration } from '@/actions/tracking';
import { IntegrationMeta } from '@/lib/types/tracking';
import { Zap, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';

export default function PixelsConfigPage() {
  const [integration, setIntegration] = useState<IntegrationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    access_token: '',
    pixel_id: '',
    test_event_code: '',
  });

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    try {
      // TODO: Pegar userId do contexto de autenticação
      const userId = 'temp-user-id';
      const result = await getIntegration(userId);
      if (result.success && result.integration) {
        const data = result.integration as IntegrationMeta;
        setIntegration(data);
        setFormData({
          access_token: data.access_token,
          pixel_id: data.pixel_id,
          test_event_code: data.test_event_code || '',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar integração:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // TODO: Pegar userId do contexto de autenticação
      const userId = 'temp-user-id';

      const result = await saveIntegration({
        user_id: userId,
        access_token: formData.access_token,
        pixel_id: formData.pixel_id,
        test_event_code: formData.test_event_code || null,
        is_active: true,
      });

      if (result.success) {
        toast('Integração salva com sucesso!', 'success');
        loadIntegration();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast(error.message || 'Falha ao salvar integração', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!integration) return;

    try {
      // TODO: Pegar userId do contexto de autenticação
      const userId = 'temp-user-id';
      const result = await toggleIntegration(userId, !integration.is_active);
      
      if (result.success) {
        toast(
          integration.is_active ? 'Integração desativada' : 'Integração ativada',
          'success'
        );
        loadIntegration();
      }
    } catch (error: any) {
      toast(error.message || 'Falha ao atualizar status', 'error');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Configuração do Meta Pixel
        </h1>
        <p className="text-gray-600 mt-2">
          Configure a integração com o Facebook/Meta Pixel para rastreamento de conversões
        </p>
      </div>

      {/* Status da Integração */}
      {integration && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Status da Integração</CardTitle>
                <CardDescription>
                  {integration.is_active ? 'Ativa e funcionando' : 'Desativada'}
                </CardDescription>
              </div>
              <Button
                variant={integration.is_active ? 'outline' : 'default'}
                onClick={handleToggle}
              >
                {integration.is_active ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Desativar
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Ativar
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Formulário de Configuração */}
      <Card>
        <CardHeader>
          <CardTitle>Credenciais do Meta</CardTitle>
          <CardDescription>
            Insira as credenciais obtidas no Facebook Business Manager
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pixel ID */}
            <div>
              <Label htmlFor="pixel_id">Pixel ID *</Label>
              <Input
                id="pixel_id"
                value={formData.pixel_id}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData({ ...formData, pixel_id: e.target.value })
                }
                placeholder="123456789012345"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                ID do seu Pixel no Facebook Business Manager
              </p>
            </div>

            {/* Access Token */}
            <div>
              <Label htmlFor="access_token">Access Token *</Label>
              <div className="flex gap-2">
                <Input
                  id="access_token"
                  type={showToken ? 'text' : 'password'}
                  value={formData.access_token}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setFormData({ ...formData, access_token: e.target.value })
                  }
                  placeholder="EAAxxxxxxxxxx..."
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Token de acesso para a API de Conversões
              </p>
            </div>

            {/* Test Event Code */}
            <div>
              <Label htmlFor="test_event_code">Test Event Code (Opcional)</Label>
              <Input
                id="test_event_code"
                value={formData.test_event_code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData({ ...formData, test_event_code: e.target.value })
                }
                placeholder="TEST12345"
              />
              <p className="text-xs text-gray-500 mt-1">
                Código para testar eventos no Event Manager
              </p>
            </div>

            <Button type="submit" disabled={isSaving} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Como Obter as Credenciais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold text-sm">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Acesse o Business Manager</h4>
              <p className="text-sm text-gray-600">
                Vá para <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">business.facebook.com</a> e faça login
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 font-bold text-sm">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Encontre seu Pixel ID</h4>
              <p className="text-sm text-gray-600">
                Em "Gerenciador de Eventos" &gt; "Pixels", copie o ID do seu pixel
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 font-bold text-sm">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Gere um Access Token</h4>
              <p className="text-sm text-gray-600">
                Em "Configurações do Sistema" &gt; "Tokens de Acesso", gere um token com permissões de ads_management
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <span className="text-orange-600 font-bold text-sm">4</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Ative a API de Conversões</h4>
              <p className="text-sm text-gray-600">
                No Gerenciador de Eventos, vá em "Configurações" &gt; "API de Conversões" e ative
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>O que você pode fazer com esta integração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              Rastrear cliques e visualizações de página em tempo real
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              Atribuir vendas às campanhas corretas automaticamente
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              Enviar eventos personalizados para otimização de campanhas
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              Melhorar o ROAS (Return on Ad Spend) com dados precisos
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
