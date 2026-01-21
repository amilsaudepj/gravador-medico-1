-- ==========================================
-- 📊 ANALYTICS AVANÇADO - REVENUE ATTRIBUTION
-- ==========================================
-- Nível: Google Analytics 4 / Mixpanel
-- Autor: Gravador Médico - Analytics Team
-- Data: 21/01/2026

-- 1️⃣ VIEW DE ATRIBUIÇÃO DE MARKETING (Traffic Source → Revenue)
-- Correlaciona origens de tráfego com vendas e receita
CREATE OR REPLACE VIEW public.marketing_attribution AS
WITH completed_sales AS (
    SELECT 
        customer_email,
        total_amount,
        created_at,
        payment_method
    FROM public.checkout_attempts
    WHERE status IN ('paid', 'approved', 'completed')
),
traffic_sources AS (
    SELECT 
        id as visit_id,
        session_id,
        user_agent,
        -- Prioridade de atribuição: UTM > Referrer > Direct
        COALESCE(
            utm_source, 
            CASE 
                WHEN referrer_domain LIKE '%google%' THEN 'google-organic'
                WHEN referrer_domain LIKE '%facebook%' OR referrer_domain LIKE '%instagram%' THEN 'social-organic'
                WHEN referrer_domain LIKE '%youtube%' THEN 'youtube'
                WHEN referrer_domain LIKE '%linkedin%' THEN 'linkedin'
                WHEN referrer_domain IS NULL THEN 'direct'
                ELSE referrer_domain 
            END
        ) as source,
        COALESCE(utm_medium, 'organic') as medium,
        COALESCE(utm_campaign, 'none') as campaign,
        created_at
    FROM public.analytics_visits
    WHERE created_at >= NOW() - INTERVAL '90 days' -- Performance: só últimos 90 dias
)
SELECT 
    ts.source,
    ts.medium,
    ts.campaign,
    COUNT(DISTINCT ts.visit_id) as visitors,
    COUNT(DISTINCT ts.session_id) as sessions,
    
    -- Aproximação estatística (em produção, use cookies persistentes)
    COUNT(DISTINCT cs.customer_email) as sales_count,
    COALESCE(SUM(cs.total_amount), 0) as total_revenue,
    
    -- Taxa de Conversão
    CASE 
        WHEN COUNT(DISTINCT ts.session_id) > 0 
        THEN ROUND((COUNT(DISTINCT cs.customer_email)::numeric / COUNT(DISTINCT ts.session_id)::numeric) * 100, 2)
        ELSE 0 
    END as conversion_rate,
    
    -- AOV (Average Order Value)
    CASE 
        WHEN COUNT(DISTINCT cs.customer_email) > 0 
        THEN ROUND(COALESCE(SUM(cs.total_amount), 0) / COUNT(DISTINCT cs.customer_email), 2)
        ELSE 0 
    END as average_order_value,
    
    -- Dispositivo predominante
    MODE() WITHIN GROUP (ORDER BY 
        CASE 
            WHEN ts.user_agent LIKE '%Mobile%' OR ts.user_agent LIKE '%Android%' THEN 'mobile'
            WHEN ts.user_agent LIKE '%Tablet%' OR ts.user_agent LIKE '%iPad%' THEN 'tablet'
            ELSE 'desktop'
        END
    ) as primary_device
    
FROM 
    traffic_sources ts
    LEFT JOIN completed_sales cs ON 
        -- Lógica: Atribuir venda se ocorreu até 24h após a visita
        cs.created_at BETWEEN ts.created_at AND (ts.created_at + INTERVAL '24 hours')
GROUP BY 
    ts.source, ts.medium, ts.campaign
ORDER BY 
    total_revenue DESC, conversion_rate DESC;

-- 2️⃣ VIEW DE FUNIL DE CONVERSÃO (Conversion Funnel)
CREATE OR REPLACE VIEW public.analytics_funnel AS
SELECT
    -- Passo 1: Total Visitantes Únicos (Sessões)
    (SELECT COUNT(DISTINCT session_id) 
     FROM public.analytics_visits 
     WHERE created_at > NOW() - INTERVAL '30 days') as step_visitors,
    
    -- Passo 2: Visitantes Interessados (Viu pricing/checkout)
    (SELECT COUNT(DISTINCT session_id) 
     FROM public.analytics_visits 
     WHERE (page_path LIKE '%checkout%' OR page_path LIKE '%pricing%' OR page_path LIKE '%plano%')
     AND created_at > NOW() - INTERVAL '30 days') as step_interested,
    
    -- Passo 3: Checkout Iniciado (Preencheu formulário)
    (SELECT COUNT(*) 
     FROM public.checkout_attempts 
     WHERE created_at > NOW() - INTERVAL '30 days') as step_checkout_started,
    
    -- Passo 4: Venda Concluída (Pagamento Aprovado)
    (SELECT COUNT(*) 
     FROM public.checkout_attempts 
     WHERE status IN ('paid', 'approved', 'completed')
     AND created_at > NOW() - INTERVAL '30 days') as step_purchased;

