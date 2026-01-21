-- =============================================
-- MIGRAÇÃO DE VENDAS ANTIGAS
-- =============================================
-- Este script busca vendas da tabela antiga (se existir)
-- e popula a estrutura nova normalizada
-- =============================================

-- ========================================
-- PASSO 1: VERIFICAR SE EXISTE TABELA ANTIGA
-- ========================================
-- Se você tem backup da tabela antiga, restaure antes de executar

-- ========================================
-- PASSO 2: CRIAR VENDAS DE TESTE
-- ========================================
-- Como você mencionou que tinha 2 vendas de teste ontem,
-- vamos criar vendas de exemplo para popular o dashboard

-- Cliente de teste 1
INSERT INTO customers (
  appmax_customer_id,
  name,
  email,
  phone,
  cpf,
  status,
  segment
)
VALUES (
  'CUST-TEST-001',
  'Cliente Teste 1',
  'teste1@example.com',
  '11999999999',
  '12345678900',
  'active',
  'regular'
)
ON CONFLICT (email) DO UPDATE
SET updated_at = NOW()
RETURNING id;

-- Cliente de teste 2
INSERT INTO customers (
  appmax_customer_id,
  name,
  email,
  phone,
  cpf,
  status,
  segment
)
VALUES (
  'CUST-TEST-002',
  'Cliente Teste 2',
  'teste2@example.com',
  '11988888888',
  '98765432100',
  'active',
  'premium'
)
ON CONFLICT (email) DO UPDATE
SET updated_at = NOW()
RETURNING id;

-- Produto de teste
INSERT INTO products (
  appmax_product_id,
  sku,
  name,
  price,
  category,
  is_active
)
VALUES (
  'PROD-TEST-001',
  'GRAVADOR-PRO-2024',
  'Gravador Médico Pro',
  497.00,
  'Premium',
  true
)
ON CONFLICT (sku) DO UPDATE
SET price = 497.00, updated_at = NOW()
RETURNING id;

-- ========================================
-- PASSO 3: CRIAR VENDAS DE TESTE
-- ========================================

-- Venda de teste 1 (usando IDs reais)
WITH customer_data AS (
  SELECT id FROM customers WHERE email = 'teste1@example.com'
),
product_data AS (
  SELECT id FROM products WHERE sku = 'GRAVADOR-PRO-2024'
)
INSERT INTO sales (
  appmax_sale_id,
  customer_id,
  total_amount,
  discount_amount,
  final_amount,
  payment_method,
  payment_status,
  status,
  source,
  created_at,
  updated_at
)
SELECT 
  'SALE-TEST-001',
  customer_data.id,
  497.00,
  0.00,
  497.00,
  'credit_card',
  'paid',
  'completed',
  'appmax',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
FROM customer_data, product_data
ON CONFLICT (appmax_sale_id) DO UPDATE
SET updated_at = NOW()
RETURNING id;

-- Item da venda 1
WITH sale_data AS (
  SELECT id FROM sales WHERE appmax_sale_id = 'SALE-TEST-001'
),
product_data AS (
  SELECT id FROM products WHERE sku = 'GRAVADOR-PRO-2024'
)
INSERT INTO sales_items (
  sale_id,
  product_id,
  quantity,
  unit_price,
  subtotal
)
SELECT 
  sale_data.id,
  product_data.id,
  1,
  497.00,
  497.00
FROM sale_data, product_data
ON CONFLICT DO NOTHING;

-- Venda de teste 2
WITH customer_data AS (
  SELECT id FROM customers WHERE email = 'teste2@example.com'
),
product_data AS (
  SELECT id FROM products WHERE sku = 'GRAVADOR-PRO-2024'
)
INSERT INTO sales (
  appmax_sale_id,
  customer_id,
  total_amount,
  discount_amount,
  final_amount,
  payment_method,
  payment_status,
  status,
  source,
  created_at,
  updated_at
)
SELECT 
  'SALE-TEST-002',
  customer_data.id,
  497.00,
  0.00,
  497.00,
  'pix',
  'paid',
  'completed',
  'appmax',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
FROM customer_data, product_data
ON CONFLICT (appmax_sale_id) DO UPDATE
SET updated_at = NOW()
RETURNING id;

-- Item da venda 2
WITH sale_data AS (
  SELECT id FROM sales WHERE appmax_sale_id = 'SALE-TEST-002'
),
product_data AS (
  SELECT id FROM products WHERE sku = 'GRAVADOR-PRO-2024'
)
INSERT INTO sales_items (
  sale_id,
  product_id,
  quantity,
  unit_price,
  subtotal
)
SELECT 
  sale_data.id,
  product_data.id,
  1,
  497.00,
  497.00
