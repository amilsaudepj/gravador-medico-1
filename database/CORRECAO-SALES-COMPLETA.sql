-- =====================================================
-- CORREÇÃO COMPLETA - SALES SCHEMA
-- Adiciona TODAS as colunas necessárias
-- Data: 20/01/2026
-- =====================================================

-- 1. Adicionar TODAS as colunas que podem estar faltando em sales
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS appmax_order_id TEXT;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS appmax_customer_id TEXT;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS customer_id UUID;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS customer_name TEXT;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS customer_email TEXT;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS customer_cpf TEXT;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2);

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2);

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS utm_source TEXT;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS utm_medium TEXT;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Criar índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_appmax_order_id 
  ON public.sales(appmax_order_id);

CREATE INDEX IF NOT EXISTS idx_sales_status 
  ON public.sales(status);

CREATE INDEX IF NOT EXISTS idx_sales_email 
  ON public.sales(customer_email);

CREATE INDEX IF NOT EXISTS idx_sales_created_at 
  ON public.sales(created_at DESC);

-- 3. Adicionar constraint de customer_id se existir tabela customers
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'customers') THEN
    ALTER TABLE public.sales 
      DROP CONSTRAINT IF EXISTS sales_customer_id_fkey;
    
    ALTER TABLE public.sales 
      ADD CONSTRAINT sales_customer_id_fkey 
      FOREIGN KEY (customer_id) 
      REFERENCES public.customers(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Verificar resultado
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sales'
ORDER BY ordinal_position;

-- ✅ FIM
