-- Corrigir o pedido #105568001 para status 'approved'
-- Execute este SQL no Supabase SQL Editor

UPDATE public.sales
SET 
  status = 'approved',
  paid_at = NOW()
WHERE appmax_order_id = '105568001';

-- Verificar se atualizou
SELECT 
  id,
  appmax_order_id,
  customer_email,
  status,
  total_amount,
  paid_at,
  created_at
FROM public.sales
WHERE appmax_order_id = '105568001';