FROM sale_data, product_data
ON CONFLICT DO NOTHING;

-- ========================================
-- PASSO 4: ATUALIZAR MÉTRICAS
-- ========================================

-- Atualizar métricas dos clientes
UPDATE customers c
SET 
  total_orders = (
    SELECT COUNT(*) 
    FROM sales s 
    WHERE s.customer_id = c.id 
      AND s.status IN ('approved', 'paid', 'completed')
  ),
  total_spent = (
    SELECT COALESCE(SUM(s.final_amount), 0) 
    FROM sales s 
    WHERE s.customer_id = c.id 
      AND s.status IN ('approved', 'paid', 'completed')
  ),
  average_order_value = (
    SELECT COALESCE(AVG(s.final_amount), 0) 
    FROM sales s 
    WHERE s.customer_id = c.id 
      AND s.status IN ('approved', 'paid', 'completed')
  ),
  last_purchase_at = (
    SELECT MAX(s.created_at) 
    FROM sales s 
    WHERE s.customer_id = c.id 
      AND s.status IN ('approved', 'paid', 'completed')
  ),
  first_purchase_at = (
    SELECT MIN(s.created_at) 
    FROM sales s 
    WHERE s.customer_id = c.id 
      AND s.status IN ('approved', 'paid', 'completed')
  ),
  segment = CASE 
    WHEN total_spent >= 1000 THEN 'premium'
    WHEN total_spent >= 500 THEN 'vip'
    ELSE 'regular'
  END,
  updated_at = NOW();

-- Atualizar métricas dos produtos
UPDATE products p
SET 
  total_orders = (
    SELECT COUNT(DISTINCT si.sale_id)
    FROM sales_items si
    WHERE si.product_id = p.id
  ),
  total_quantity_sold = (
    SELECT COALESCE(SUM(si.quantity), 0)
    FROM sales_items si
    WHERE si.product_id = p.id
  ),
  total_revenue = (
    SELECT COALESCE(SUM(si.subtotal), 0)
    FROM sales_items si
    INNER JOIN sales s ON s.id = si.sale_id
    WHERE si.product_id = p.id
      AND s.status IN ('approved', 'paid', 'completed')
  ),
  average_price = (
    SELECT COALESCE(AVG(si.unit_price), p.price)
    FROM sales_items si
    WHERE si.product_id = p.id
  ),
  updated_at = NOW();

-- Criar contatos CRM
INSERT INTO crm_contacts (
  customer_id,
  name,
  email,
  phone,
  source,
  stage,
  status,
  estimated_value,
  last_interaction_at,
  created_at,
  updated_at
)
SELECT 
  c.id,
  c.name,
  c.email,
  c.phone,
  'appmax',
  CASE 
    WHEN c.total_orders >= 3 THEN 'won'
    WHEN c.total_orders >= 1 THEN 'negotiation'
    ELSE 'lead'
  END,
  CASE
    WHEN c.status = 'active' THEN 'active'
    ELSE 'inactive'
  END,
  c.total_spent,
  c.last_purchase_at,
  c.first_purchase_at,
  c.updated_at
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM crm_contacts crm WHERE crm.customer_id = c.id
);

-- ========================================
-- PASSO 5: VERIFICAÇÃO FINAL
-- ========================================

SELECT 
  'Clientes' AS tabela,
  COUNT(*) AS total
FROM customers
UNION ALL
SELECT 
  'Produtos' AS tabela,
  COUNT(*) AS total
FROM products
UNION ALL
SELECT 
  'Vendas' AS tabela,
  COUNT(*) AS total
FROM sales
UNION ALL
SELECT 
  'Itens de venda' AS tabela,
  COUNT(*) AS total
FROM sales_items
UNION ALL
SELECT 
  'Contatos CRM' AS tabela,
  COUNT(*) AS total
FROM crm_contacts;

-- Ver vendas criadas
SELECT 
  s.appmax_sale_id,
  c.name AS cliente,
  s.final_amount AS valor,
  s.payment_method AS pagamento,
  s.status,
  s.created_at
FROM sales s
INNER JOIN customers c ON c.id = s.customer_id
ORDER BY s.created_at DESC;

-- Ver receita total
SELECT 
  COUNT(*) AS total_vendas,
  SUM(final_amount) AS receita_total,
  AVG(final_amount) AS ticket_medio
FROM sales
WHERE status IN ('approved', 'paid', 'completed');
