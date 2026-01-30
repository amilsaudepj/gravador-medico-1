-- =====================================================
-- CRIAR TABELA: provisioning_queue
-- =====================================================
-- Fila de provisionamento de usuários no Lovable
-- Gerencia criação de contas após aprovação de pagamento
-- =====================================================

CREATE TABLE IF NOT EXISTS provisioning_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Referência à venda
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Dados do cliente (desnormalizados para processamento)
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  
  -- Status do provisionamento
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Credenciais Lovable (após sucesso)
  lovable_user_id TEXT,
  lovable_password TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Índices
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_provisioning_queue_status ON provisioning_queue(status);
CREATE INDEX IF NOT EXISTS idx_provisioning_queue_customer_email ON provisioning_queue(customer_email);
CREATE INDEX IF NOT EXISTS idx_provisioning_queue_created_at ON provisioning_queue(created_at);

-- Comentários
COMMENT ON TABLE provisioning_queue IS 'Fila de provisionamento automático de usuários Lovable';
COMMENT ON COLUMN provisioning_queue.sale_id IS 'ID da venda que originou a solicitação';
COMMENT ON COLUMN provisioning_queue.status IS 'Status: pending (aguardando), processing (processando), completed (sucesso), failed (erro)';
COMMENT ON COLUMN provisioning_queue.lovable_user_id IS 'ID do usuário criado no Lovable (após sucesso)';
COMMENT ON COLUMN provisioning_queue.lovable_password IS 'Senha gerada para o usuário';

-- Verificar criação
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'provisioning_queue'
ORDER BY ordinal_position;
