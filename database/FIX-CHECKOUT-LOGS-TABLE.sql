-- =============================================
-- FIX: Recriar tabela checkout_logs
-- =============================================
-- Remove a tabela antiga e recria com estrutura correta
-- =============================================

-- 1. Dropar policies e tabela antiga
DROP POLICY IF EXISTS "Service can insert logs" ON checkout_logs;
DROP POLICY IF EXISTS "Admin can read logs" ON checkout_logs;
DROP TABLE IF EXISTS public.checkout_logs CASCADE;

-- 2. Recriar tabela com estrutura correta
CREATE TABLE public.checkout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  session_id TEXT,
  order_id TEXT,
  
  -- Gateway e Status
  gateway TEXT NOT NULL, -- 'mercadopago', 'appmax'
  status TEXT NOT NULL,  -- 'SUCCESS', 'ERROR', 'FALLBACK'
  
  -- Dados enviados
  payload_sent JSONB,
  
  -- Resposta recebida
  response_data JSONB,
  error_response JSONB,
  error_message TEXT,
  error_cause TEXT,
  
  -- HTTP Status
  http_status INTEGER,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Criar índices para performance
CREATE INDEX idx_checkout_logs_session_id ON checkout_logs(session_id);
CREATE INDEX idx_checkout_logs_order_id ON checkout_logs(order_id);
CREATE INDEX idx_checkout_logs_gateway ON checkout_logs(gateway);
CREATE INDEX idx_checkout_logs_status ON checkout_logs(status);
CREATE INDEX idx_checkout_logs_created_at ON checkout_logs(created_at DESC);

-- 4. RLS: Apenas admin pode ler logs
ALTER TABLE public.checkout_logs ENABLE ROW LEVEL SECURITY;

-- Service role pode inserir (API interna)
CREATE POLICY "Service can insert logs" 
  ON checkout_logs 
  FOR INSERT 
  WITH CHECK (true);

-- Admin pode ler todos os logs
CREATE POLICY "Admin can read logs" 
  ON checkout_logs 
  FOR SELECT 
  USING (true);

-- 5. Comentários
COMMENT ON TABLE checkout_logs IS 'Logs detalhados de tentativas de pagamento para debug';
COMMENT ON COLUMN checkout_logs.payload_sent IS 'Payload JSON enviado para o gateway';
COMMENT ON COLUMN checkout_logs.error_response IS 'Resposta de erro completa do gateway';

-- 6. Verificar estrutura final
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'checkout_logs'
ORDER BY ordinal_position;
