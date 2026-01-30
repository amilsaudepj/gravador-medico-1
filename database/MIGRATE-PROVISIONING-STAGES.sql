-- =====================================================
-- MIGRAÇÃO: Adicionar máquina de estados à provisioning_queue
-- =====================================================
-- TAREFA 2: Refatorar a Fila (Provisioning Queue)
-- 
-- Objetivo: Separar o processo em etapas distintas e independentes
-- para que, se um passo falhar, os anteriores já tenham sido executados.
-- =====================================================

-- 1️⃣ Adicionar coluna 'stage' para controle granular de etapas
ALTER TABLE provisioning_queue 
ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'queued';

-- 2️⃣ Adicionar coluna para armazenar email de confirmação enviado
ALTER TABLE provisioning_queue 
ADD COLUMN IF NOT EXISTS confirmation_email_sent BOOLEAN DEFAULT FALSE;

-- 3️⃣ Adicionar coluna para timestamp do email de confirmação
ALTER TABLE provisioning_queue 
ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMP WITH TIME ZONE;

-- 4️⃣ Adicionar constraint para validar stages permitidos
-- Stages da máquina de estados:
--   • queued              → Item adicionado à fila (email de confirmação já enviado pelo webhook)
--   • creating_user       → Tentando criar usuário no Lovable
--   • sending_credentials → Usuário criado, enviando email com credenciais
--   • completed           → Tudo OK, cliente ativo
--   • failed_at_user      → Falha ao criar usuário (retry possível)
--   • failed_at_email     → Falha ao enviar credenciais (retry possível)
--   • failed_permanent    → Esgotou tentativas, precisa intervenção manual

DO $$ 
BEGIN
  -- Remover constraint antiga se existir
  ALTER TABLE provisioning_queue DROP CONSTRAINT IF EXISTS valid_stage;
  
  -- Criar nova constraint com todos os stages
  ALTER TABLE provisioning_queue 
  ADD CONSTRAINT valid_stage CHECK (
    stage IN (
      'queued',
      'creating_user', 
      'sending_credentials', 
      'completed',
      'failed_at_user',
      'failed_at_email',
      'failed_permanent'
    )
  );
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Constraint já existe
END $$;

-- 5️⃣ Criar índice para buscar por stage
CREATE INDEX IF NOT EXISTS idx_provisioning_queue_stage 
ON provisioning_queue(stage);

-- 6️⃣ Migrar dados existentes: items 'pending' → 'queued'
UPDATE provisioning_queue 
SET stage = 'queued' 
WHERE stage IS NULL OR stage = '';

-- 7️⃣ Items com status 'completed' já devem ter stage = 'completed'
UPDATE provisioning_queue 
SET stage = 'completed' 
WHERE status = 'completed' AND (stage IS NULL OR stage = '' OR stage = 'queued');

-- 8️⃣ Items com status 'failed' devem ter stage de falha
UPDATE provisioning_queue 
SET stage = 'failed_at_user' 
WHERE status = 'failed' AND (stage IS NULL OR stage = '' OR stage = 'queued');

-- 9️⃣ Items com status 'processing' estão no meio do processo
UPDATE provisioning_queue 
SET stage = 'creating_user' 
WHERE status = 'processing' AND (stage IS NULL OR stage = '' OR stage = 'queued');

-- Adicionar comentários para documentação
COMMENT ON COLUMN provisioning_queue.stage IS 
  'Máquina de estados: queued → creating_user → sending_credentials → completed (ou failed_at_*)';

COMMENT ON COLUMN provisioning_queue.confirmation_email_sent IS 
  'Se o email de confirmação de compra (fast response) foi enviado';

COMMENT ON COLUMN provisioning_queue.confirmation_email_sent_at IS 
  'Timestamp do envio do email de confirmação';

-- =====================================================
-- VERIFICAÇÃO: Mostrar estrutura atualizada
-- =====================================================
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'provisioning_queue'
ORDER BY ordinal_position;

-- =====================================================
-- DIAGRAMA DA MÁQUINA DE ESTADOS
-- =====================================================
-- 
--  ┌─────────────────────────────────────────────────────┐
--  │            WEBHOOK (MP/AppMax)                      │
--  │  ✅ Pagamento Aprovado                              │
--  │  📧 Envia Email de Confirmação (Fire-and-forget)   │
--  │  📥 Adiciona na fila: stage = 'queued'             │
--  └────────────────────┬────────────────────────────────┘
--                       │
--                       ▼
--  ┌─────────────────────────────────────────────────────┐
--  │            PROVISIONING WORKER                      │
--  │  Passo A: Ler item (stage = 'queued')              │
--  │           Atualizar para: stage = 'creating_user'  │
--  └────────────────────┬────────────────────────────────┘
--                       │
--                       ▼
--  ┌─────────────────────────────────────────────────────┐
--  │            PASSO B: Criar Usuário Lovable          │
--  │  ✅ Sucesso → stage = 'sending_credentials'        │
--  │  ❌ Falha   → stage = 'failed_at_user' + retry     │
--  └────────────────────┬────────────────────────────────┘
--                       │
--                       ▼
--  ┌─────────────────────────────────────────────────────┐
--  │            PASSO C: Enviar Credenciais             │
--  │  ✅ Sucesso → stage = 'completed' 🎉               │
--  │  ❌ Falha   → stage = 'failed_at_email' + retry    │
--  └─────────────────────────────────────────────────────┘
--
-- =====================================================
