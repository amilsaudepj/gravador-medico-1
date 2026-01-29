-- =====================================================
-- INVESTIGAÇÃO: Por que não há dados?
-- =====================================================

-- 1️⃣ VERIFICAR SE ESSES EMAILS EXISTEM EM CHECKOUT_ATTEMPTS
SELECT 
    '📋 CHECKOUT_ATTEMPTS' as tabela,
    customer_email,
    customer_phone,
    customer_cpf,
    customer_name,
    status,
    created_at
FROM checkout_attempts
WHERE customer_email IN (
    'gabriel_acardoso@hotmail.com',
    'gacardosorj@gmail.com',
    'carol.lucas20@hotmail.com'
)
ORDER BY created_at DESC;

-- 2️⃣ VERIFICAR SE HÁ QUALQUER VARIAÇÃO DESSES EMAILS
SELECT 
    '🔍 EMAILS SIMILARES' as tipo,
    customer_email,
    customer_phone,
    customer_cpf
FROM checkout_attempts
WHERE customer_email ILIKE '%gabriel%acardoso%'
    OR customer_email ILIKE '%gacardoso%'
    OR customer_email ILIKE '%carol%lucas%'
ORDER BY created_at DESC;

-- 3️⃣ VER TODOS OS CHECKOUTS QUE TÊM PHONE/CPF
SELECT 
    '📞 TODOS COM DADOS' as tipo,
    customer_email,
    customer_phone,
    customer_cpf,
    created_at
FROM checkout_attempts
WHERE customer_phone IS NOT NULL 
    OR customer_cpf IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- 4️⃣ CONTAR TOTAL DE CHECKOUTS VS COM DADOS
SELECT 
    '📊 ESTATÍSTICAS' as tipo,
    COUNT(*) as total_checkouts,
    COUNT(*) FILTER (WHERE customer_phone IS NOT NULL AND customer_phone != '') as com_phone,
    COUNT(*) FILTER (WHERE customer_cpf IS NOT NULL AND customer_cpf != '') as com_cpf,
    COUNT(*) FILTER (WHERE customer_phone IS NULL AND customer_cpf IS NULL) as sem_nenhum_dado
FROM checkout_attempts;

-- 5️⃣ VER OS DADOS EM SALES DESSES CLIENTES
SELECT 
    '💰 SALES' as tabela,
    id,
    customer_email,
    customer_name,
    customer_phone,
    customer_cpf,
    appmax_order_id,
    status,
    created_at
FROM sales
WHERE customer_email IN (
    'gabriel_acardoso@hotmail.com',
    'gacardosorj@gmail.com',
    'carol.lucas20@hotmail.com'
)
ORDER BY created_at DESC;
