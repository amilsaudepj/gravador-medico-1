-- =====================================================
-- DIAGNÓSTICO E CORREÇÃO COMPLETA - CLIENTES ESPECÍFICOS
-- =====================================================
-- Executar no Supabase SQL Editor
-- =====================================================

-- ========================================
-- PARTE 1: DIAGNÓSTICO DOS 3 CLIENTES
-- ========================================

-- 1.1 Ver dados em SALES
SELECT 
    '🔍 SALES - DADOS ATUAIS' as tipo,
    id,
    customer_name,
    customer_email,
    customer_phone,
    customer_cpf,
    status,
    appmax_order_id,
    TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as criado_em
FROM sales
WHERE customer_email IN (
    'gabriel_acardoso@hotmail.com',
    'gacardosorj@gmail.com',
    'carol.lucas20@hotmail.com'
)
ORDER BY created_at DESC;

-- 1.2 Ver dados em CHECKOUT_ATTEMPTS
SELECT 
    '📋 CHECKOUT - DADOS DISPONÍVEIS' as tipo,
    id,
    customer_name,
    customer_email,
    customer_phone,
    customer_cpf,
    appmax_order_id,
    TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as criado_em
FROM checkout_attempts
WHERE customer_email IN (
    'gabriel_acardoso@hotmail.com',
    'gacardosorj@gmail.com',
    'carol.lucas20@hotmail.com'
)
ORDER BY created_at DESC;

-- ========================================
-- PARTE 2: MIGRAÇÃO FORÇADA (ESSES 3 CLIENTES)
-- ========================================

-- 2.1 Atualizar Gabriel
UPDATE sales s
SET 
    customer_phone = ca.customer_phone,
    customer_cpf = ca.customer_cpf,
    updated_at = NOW()
FROM (
    SELECT customer_phone, customer_cpf
    FROM checkout_attempts
    WHERE customer_email = 'gabriel_acardoso@hotmail.com'
    ORDER BY created_at DESC
    LIMIT 1
) ca
WHERE s.customer_email = 'gabriel_acardoso@hotmail.com'
    AND (ca.customer_phone IS NOT NULL OR ca.customer_cpf IS NOT NULL);

-- 2.2 Atualizar Gacardosorj
UPDATE sales s
SET 
    customer_phone = ca.customer_phone,
    customer_cpf = ca.customer_cpf,
    updated_at = NOW()
FROM (
    SELECT customer_phone, customer_cpf
    FROM checkout_attempts
    WHERE customer_email = 'gacardosorj@gmail.com'
    ORDER BY created_at DESC
    LIMIT 1
) ca
WHERE s.customer_email = 'gacardosorj@gmail.com'
    AND (ca.customer_phone IS NOT NULL OR ca.customer_cpf IS NOT NULL);

-- 2.3 Atualizar Carol
UPDATE sales s
SET 
    customer_phone = ca.customer_phone,
    customer_cpf = ca.customer_cpf,
    updated_at = NOW()
FROM (
    SELECT customer_phone, customer_cpf
    FROM checkout_attempts
    WHERE customer_email = 'carol.lucas20@hotmail.com'
    ORDER BY created_at DESC
    LIMIT 1
) ca
WHERE s.customer_email = 'carol.lucas20@hotmail.com'
    AND (ca.customer_phone IS NOT NULL OR ca.customer_cpf IS NOT NULL);

-- ========================================
-- PARTE 3: VERIFICAR RESULTADO
-- ========================================

SELECT 
    '✅ RESULTADO APÓS MIGRAÇÃO' as tipo,
    id,
    customer_name,
    customer_email,
    customer_phone,
    customer_cpf,
    status
FROM sales
WHERE customer_email IN (
    'gabriel_acardoso@hotmail.com',
    'gacardosorj@gmail.com',
    'carol.lucas20@hotmail.com'
)
ORDER BY created_at DESC;

-- ========================================
-- PARTE 4: MIGRAÇÃO GERAL (TODOS OS OUTROS)
-- ========================================

-- Atualizar TODAS as vendas que ainda não têm phone/cpf
WITH matched_data AS (
    SELECT DISTINCT ON (s.id)
        s.id,
        ca.customer_phone,
        ca.customer_cpf
    FROM sales s
    INNER JOIN checkout_attempts ca ON ca.customer_email = s.customer_email
    WHERE s.status IN ('paid', 'provisioning', 'active')
        AND (s.customer_phone IS NULL OR s.customer_cpf IS NULL)
        AND (ca.customer_phone IS NOT NULL OR ca.customer_cpf IS NOT NULL)
    ORDER BY s.id, ca.created_at DESC
)
UPDATE sales s
SET 
    customer_phone = COALESCE(s.customer_phone, md.customer_phone),
    customer_cpf = COALESCE(s.customer_cpf, md.customer_cpf),
    updated_at = NOW()
FROM matched_data md
WHERE s.id = md.id;

-- ========================================
-- PARTE 5: ESTATÍSTICAS FINAIS
-- ========================================

SELECT 
    '📊 ESTATÍSTICAS FINAIS' as tipo,
    COUNT(*) as total_vendas_pagas,
    COUNT(*) FILTER (WHERE customer_phone IS NOT NULL AND customer_phone != '') as com_telefone,
    COUNT(*) FILTER (WHERE customer_cpf IS NOT NULL AND customer_cpf != '') as com_cpf,
    COUNT(*) FILTER (WHERE (customer_phone IS NULL OR customer_phone = '')) as sem_telefone,
    COUNT(*) FILTER (WHERE (customer_cpf IS NULL OR customer_cpf = '')) as sem_cpf
FROM sales
WHERE status IN ('paid', 'provisioning', 'active');
