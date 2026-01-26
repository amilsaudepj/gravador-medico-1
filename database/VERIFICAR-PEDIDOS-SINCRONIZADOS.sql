-- =====================================================
-- VERIFICAR PEDIDOS SINCRONIZADOS
-- =====================================================

-- Ver TODOS os pedidos no banco (ordenados por data)
SELECT 
    appmax_order_id,
    customer_name,
    customer_email,
    status,
    total_amount,
    coupon_code,
    TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as data_pedido,
    TO_CHAR(updated_at, 'DD/MM/YYYY HH24:MI') as atualizado_em
FROM public.sales
ORDER BY created_at DESC;

-- Contar pedidos por dia
SELECT 
    DATE(created_at) as dia,
    COUNT(*) as total_pedidos,
    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as pagos,
    SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as estornados,
    SUM(CASE WHEN status = 'fraud_analysis' THEN 1 ELSE 0 END) as em_analise,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendentes
FROM public.sales
GROUP BY DATE(created_at)
ORDER BY dia DESC;

-- Ver distribuição por status
SELECT 
    status,
    COUNT(*) as total
FROM public.sales
GROUP BY status
ORDER BY total DESC;

-- Total geral
SELECT COUNT(*) as total_pedidos FROM public.sales;
