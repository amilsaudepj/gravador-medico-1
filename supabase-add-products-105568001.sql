-- Adicionar produtos ao pedido #105568001
-- Execute este SQL no Supabase SQL Editor

-- Primeiro, deletar produtos existentes (se houver)
DELETE FROM public.sales_items 
WHERE sale_id IN (
  SELECT id FROM public.sales WHERE appmax_order_id = '105568001'
);

-- Agora inserir o produto
INSERT INTO public.sales_items (sale_id, product_id, product_name, product_type, price, quantity)
SELECT 
  id as sale_id,
  '32991339' as product_id,
  'Gravador Médico - Acesso Vitalício' as product_name,
  'main' as product_type,
  1.00 as price,
  1 as quantity
FROM public.sales 
WHERE appmax_order_id = '105568001';

-- Verificar se foi adicionado
SELECT 
  si.product_name,
  si.product_type,
  si.price,
  si.quantity,
  s.appmax_order_id
FROM public.sales_items si
JOIN public.sales s ON s.id = si.sale_id
WHERE s.appmax_order_id = '105568001';
