-- =====================================================
-- MIGRAÇÃO: Preencher phone/cpf em vendas existentes
-- =====================================================
-- OBJETIVO: Copiar customer_phone e customer_cpf de checkout_attempts
--           para a tabela sales (vendas que já existem mas estão sem dados)
--
-- Data: 29/01/2026
-- =====================================================

-- =====================================================
-- 1. DIAGNÓSTICO: Verificar quantas vendas estão sem dados
-- =====================================================

SELECT 
    '📊 DIAGNÓSTICO' as tipo,
    COUNT(*) as total_vendas,
    COUNT(*) FILTER (WHERE customer_phone IS NULL OR customer_phone = '') as sem_telefone,
    COUNT(*) FILTER (WHERE customer_cpf IS NULL OR customer_cpf = '') as sem_cpf,
    COUNT(*) FILTER (
        WHERE (customer_phone IS NULL OR customer_phone = '')
        AND (customer_cpf IS NULL OR customer_cpf = '')
    ) as sem_ambos
FROM sales
WHERE status IN ('paid', 'provisioning', 'active');

-- =====================================================
-- 2. VERIFICAR DADOS DISPONÍVEIS EM CHECKOUT_ATTEMPTS
-- =====================================================

SELECT 
    '📞 DADOS DISPONÍVEIS' as tipo,
    COUNT(*) as total_checkouts,
    COUNT(*) FILTER (WHERE customer_phone IS NOT NULL AND customer_phone != '') as com_telefone,
    COUNT(*) FILTER (WHERE customer_cpf IS NOT NULL AND customer_cpf != '') as com_cpf
FROM checkout_attempts;

-- =====================================================
-- 3. PREVIEW: Ver quais vendas serão atualizadas
-- =====================================================

WITH updates_preview AS (
    SELECT 
        s.id,
        s.customer_name,
        s.customer_email,
        s.customer_phone as phone_atual,
        ca.customer_phone as phone_novo,
        s.customer_cpf as cpf_atual,
        ca.customer_cpf as cpf_novo,
        s.payment_method,
        s.created_at
    FROM sales s
    LEFT JOIN LATERAL (
        SELECT customer_phone, customer_cpf
        FROM checkout_attempts ca
        WHERE (
            -- Match por AppMax order_id
            (s.appmax_order_id IS NOT NULL AND ca.appmax_order_id = s.appmax_order_id)
            OR
            -- Match por email + valor + data próxima (fallback)
            (
                ca.customer_email = s.customer_email 
                AND ABS(EXTRACT(EPOCH FROM (ca.created_at - s.created_at))) < 600
                AND ABS(ca.total_amount - s.total_amount) < 0.01
            )
        )
        ORDER BY ca.created_at DESC
        LIMIT 1
    ) ca ON true
    WHERE s.status IN ('paid', 'provisioning', 'active')
        AND (s.customer_phone IS NULL OR s.customer_phone = '' OR s.customer_cpf IS NULL OR s.customer_cpf = '')
        AND (ca.customer_phone IS NOT NULL OR ca.customer_cpf IS NOT NULL)
)
SELECT 
    '🔄 PREVIEW UPDATES' as tipo,
    COUNT(*) as total_updates,
    COUNT(*) FILTER (WHERE phone_novo IS NOT NULL) as com_phone,
    COUNT(*) FILTER (WHERE cpf_novo IS NOT NULL) as com_cpf
FROM updates_preview;

-- =====================================================
-- 4. EXECUTAR MIGRAÇÃO (BACKUP AUTOMÁTICO)
-- =====================================================

-- 4.1 Criar tabela de backup (se não existir)
CREATE TABLE IF NOT EXISTS sales_backup_20260129 AS 
SELECT * FROM sales WHERE false;

-- 4.2 Fazer backup das vendas que serão alteradas
INSERT INTO sales_backup_20260129
SELECT s.*
FROM sales s
WHERE s.status IN ('paid', 'provisioning', 'active')
    AND (s.customer_phone IS NULL OR s.customer_phone = '' OR s.customer_cpf IS NULL OR s.customer_cpf = '')
    AND EXISTS (
        SELECT 1 
        FROM checkout_attempts ca
        WHERE (
            (s.appmax_order_id IS NOT NULL AND ca.appmax_order_id = s.appmax_order_id)
            OR (
                ca.customer_email = s.customer_email 
                AND ABS(EXTRACT(EPOCH FROM (ca.created_at - s.created_at))) < 600
                AND ABS(ca.total_amount - s.total_amount) < 0.01
            )
        )
        AND (ca.customer_phone IS NOT NULL OR ca.customer_cpf IS NOT NULL)
    );

SELECT '💾 BACKUP CRIADO' as status, COUNT(*) as registros_backup FROM sales_backup_20260129;

