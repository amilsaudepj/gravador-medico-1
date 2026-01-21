-- =============================================
-- MIGRAÇÃO: Adicionar colunas faltantes em sales
-- =============================================
-- Executa SOMENTE se a tabela sales já existe
-- Adiciona customer_id e outras colunas necessárias
-- =============================================

-- 1. Adicionar coluna customer_id (FK para customers)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- 2. Adicionar colunas de valores que podem estar faltando
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status TEXT,
ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1;

-- 3. Adicionar colunas de datas
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- 4. Criar índice para customer_id
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);

-- 5. Verificar estrutura final
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales'
ORDER BY ordinal_position;
