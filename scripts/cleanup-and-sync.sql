-- 1. REMOVER DADOS DE TESTE
DELETE FROM sales WHERE appmax_order_id LIKE 'TEST-%';

-- 2. Verificar vendas reais restantes
SELECT 
  appmax_order_id,
  customer_name,
  customer_email,
  total_amount,
  status,
  payment_method,
  created_at
FROM sales 
ORDER BY created_at DESC;