-- 4.3 EXECUTAR UPDATE - Atualizar phone (quando disponível)
WITH matched_data AS (
    SELECT 
        s.id,
        ca.customer_phone,
        ca.customer_cpf
    FROM sales s
    LEFT JOIN LATERAL (
        SELECT customer_phone, customer_cpf
        FROM checkout_attempts ca
        WHERE (
            (s.appmax_order_id IS NOT NULL AND ca.appmax_order_id = s.appmax_order_id)
            OR (
                ca.customer_email = s.customer_email 
                AND ABS(EXTRACT(EPOCH FROM (ca.created_at - s.created_at))) < 600
                AND ABS(ca.total_amount - s.total_amount) < 0.01
            )
        )
        AND ca.customer_phone IS NOT NULL
        AND ca.customer_phone != ''
        ORDER BY ca.created_at DESC
        LIMIT 1
    ) ca ON true
    WHERE s.status IN ('paid', 'provisioning', 'active')
        AND (s.customer_phone IS NULL OR s.customer_phone = '')
        AND ca.customer_phone IS NOT NULL
)
UPDATE sales s
SET 
    customer_phone = md.customer_phone,
    updated_at = NOW()
FROM matched_data md
WHERE s.id = md.id;

-- 4.4 EXECUTAR UPDATE - Atualizar cpf (quando disponível)
WITH matched_data AS (
    SELECT 
        s.id,
        ca.customer_cpf
    FROM sales s
    LEFT JOIN LATERAL (
        SELECT customer_cpf
        FROM checkout_attempts ca
        WHERE (
            (s.appmax_order_id IS NOT NULL AND ca.appmax_order_id = s.appmax_order_id)
            OR (
                ca.customer_email = s.customer_email 
                AND ABS(EXTRACT(EPOCH FROM (ca.created_at - s.created_at))) < 600
                AND ABS(ca.total_amount - s.total_amount) < 0.01
            )
        )
        AND ca.customer_cpf IS NOT NULL
        AND ca.customer_cpf != ''
        ORDER BY ca.created_at DESC
        LIMIT 1
    ) ca ON true
    WHERE s.status IN ('paid', 'provisioning', 'active')
        AND (s.customer_cpf IS NULL OR s.customer_cpf = '')
        AND ca.customer_cpf IS NOT NULL
)
UPDATE sales s
SET 
    customer_cpf = md.customer_cpf,
    updated_at = NOW()
FROM matched_data md
WHERE s.id = md.id;

-- =====================================================
-- 5. VERIFICAR RESULTADO
-- =====================================================

SELECT 
    '✅ RESULTADO' as tipo,
    COUNT(*) as total_vendas,
    COUNT(*) FILTER (WHERE customer_phone IS NOT NULL AND customer_phone != '') as com_telefone,
    COUNT(*) FILTER (WHERE customer_cpf IS NOT NULL AND customer_cpf != '') as com_cpf,
    COUNT(*) FILTER (
        WHERE (customer_phone IS NOT NULL AND customer_phone != '')
        AND (customer_cpf IS NOT NULL AND customer_cpf != '')
    ) as com_ambos
FROM sales
WHERE status IN ('paid', 'provisioning', 'active');

-- =====================================================
-- 6. COMPARAR ANTES E DEPOIS
-- =====================================================

SELECT 
    'ANTES (backup)' as momento,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE customer_phone IS NOT NULL AND customer_phone != '') as com_phone,
    COUNT(*) FILTER (WHERE customer_cpf IS NOT NULL AND customer_cpf != '') as com_cpf
FROM sales_backup_20260129

UNION ALL

SELECT 
    'DEPOIS (atual)' as momento,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE customer_phone IS NOT NULL AND customer_phone != '') as com_phone,
    COUNT(*) FILTER (WHERE customer_cpf IS NOT NULL AND customer_cpf != '') as com_cpf
FROM sales
WHERE id IN (SELECT id FROM sales_backup_20260129);

-- =====================================================
-- 7. EXEMPLO: Ver algumas vendas atualizadas
-- =====================================================

SELECT 
    s.id,
    s.customer_name,
    s.customer_email,
    s.customer_phone,
    s.customer_cpf,
    s.payment_method,
    s.total_amount,
    s.created_at
FROM sales s
WHERE s.id IN (SELECT id FROM sales_backup_20260129)
    AND (s.customer_phone IS NOT NULL OR s.customer_cpf IS NOT NULL)
ORDER BY s.created_at DESC
LIMIT 10;

-- =====================================================
-- ✅ MIGRAÇÃO COMPLETA
-- =====================================================

-- REVERTER (se necessário):
-- UPDATE sales s
-- SET 
--     customer_phone = b.customer_phone,
--     customer_cpf = b.customer_cpf
-- FROM sales_backup_20260129 b
-- WHERE s.id = b.id;

-- LIMPAR BACKUP (após confirmar que está tudo ok):
-- DROP TABLE sales_backup_20260129;