-- 3️⃣ VIEW DE HEALTH METRICS (KPIs Comparativos)
CREATE OR REPLACE VIEW public.analytics_health AS
WITH current_period AS (
    SELECT
        COUNT(DISTINCT av.session_id) as unique_visitors,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.status IN ('paid', 'approved', 'completed')) as sales,
        COALESCE(SUM(ca.total_amount) FILTER (WHERE ca.status IN ('paid', 'approved', 'completed')), 0) as revenue,
        COALESCE(AVG(ca.total_amount) FILTER (WHERE ca.status IN ('paid', 'approved', 'completed')), 0) as aov,
        COALESCE(AVG(EXTRACT(EPOCH FROM (av.last_seen - av.created_at))), 0) as avg_time_on_site
    FROM public.analytics_visits av
    LEFT JOIN public.checkout_attempts ca ON ca.created_at BETWEEN av.created_at AND av.created_at + INTERVAL '24 hours'
    WHERE av.created_at >= NOW() - INTERVAL '30 days'
),
previous_period AS (
    SELECT
        COUNT(DISTINCT av.session_id) as unique_visitors,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.status IN ('paid', 'approved', 'completed')) as sales,
        COALESCE(SUM(ca.total_amount) FILTER (WHERE ca.status IN ('paid', 'approved', 'completed')), 0) as revenue,
        COALESCE(AVG(ca.total_amount) FILTER (WHERE ca.status IN ('paid', 'approved', 'completed')), 0) as aov,
        COALESCE(AVG(EXTRACT(EPOCH FROM (av.last_seen - av.created_at))), 0) as avg_time_on_site
    FROM public.analytics_visits av
    LEFT JOIN public.checkout_attempts ca ON ca.created_at BETWEEN av.created_at AND av.created_at + INTERVAL '24 hours'
    WHERE av.created_at >= NOW() - INTERVAL '60 days' AND av.created_at < NOW() - INTERVAL '30 days'
)
SELECT
    -- Métricas Atuais
    cp.unique_visitors,
    cp.sales,
    cp.revenue,
    ROUND(cp.aov, 2) as average_order_value,
    ROUND(cp.avg_time_on_site, 0) as avg_time_seconds,
    
    -- Taxa de Conversão Global
    CASE 
        WHEN cp.unique_visitors > 0 
        THEN ROUND((cp.sales::numeric / cp.unique_visitors::numeric) * 100, 2)
        ELSE 0 
    END as conversion_rate,
    
    -- Deltas (% Change vs Previous Period)
    CASE 
        WHEN pp.unique_visitors > 0 
        THEN ROUND(((cp.unique_visitors::numeric - pp.unique_visitors::numeric) / pp.unique_visitors::numeric) * 100, 1)
        ELSE 0 
    END as visitors_change,
    
    CASE 
        WHEN pp.revenue > 0 
        THEN ROUND(((cp.revenue - pp.revenue) / pp.revenue) * 100, 1)
        ELSE 0 
    END as revenue_change,
    
    CASE 
        WHEN pp.aov > 0 
        THEN ROUND(((cp.aov - pp.aov) / pp.aov) * 100, 1)
        ELSE 0 
    END as aov_change,
    
    CASE 
        WHEN pp.avg_time_on_site > 0 
        THEN ROUND(((cp.avg_time_on_site - pp.avg_time_on_site) / pp.avg_time_on_site) * 100, 1)
        ELSE 0 
    END as time_change
    
FROM current_period cp, previous_period pp;

-- 4️⃣ VIEW DE VISITANTES ONLINE (Realtime)
CREATE OR REPLACE VIEW public.analytics_visitors_online AS
SELECT 
    COUNT(DISTINCT session_id) as online_count,
    COUNT(DISTINCT CASE WHEN user_agent LIKE '%Mobile%' THEN session_id END) as mobile_count,
    COUNT(DISTINCT CASE WHEN user_agent NOT LIKE '%Mobile%' THEN session_id END) as desktop_count
FROM public.analytics_visits
WHERE last_seen >= NOW() - INTERVAL '5 minutes'
AND is_online = true;

-- 5️⃣ ÍNDICES DE PERFORMANCE (Crucial para Dashboards Rápidos)
CREATE INDEX IF NOT EXISTS idx_analytics_visits_created_at ON public.analytics_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_visits_session_id ON public.analytics_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_visits_utm_source ON public.analytics_visits(utm_source);
CREATE INDEX IF NOT EXISTS idx_analytics_visits_last_seen ON public.analytics_visits(last_seen) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_checkout_attempts_created_status ON public.checkout_attempts(created_at DESC, status);

-- 6️⃣ FUNÇÃO HELPER: Obter Métricas de um Período Customizado
CREATE OR REPLACE FUNCTION public.get_analytics_period(
    start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
    unique_visitors BIGINT,
    total_sales BIGINT,
    total_revenue NUMERIC,
    conversion_rate NUMERIC,
    average_order_value NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT av.session_id),
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.status IN ('paid', 'approved', 'completed')),
        COALESCE(SUM(ca.total_amount) FILTER (WHERE ca.status IN ('paid', 'approved', 'completed')), 0),
        CASE 
            WHEN COUNT(DISTINCT av.session_id) > 0 
            THEN ROUND((COUNT(DISTINCT ca.id) FILTER (WHERE ca.status IN ('paid', 'approved', 'completed'))::numeric / COUNT(DISTINCT av.session_id)::numeric) * 100, 2)
            ELSE 0 
        END,
        CASE 
            WHEN COUNT(DISTINCT ca.id) FILTER (WHERE ca.status IN ('paid', 'approved', 'completed')) > 0 
            THEN ROUND(COALESCE(SUM(ca.total_amount) FILTER (WHERE ca.status IN ('paid', 'approved', 'completed')), 0) / COUNT(DISTINCT ca.id) FILTER (WHERE ca.status IN ('paid', 'approved', 'completed')), 2)
            ELSE 0 
        END
    FROM public.analytics_visits av
    LEFT JOIN public.checkout_attempts ca ON ca.created_at BETWEEN av.created_at AND av.created_at + INTERVAL '24 hours'
    WHERE av.created_at BETWEEN start_date AND end_date;
END;
$$;

-- ✅ DONE! Analytics Views Criadas com Sucesso
-- Execute: SELECT * FROM marketing_attribution LIMIT 10;
-- Execute: SELECT * FROM analytics_health;
-- Execute: SELECT * FROM analytics_funnel;
