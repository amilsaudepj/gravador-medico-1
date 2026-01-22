/**
 * Bridge Page - Página de Redirecionamento Rastreável
 * URL: /r/[slug]
 * 
 * Server Component que:
 * 1. Busca link e integração do Meta
 * 2. Gera eventId e refCode únicos
 * 3. Renderiza Client Component com os dados
 */

import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { generateEventId, generateRefCode } from '@/lib/tracking-utils';
import { TrackingLink, IntegrationMeta } from '@/lib/types/tracking';
import RedirectClient from '@/components/tracking/RedirectClient';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function BridgePage({ params }: PageProps) {
  const { slug } = params;
  
  // Busca o link pelo slug (usando supabaseAdmin para acesso sem autenticação)
  const { data: link, error: linkError } = await supabaseAdmin
    .from('tracking_links')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  
  // Se link não encontrado ou inativo, retorna 404
  if (linkError || !link) {
    notFound();
  }
  
  const typedLink = link as unknown as TrackingLink;
  
  // Busca integração do Meta para o usuário do link
  const { data: integration } = await supabaseAdmin
    .from('integrations_meta')
    .select('*')
    .eq('user_id', typedLink.user_id)
    .eq('is_active', true)
    .single();
  
  const typedIntegration = integration as unknown as IntegrationMeta | null;
  
  // Gera IDs únicos para este acesso
  const eventId = generateEventId();
  const refCode = generateRefCode();
  
  // Renderiza o Client Component
  return (
    <RedirectClient
      link={typedLink}
      integration={typedIntegration}
      eventId={eventId}
      refCode={refCode}
    />
  );
}

// Metadados da página
export async function generateMetadata({ params }: PageProps) {
  const { slug } = params;
  
  const { data: link } = await supabaseAdmin
    .from('tracking_links')
    .select('campaign_name')
    .eq('slug', slug)
    .single();
  
  const title = link?.campaign_name || 'Redirecionamento';
  
  return {
    title: `${title} | Gravador Médico`,
    description: 'Clique para iniciar conversa no WhatsApp',
    robots: 'noindex, nofollow', // Não indexar páginas de tracking
  };
}
