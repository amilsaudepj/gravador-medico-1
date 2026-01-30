-- ==========================================
-- 💾 AUTO-SAVE DE CHECKOUT (DRAFT MODE)
-- ==========================================
-- 
-- OBJETIVO: Adicionar campos necessários para salvar
-- rascunhos do checkout enquanto o usuário preenche
--
-- TABELA: abandoned_carts
-- NOVOS CAMPOS: session_id, status, metadata
--
-- Execute este SQL no Supabase SQL Editor
-- ==========================================

-- 1️⃣ Adicionar coluna session_id (ID único do navegador)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'abandoned_carts' 
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE abandoned_carts 
    ADD COLUMN session_id TEXT;
    
    RAISE NOTICE '✅ Coluna session_id adicionada';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna session_id já existe';
  END IF;
END $$;

-- 2️⃣ Adicionar coluna status (draft/abandoned/converted)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'abandoned_carts' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE abandoned_carts 
    ADD COLUMN status TEXT DEFAULT 'abandoned';
    
    RAISE NOTICE '✅ Coluna status adicionada';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna status já existe';
  END IF;
END $$;

-- 3️⃣ Adicionar coluna metadata (JSONB para dados extras)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'abandoned_carts' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE abandoned_carts 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE '✅ Coluna metadata adicionada';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna metadata já existe';
  END IF;
END $$;

-- 4️⃣ Adicionar campos de endereço completo
DO $$ 
BEGIN
  -- customer_address
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'abandoned_carts' 
    AND column_name = 'customer_address'
  ) THEN
    ALTER TABLE abandoned_carts 
    ADD COLUMN customer_address TEXT;
  END IF;

  -- customer_city
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'abandoned_carts' 
    AND column_name = 'customer_city'
  ) THEN
    ALTER TABLE abandoned_carts 
    ADD COLUMN customer_city TEXT;
  END IF;

  -- customer_state
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'abandoned_carts' 
    AND column_name = 'customer_state'
  ) THEN
    ALTER TABLE abandoned_carts 
    ADD COLUMN customer_state TEXT;
  END IF;

  -- customer_zip
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'abandoned_carts' 
    AND column_name = 'customer_zip'
  ) THEN
    ALTER TABLE abandoned_carts 
    ADD COLUMN customer_zip TEXT;
  END IF;

  RAISE NOTICE '✅ Campos de endereço verificados/adicionados';
END $$;

-- 5️⃣ Adicionar payment_method
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'abandoned_carts' 
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE abandoned_carts 
    ADD COLUMN payment_method TEXT;
    
    RAISE NOTICE '✅ Coluna payment_method adicionada';
  ELSE
    RAISE NOTICE 'ℹ️ Coluna payment_method já existe';
  END IF;
END $$;

-- 6️⃣ Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_session_id 
ON abandoned_carts(session_id);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_status 
ON abandoned_carts(status);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_customer_email_status 
ON abandoned_carts(customer_email, status);

-- 7️⃣ Adicionar constraint UNIQUE em session_id (apenas 1 draft por sessão)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_session_id_draft'
  ) THEN
    ALTER TABLE abandoned_carts 
    ADD CONSTRAINT unique_session_id_draft 
    UNIQUE (session_id) 
    WHERE status = 'draft';
    
    RAISE NOTICE '✅ Constraint unique_session_id_draft adicionada';
  ELSE
    RAISE NOTICE 'ℹ️ Constraint unique_session_id_draft já existe';
  END IF;
END $$;

-- ==========================================
-- ✅ SCHEMA ATUALIZADO COM SUCESSO!
-- ==========================================
--
-- Campos adicionados:
-- - session_id (TEXT) - ID único do navegador
-- - status (TEXT) - draft/abandoned/converted
-- - metadata (JSONB) - Dados extras (UTM, timestamps, etc)
-- - customer_address (TEXT)
-- - customer_city (TEXT)
-- - customer_state (TEXT)
-- - customer_zip (TEXT)
-- - payment_method (TEXT)
--
-- Índices criados para busca rápida por session_id e status
-- Constraint UNIQUE garante 1 draft por sessão
-- ==========================================

-- 8️⃣ Verificar estrutura final
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'abandoned_carts'
ORDER BY ordinal_position;
