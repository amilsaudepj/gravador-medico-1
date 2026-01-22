/**
 * Redirect Client Component
 * Componente cliente que gerencia o redirecionamento e tracking
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrackingLink, IntegrationMeta } from '@/lib/types/tracking';
import { generateWhatsAppURL } from '@/lib/tracking-utils';
import { trackClick } from '@/actions/tracking';
import { Button } from '@/components/ui/button';
import { Loader2, MessageCircle, ExternalLink } from 'lucide-react';

interface RedirectClientProps {
  link: TrackingLink;
  integration: IntegrationMeta | null;
  eventId: string;
  refCode: string;
}

export default function RedirectClient({
  link,
  integration,
  eventId,
  refCode,
}: RedirectClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [hasTrackedPageView, setHasTrackedPageView] = useState(false);

  // Dispara evento PageView no carregamento da página
  useEffect(() => {
    if (!hasTrackedPageView && integration) {
      // Dispara Meta Pixel PageView
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'PageView', {}, {
          eventID: eventId,
        });
      }
      setHasTrackedPageView(true);
    }
  }, [eventId, integration, hasTrackedPageView]);

  // Função de redirecionamento com tracking
  const handleRedirect = async () => {
    setIsLoading(true);

    try {
      // Captura dados do navegador
      const userAgent = navigator.userAgent;
      const referer = document.referrer || null;

      // Salva o clique e enfileira evento ViewContent
      await trackClick({
        linkId: link.id,
        refCode,
        eventId,
        userAgent,
        referer,
      });

      // Dispara Meta Pixel ViewContent (se integração ativa)
      if (integration && typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'ViewContent', {
          content_name: link.campaign_name || link.slug,
          content_category: 'WhatsApp Link',
          content_ids: [link.id],
          value: 0,
          currency: 'BRL',
        }, {
          eventID: eventId,
        });
      }

      // Gera URL do WhatsApp com mensagem + refCode
      const whatsappURL = generateWhatsAppURL(
        link.whatsapp_number,
        link.whatsapp_message,
        refCode
      );

      // Pequeno delay para garantir que o tracking foi salvo
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redireciona para WhatsApp
      window.location.href = whatsappURL;
    } catch (error) {
      console.error('Erro ao rastrear clique:', error);
      // Mesmo com erro, redireciona para não quebrar a experiência
      const whatsappURL = generateWhatsAppURL(
        link.whatsapp_number,
        link.whatsapp_message,
        refCode
      );
      window.location.href = whatsappURL;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      {/* Meta Pixel Script (se integração ativa) */}
      {integration && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${integration.pixel_id}');
            `,
          }}
        />
      )}

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Ícone do WhatsApp */}
        <div className="mx-auto w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6">
          <MessageCircle className="w-10 h-10 text-white" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {link.campaign_name || 'Iniciar Conversa'}
        </h1>

        {/* Descrição */}
        <p className="text-gray-600 mb-6">
          Você será redirecionado para o WhatsApp. Clique no botão abaixo para continuar.
        </p>

        {/* Preview da Mensagem */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Mensagem pré-preenchida:
          </p>
          <p className="text-sm text-gray-600 italic">
            "{link.whatsapp_message}"
          </p>
        </div>

        {/* Botão Principal */}
        <Button
          onClick={handleRedirect}
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Redirecionando...
            </>
          ) : (
            <>
              <MessageCircle className="w-5 h-5 mr-2" />
              Iniciar no WhatsApp
            </>
          )}
        </Button>

        {/* Link alternativo (se destination_url existir) */}
        {link.destination_url && (
          <div className="mt-4">
            <a
              href={link.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
              Ou visite nossa página
            </a>
          </div>
        )}

        {/* Compliance LGPD */}
        <p className="text-xs text-gray-500 mt-6">
          Ao clicar, você concorda com nossos{' '}
          <a href="/termos-de-uso" className="underline hover:text-gray-700">
            Termos de Uso
          </a>{' '}
          e{' '}
          <a href="/politica-privacidade" className="underline hover:text-gray-700">
            Política de Privacidade
          </a>
          .
        </p>

        {/* Info do RefCode (apenas para debug - remover em produção) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
            <p className="text-xs font-mono text-yellow-800">
              RefCode: {refCode} | EventID: {eventId.slice(0, 8)}...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
