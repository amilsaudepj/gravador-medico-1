-- ============================================
-- 🔧 FIX: Corrigir session_id de UUID para TEXT
-- ============================================

-- PASSO 1: Remover TODAS as views que dependem de session_id
DROP VIEW IF EXISTS public.online_visitors_now CASCADE;
DROP VIEW IF EXISTS public.conversion_by_source CASCADE;
DROP VIEW IF EXISTS public.conversion_funnel CASCADE;
DROP VIEW IF EXISTS public.analytics_visits_today CASCADE;
DROP VIEW IF EXISTS public.top_locations CASCADE;

-- PASSO 2: Remover índice antigo
DROP INDEX IF EXISTS public.idx_analytics_session;

-- PASSO 3: Alterar tipo da coluna de UUID para TEXT
ALTER TABLE public.analytics_visits 
ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;

-- PASSO 4: Recriar índice
CREATE INDEX idx_analytics_session ON public.analytics_visits(session_id);

-- PASSO 5: Recriar VIEW: Visitantes online agora
CREATE OR REPLACE VIEW public.online_visitors_now AS
SELECT 
  COUNT(DISTINCT session_id) as online_count,
  COUNT(DISTINCT CASE WHEN device_type = 'mobile' THEN session_id END) as mobile_count,
  COUNT(DISTINCT CASE WHEN device_type = 'desktop' THEN session_id END) as desktop_count
FROM public.analytics_visits
WHERE last_seen >= (NOW() - INTERVAL '5 minutes')
  AND is_online = true;

-- PASSO 6: Recriar VIEW: Análise de Conversão por Origem (UTM Source)
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
LEFT JOIN public.sales s ON v.session_id = s.session_id AND s.status = 'approved'
GROUP BY COALESCE(v.utm_source, 'direto')
ORDER BY total_sales DESC;

-- PASSO 7: Recriar VIEW: Funil de Conversão (Conversion Funnel)
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

-- PASSO 8: Recriar VIEW: Top Países e Cidades
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

-- PASSO 9: Verificar que funcionou
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'analytics_visits' 
  AND column_name = 'session_id';

-- Deve mostrar: session_id | text
