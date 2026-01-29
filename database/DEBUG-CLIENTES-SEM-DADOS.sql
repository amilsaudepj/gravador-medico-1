-- =====================================================
-- DEBUG: Investigar por que clientes específicos não têm phone/cpf
-- =====================================================
-- Clientes da imagem:
-- - gabriel_acardoso (gabriel_acardoso@hotmail.com)
-- - gacardosorj (gacardosorj@gmail.com)
-- - carol.lucas20 (carol.lucas20@hotmail.com)
-- =====================================================

-- 1️⃣ VERIFICAR SE ESSES CLIENTES EXISTEM EM SALES
SELECT 
    '🔍 SALES' as origem,
    id,
    customer_name,
    customer_email,
    customer_phone,
    customer_cpf,
    status,
    appmax_order_id,
    created_at
FROM sales
WHERE customer_email IN (
    'gabriel_acardoso@hotmail.com',
    'gacardosorj@gmail.com',
    'carol.lucas20@hotmail.com'
)
ORDER BY created_at DESC;

-- 2️⃣ VERIFICAR SE ESSES CLIENTES TÊM DADOS EM CHECKOUT_ATTEMPTS
SELECT 
    '📋 CHECKOUT_ATTEMPTS' as origem,
    id,
    customer_name,
    customer_email,
    customer_phone,
    customer_cpf,
    status,
    appmax_order_id,
    created_at
FROM checkout_attempts
WHERE customer_email IN (
    'gabriel_acardoso@hotmail.com',
    'gacardosorj@gmail.com',
    'carol.lucas20@hotmail.com'
)
ORDER BY created_at DESC;

-- 3️⃣ TENTAR MATCH MANUAL PARA UM CLIENTE ESPECÍFICO
WITH gabriel_sale AS (
    SELECT *
    FROM sales
    WHERE customer_email = 'gabriel_acardoso@hotmail.com'
    LIMIT 1
)
SELECT 
    '🔗 MATCH TENTATIVA' as tipo,
    'SALE' as fonte,
    s.id,
    s.customer_email,
    s.customer_phone as sale_phone,
    s.customer_cpf as sale_cpf,
    s.appmax_order_id as sale_appmax_id,
    s.created_at as sale_created_at
FROM gabriel_sale s

UNION ALL

SELECT 
    '🔗 MATCH TENTATIVA' as tipo,
    'CHECKOUT' as fonte,
    ca.id,
    ca.customer_email,
    ca.customer_phone as checkout_phone,
    ca.customer_cpf as checkout_cpf,
    ca.appmax_order_id as checkout_appmax_id,
    ca.created_at as checkout_created_at
FROM gabriel_sale s
JOIN checkout_attempts ca ON (
    (s.appmax_order_id IS NOT NULL AND ca.appmax_order_id = s.appmax_order_id)
    OR (
        ca.customer_email = s.customer_email 
        AND ABS(EXTRACT(EPOCH FROM (ca.created_at - s.created_at))) < 600
    )
);

-- 4️⃣ VERIFICAR TODOS OS CHECKOUT_ATTEMPTS COM PHONE/CPF (SAMPLE)
SELECT 
    '📞 DADOS DISPONÍVEIS' as tipo,
    customer_email,
    customer_phone,
    customer_cpf,
    appmax_order_id,
    created_at
FROM checkout_attempts
WHERE customer_phone IS NOT NULL 
    OR customer_cpf IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 5️⃣ CONTAR QUANTOS CHECKOUTS TÊM DADOS
SELECT 
    '📊 ESTATÍSTICAS CHECKOUT' as tipo,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE customer_phone IS NOT NULL AND customer_phone != '') as com_phone,
    COUNT(*) FILTER (WHERE customer_cpf IS NOT NULL AND customer_cpf != '') as com_cpf,
    COUNT(*) FILTER (WHERE appmax_order_id IS NOT NULL AND appmax_order_id != '') as com_appmax_id
FROM checkout_attempts;

-- 6️⃣ VERIFICAR SE HÁ MATCH ENTRE SALES E CHECKOUT_ATTEMPTS
SELECT 
    '🔗 MATCH POR APPMAX_ID' as tipo,
    COUNT(DISTINCT s.id) as vendas_com_match
FROM sales s
INNER JOIN checkout_attempts ca ON ca.appmax_order_id = s.appmax_order_id
WHERE s.appmax_order_id IS NOT NULL
    AND ca.appmax_order_id IS NOT NULL;
