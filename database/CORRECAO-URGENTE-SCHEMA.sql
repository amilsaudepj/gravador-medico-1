-- =====================================================
-- CORREÇÃO URGENTE: Schema Sales + Webhooks Logs
-- Data: 20/01/2026
-- =====================================================
-- Este script corrige a estrutura das tabelas que estão
-- causando erros no webhook e dashboard

-- 1. VERIFICAR estrutura atual da tabela sales
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sales'
ORDER BY ordinal_position;

-- 2. ADICIONAR colunas faltantes na tabela sales
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS appmax_order_id TEXT;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS appmax_customer_id TEXT;

-- Criar índice único para appmax_order_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_appmax_order_id 
  ON public.sales(appmax_order_id);

-- 3. VERIFICAR estrutura da tabela webhooks_logs
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'webhooks_logs'
ORDER BY ordinal_position;

-- 4. ADICIONAR colunas faltantes em webhooks_logs
ALTER TABLE public.webhooks_logs 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.webhooks_logs 
  ADD COLUMN IF NOT EXISTS endpoint TEXT;

ALTER TABLE public.webhooks_logs 
  ADD COLUMN IF NOT EXISTS response_status INTEGER;

ALTER TABLE public.webhooks_logs 
  ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER;

ALTER TABLE public.webhooks_logs 
  ADD COLUMN IF NOT EXISTS error TEXT;

-- Criar índice para created_at
CREATE INDEX IF NOT EXISTS idx_webhooks_logs_created_at 
  ON public.webhooks_logs(created_at DESC);

-- 5. VERIFICAR tabela customers
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- Se customers não existir, criar agora
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  cpf TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- 6. ATUALIZAR customer_id em sales (se existir)
-- Adicionar relacionamento se a coluna já existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'customer_id'
  ) THEN
    -- Remover constraint antiga se existir
    ALTER TABLE public.sales 
      DROP CONSTRAINT IF EXISTS sales_customer_id_fkey;
    
    -- Criar nova constraint
    ALTER TABLE public.sales 
      ADD CONSTRAINT sales_customer_id_fkey 
      FOREIGN KEY (customer_id) 
      REFERENCES public.customers(id) 
      ON DELETE SET NULL;
  ELSE
    -- Adicionar coluna se não existir
    ALTER TABLE public.sales 
      ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 7. VERIFICAR resultado final
SELECT 'sales' as tabela, COUNT(*) as total_colunas
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sales'
UNION ALL
SELECT 'webhooks_logs', COUNT(*)
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'webhooks_logs'
UNION ALL
SELECT 'customers', COUNT(*)
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'customers';

-- ✅ FIM DA CORREÇÃO
