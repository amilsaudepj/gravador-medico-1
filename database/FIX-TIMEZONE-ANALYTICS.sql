-- =============================================
-- FIX: Função get_analytics_period com timezone São Paulo
-- =============================================
-- Execute este SQL no Supabase SQL Editor
-- Data: 2026-01-29
-- 
-- Problema: A função estava usando timestamps UTC, 
-- causando discrepância com o horário do Brasil (UTC-3)
-- =============================================

-- Primeiro, definir o timezone padrão para a sessão
SET timezone = 'America/Sao_Paulo';

-- Recriar a função com suporte a timezone
CREATE OR REPLACE FUNCTION public.get_analytics_period(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    unique_visitors BIGINT,
    total_sales BIGINT,
    pending_sales BIGINT,
    paid_sales BIGINT,
    failed_sales BIGINT,
    total_revenue NUMERIC,
    gross_revenue NUMERIC,
    total_discount NUMERIC,
    conversion_rate NUMERIC,
    average_order_value NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
    start_utc TIMESTAMP WITH TIME ZONE;
    end_utc TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Debug: Log dos parâmetros recebidos
    RAISE NOTICE 'get_analytics_period: start_date=%, end_date=%', start_date, end_date;
    
    -- Os parâmetros já vêm com timezone, usar diretamente
    start_utc := start_date;
    end_utc := end_date;
    
    RAISE NOTICE 'Período de busca: % até %', start_utc, end_utc;

    RETURN QUERY
    WITH period_visits AS (
        SELECT
            COUNT(DISTINCT session_id) as unique_visitors
        FROM public.analytics_visits
        WHERE created_at >= start_utc AND created_at <= end_utc
    ),
    period_sales AS (
        SELECT
            COUNT(*) as total_sales,
            COUNT(*) FILTER (WHERE order_status IN ('pending', 'pending_payment', 'processing')) as pending_sales,
            COUNT(*) FILTER (WHERE order_status IN ('paid', 'provisioning', 'active', 'approved')) as paid_sales,
            COUNT(*) FILTER (WHERE order_status IN ('cancelled', 'canceled', 'expired', 'refused', 'rejected', 'failed', 'chargeback')) as failed_sales,
            COALESCE(SUM(total_amount) FILTER (WHERE order_status IN ('paid', 'provisioning', 'active', 'approved')), 0) as paid_revenue,
            COALESCE(SUM(subtotal) FILTER (WHERE order_status IN ('paid', 'provisioning', 'active', 'approved')), 0) as gross_revenue,
            COALESCE(SUM(discount) FILTER (WHERE order_status IN ('paid', 'provisioning', 'active', 'approved')), 0) as total_discount
        FROM public.sales
        WHERE created_at >= start_utc AND created_at <= end_utc
    )
    SELECT
        pv.unique_visitors,
        ps.total_sales,
        ps.pending_sales,
        ps.paid_sales,
        ps.failed_sales,
        ps.paid_revenue as total_revenue,
        ps.gross_revenue,
        ps.total_discount,
        CASE 
            WHEN pv.unique_visitors > 0 
            THEN ROUND((ps.paid_sales::numeric / pv.unique_visitors::numeric) * 100, 2)
            ELSE 0 
        END as conversion_rate,
        CASE 
            WHEN ps.paid_sales > 0 
            THEN ROUND(ps.paid_revenue / ps.paid_sales, 2)
            ELSE 0 
        END as average_order_value
    FROM period_visits pv, period_sales ps;
END;
$$;

-- =============================================
-- TESTE: Verificar vendas de ontem (28/01/2026)
-- =============================================
-- Ontem no Brasil = 28/01/2026 00:00 até 28/01/2026 23:59
-- Em UTC = 28/01/2026 03:00 até 29/01/2026 02:59

SELECT 'Vendas de ONTEM (28/01/2026 no Brasil):' as periodo;
SELECT * FROM get_analytics_period(
    '2026-01-28T03:00:00.000Z'::timestamptz,
    '2026-01-29T02:59:59.999Z'::timestamptz
);

-- Verificar detalhes das vendas de ontem
SELECT 
    id,
    customer_name,
    total_amount,
    order_status,
    created_at,
    created_at AT TIME ZONE 'America/Sao_Paulo' as created_at_brasil
FROM public.sales
WHERE created_at >= '2026-01-28T03:00:00.000Z'::timestamptz 
  AND created_at <= '2026-01-29T02:59:59.999Z'::timestamptz
ORDER BY created_at DESC;

-- =============================================
-- TESTE: Verificar vendas de hoje (29/01/2026)
-- =============================================
SELECT 'Vendas de HOJE (29/01/2026 no Brasil):' as periodo;
SELECT * FROM get_analytics_period(
    '2026-01-29T03:00:00.000Z'::timestamptz,
    NOW()
);
