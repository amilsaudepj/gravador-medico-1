-- ========================================
-- VERIFICAÇÃO: Dados do Mercado Pago
-- ========================================
-- Execute no Supabase SQL Editor para diagnosticar
-- Data: 27/01/2026
-- ========================================

-- 1️⃣ Verificar se as views existem
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'sales_by_gateway',
  'payment_gateway_performance',
  'cascata_analysis',
  'sales_overview'
)
ORDER BY table_name;

-- Resultado esperado: 4 rows (views)
-- Se retornar vazio: VOCÊ NÃO EXECUTOU os SQLs!

-- ========================================

-- 2️⃣ Verificar se a função RPC existe
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_gateway_stats';

-- Resultado esperado: 1 row com tipo FUNCTION
-- Se retornar vazio: VOCÊ NÃO EXECUTOU fix-mercadopago-analytics.sql!

-- ========================================

-- 3️⃣ Verificar tentativas de pagamento do Mercado Pago
SELECT 
  pa.id,
  pa.provider,
  pa.status,
  pa.rejection_code,
  pa.created_at,
  s.customer_email,
  s.customer_name,
  s.total_amount,
  s.order_status
FROM payment_attempts pa
LEFT JOIN sales s ON pa.sale_id = s.id
WHERE pa.provider = 'mercadopago'
ORDER BY pa.created_at DESC
LIMIT 10;

-- Se retornar vazio: Nenhuma tentativa foi registrada!
-- Possíveis causas:
-- A) Ninguém tentou checkout com MP
-- B) Erro no código do checkout
-- C) Tabela payment_attempts não existe

-- ========================================

-- 4️⃣ Verificar vendas do Mercado Pago
SELECT 
  id,
  customer_email,
  customer_name,
  total_amount,
  order_status,
  payment_gateway,
  mercadopago_payment_id,
  created_at
FROM sales
WHERE payment_gateway = 'mercadopago'
ORDER BY created_at DESC
LIMIT 10;

-- Se retornar vazio: Nenhuma venda MP foi finalizada
-- ✅ Normal se ainda não teve vendas pagas pelo MP

-- ========================================

-- 5️⃣ Verificar carrinhos abandonados
SELECT 
  id,
  customer_email,
  customer_name,
  total_amount,
  status,
  created_at
FROM abandoned_carts
ORDER BY created_at DESC
LIMIT 10;

-- Se retornar vazio: Sistema não está criando carrinhos abandonados
-- ❌ PROBLEMA CONFIRMADO - precisa implementar

-- ========================================

-- 6️⃣ Verificar checkout_attempts (todas as tentativas)
SELECT 
  id,
  customer_email,
  customer_name,
  payment_method,
  total_amount,
  sale_id, -- NULL = não completou
  created_at
FROM checkout_attempts
ORDER BY created_at DESC
LIMIT 20;

-- Se sale_id = NULL: Cliente tentou mas não completou
-- Se sale_id tem UUID: Cliente completou (venda criada)

-- ========================================

-- 7️⃣ Verificar vendas do AppMax
SELECT 
  id,
  customer_email,
  customer_name,
  total_amount,
  order_status,
  payment_gateway,
  appmax_order_id,
  created_at
FROM sales
WHERE payment_gateway = 'appmax'
ORDER BY created_at DESC
LIMIT 10;

-- ========================================

-- 8️⃣ Testar função get_analytics_period
SELECT * FROM get_analytics_period(
  NOW() - INTERVAL '7 days',
  NOW()
);

-- Resultado esperado:
-- unique_visitors | total_sales | pending_sales | paid_sales | total_revenue | conversion_rate | average_order_value
-- Se der erro: Função não foi criada (SQL não executado)

-- ========================================

-- 9️⃣ Testar view sales_by_gateway
SELECT * FROM sales_by_gateway;

-- Resultado esperado:
-- payment_gateway | total_sales | successful_sales | total_revenue | avg_ticket | approval_rate
-- mercadopago     | X           | Y                | R$ ZZZ       | R$ AAA     | BB.BB%
-- appmax          | X           | Y                | R$ ZZZ       | R$ AAA     | BB.BB%

-- ========================================

-- 🔟 Verificar índices de performance
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('sales', 'payment_attempts', 'checkout_attempts')
AND indexname LIKE '%gateway%'
ORDER BY tablename, indexname;

-- Resultado esperado:
-- idx_sales_payment_gateway
-- idx_sales_mercadopago_payment_id
-- idx_payment_attempts_provider

-- ========================================

-- 🎯 DIAGNÓSTICO RÁPIDO - Execute este bloco
DO $$
DECLARE
  view_count INT;
  function_count INT;
  mp_attempts INT;
  mp_sales INT;
  abandoned INT;
  appmax_sales INT;
BEGIN
  -- Contar views
  SELECT COUNT(*) INTO view_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('sales_by_gateway', 'cascata_analysis', 'sales_overview');
  
  -- Contar funções
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name IN ('get_gateway_stats', 'get_analytics_period');
  
  -- Contar dados
  SELECT COUNT(*) INTO mp_attempts FROM payment_attempts WHERE provider = 'mercadopago';
  SELECT COUNT(*) INTO mp_sales FROM sales WHERE payment_gateway = 'mercadopago';
  SELECT COUNT(*) INTO abandoned FROM abandoned_carts;
  SELECT COUNT(*) INTO appmax_sales FROM sales WHERE payment_gateway = 'appmax';
  
  -- Resultado
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║   DIAGNÓSTICO DO SISTEMA              ║';
  RAISE NOTICE '╠════════════════════════════════════════╣';
  RAISE NOTICE '║ Views SQL: % / 3                     ║', view_count;
  RAISE NOTICE '║ Funções RPC: % / 2                   ║', function_count;
  RAISE NOTICE '║                                        ║';
  RAISE NOTICE '║ Tentativas MP: %                      ║', mp_attempts;
  RAISE NOTICE '║ Vendas MP: %                          ║', mp_sales;
  RAISE NOTICE '║ Carrinhos Abandonados: %              ║', abandoned;
  RAISE NOTICE '║ Vendas AppMax: %                      ║', appmax_sales;
  RAISE NOTICE '╠════════════════════════════════════════╣';
  
  IF view_count < 3 THEN
    RAISE NOTICE '║ ❌ AÇÃO: Execute fix-mercadopago-analytics.sql ║';
  END IF;
  
  IF function_count < 2 THEN
    RAISE NOTICE '║ ❌ AÇÃO: Execute fix-include-pending-sales.sql ║';
  END IF;
  
  IF mp_attempts = 0 THEN
    RAISE NOTICE '║ ⚠️  AÇÃO: Teste checkout com Mercado Pago     ║';
  END IF;
  
  IF abandoned = 0 THEN
    RAISE NOTICE '║ ⚠️  AÇÃO: Implementar carrinhos abandonados   ║';
  END IF;
  
  RAISE NOTICE '╚════════════════════════════════════════╝';
END $$;

-- ========================================

-- 📊 RESUMO FINAL
-- Execute todas as queries acima e envie os resultados
-- Vou usar para diagnosticar o que está faltando
