-- =====================================================
-- VERIFICAR ESTRUTURA DA TABELA SALES
-- =====================================================

-- 1. Ver todas as colunas da tabela sales
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'sales'
ORDER BY ordinal_position;

-- 2. Ver sample de dados reais
SELECT 
    id,
    customer_email,
    customer_name,
    status,
    lovable_user_id,
    lovable_password,
    created_at
FROM sales
ORDER BY created_at DESC
LIMIT 5;

-- 3. Verificar valores únicos do campo status
SELECT DISTINCT status, COUNT(*)
FROM sales
GROUP BY status
ORDER BY COUNT(*) DESC;
