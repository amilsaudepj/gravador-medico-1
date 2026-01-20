-- ============================================
-- 🚀 ANALYTICS NÍVEL NASA
-- Sistema de rastreamento profissional
-- Competindo com Google Analytics/Facebook Ads
-- ============================================

-- Adicionar TODAS as colunas para rastreamento profissional
ALTER TABLE public.analytics_visits
-- Sessão e Identificação
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

-- Dispositivo e Tecnologia
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'desktop', -- mobile, desktop, tablet
ADD COLUMN IF NOT EXISTS os TEXT, -- iOS, Android, Windows, macOS
ADD COLUMN IF NOT EXISTS browser TEXT, -- Chrome, Safari, Firefox
ADD COLUMN IF NOT EXISTS browser_version TEXT,

-- Geolocalização
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT, -- Estado/Região
ADD COLUMN IF NOT EXISTS country TEXT,

-- Origem do Tráfego
ADD COLUMN IF NOT EXISTS referrer_domain TEXT, -- instagram.com, google.com
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS utm_content TEXT,
ADD COLUMN IF NOT EXISTS utm_term TEXT,

-- Rastreamento de Ads (Crucial para CAPI)
ADD COLUMN IF NOT EXISTS gclid TEXT, -- Google Click ID
ADD COLUMN IF NOT EXISTS fbclid TEXT, -- Facebook Click ID
ADD COLUMN IF NOT EXISTS fbc TEXT, -- Facebook Cookie (_fbc)
ADD COLUMN IF NOT EXISTS fbp TEXT, -- Facebook Pixel (_fbp)

-- Timestamps
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Criar índices para performance de consultas
CREATE INDEX IF NOT EXISTS idx_analytics_session ON public.analytics_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_device ON public.analytics_visits(device_type);
CREATE INDEX IF NOT EXISTS idx_analytics_country ON public.analytics_visits(country);
CREATE INDEX IF NOT EXISTS idx_analytics_region ON public.analytics_visits(region);
CREATE INDEX IF NOT EXISTS idx_analytics_city ON public.analytics_visits(city);
CREATE INDEX IF NOT EXISTS idx_analytics_utm_source ON public.analytics_visits(utm_source);
CREATE INDEX IF NOT EXISTS idx_analytics_utm_campaign ON public.analytics_visits(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON public.analytics_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_online ON public.analytics_visits(is_online, last_seen);
CREATE INDEX IF NOT EXISTS idx_analytics_referrer ON public.analytics_visits(referrer_domain);

-- 🔥 FUNÇÃO: Detectar visitantes online (últimos 5 minutos)
CREATE OR REPLACE FUNCTION public.detect_online_visitors()
RETURNS TABLE(online_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(DISTINCT session_id)
  FROM public.analytics_visits
  WHERE last_seen >= (NOW() - INTERVAL '5 minutes')
    AND is_online = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🔥 VIEW: Visitantes online agora
CREATE OR REPLACE VIEW public.online_visitors_now AS
SELECT 
  COUNT(DISTINCT session_id) as online_count,
  COUNT(DISTINCT CASE WHEN device_type = 'mobile' THEN session_id END) as mobile_count,
  COUNT(DISTINCT CASE WHEN device_type = 'desktop' THEN session_id END) as desktop_count
FROM public.analytics_visits
WHERE last_seen >= (NOW() - INTERVAL '5 minutes')
  AND is_online = true;

-- 🔥 VIEW: Análise de Conversão por Origem (UTM Source)
CREATE OR REPLACE VIEW public.conversion_by_source AS
SELECT 
  COALESCE(v.utm_source, 'direto') as source,
  COUNT(DISTINCT v.session_id) as total_visits,
  COUNT(DISTINCT s.id) as total_sales,
  ROUND(
    (COUNT(DISTINCT s.id)::NUMERIC / NULLIF(COUNT(DISTINCT v.session_id), 0)) * 100, 
    2
  ) as conversion_rate
FROM public.analytics_visits v
LEFT JOIN public.sales s ON v.session_id::text = s.session_id AND s.status = 'approved'
GROUP BY COALESCE(v.utm_source, 'direto')
ORDER BY total_sales DESC;

-- 🔥 VIEW: Funil de Conversão (Conversion Funnel)
CREATE OR REPLACE VIEW public.conversion_funnel AS
SELECT 
  'Visitantes' as stage,
  1 as order_stage,
  COUNT(DISTINCT session_id) as count
FROM public.analytics_visits
WHERE page_path = '/'

UNION ALL

SELECT 
  'Interessados (Checkout)' as stage,
  2 as order_stage,
  COUNT(DISTINCT session_id) as count
FROM public.analytics_visits
WHERE page_path LIKE '%/checkout%'

UNION ALL

SELECT 
  'Carrinhos Abandonados' as stage,
  3 as order_stage,
  COUNT(*) as count
FROM public.abandoned_carts
WHERE status = 'abandoned'

UNION ALL

SELECT 
  'Vendas Confirmadas' as stage,
  4 as order_stage,
  COUNT(*) as count
FROM public.sales
WHERE status = 'approved'

ORDER BY order_stage;

-- 🔥 VIEW: Top Países e Cidades
CREATE OR REPLACE VIEW public.top_locations AS
SELECT 
  country,
  region,
  city,
  COUNT(*) as visit_count,
  COUNT(DISTINCT session_id) as unique_sessions
FROM public.analytics_visits
WHERE country IS NOT NULL
GROUP BY country, region, city
ORDER BY visit_count DESC
LIMIT 50;

-- Comentário: Ver estrutura atualizada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'analytics_visits'
ORDER BY ordinal_position;
