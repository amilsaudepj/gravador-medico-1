-- =====================================================
-- ADICIONAR COLUNAS LOVABLE NA TABELA SALES
-- =====================================================
-- Adiciona campos para armazenar credenciais do Lovable
-- Permite rastrear usuários provisionados
-- =====================================================

-- Adicionar lovable_user_id se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sales' AND column_name='lovable_user_id'
  ) THEN
    ALTER TABLE sales ADD COLUMN lovable_user_id TEXT;
    COMMENT ON COLUMN sales.lovable_user_id IS 'ID do usuário criado no Lovable (UUID)';
  END IF;
END $$;

-- Adicionar lovable_password se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sales' AND column_name='lovable_password'
  ) THEN
    ALTER TABLE sales ADD COLUMN lovable_password TEXT;
    COMMENT ON COLUMN sales.lovable_password IS 'Senha gerada para o usuário no Lovable';
  END IF;
END $$;

-- Criar índice para buscar por lovable_user_id
CREATE INDEX IF NOT EXISTS idx_sales_lovable_user_id 
ON sales(lovable_user_id) 
WHERE lovable_user_id IS NOT NULL;

-- Verificar colunas adicionadas
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sales' 
  AND column_name IN ('lovable_user_id', 'lovable_password')
ORDER BY ordinal_position;
