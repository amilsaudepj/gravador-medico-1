-- ================================================================
-- Adicionar campos de status online/offline na tabela users
-- ================================================================

-- Adicionar coluna de status online
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- Adicionar coluna de última atividade
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_users_online_status 
  ON users(is_online, last_seen_at DESC);

-- Comentários
COMMENT ON COLUMN users.is_online IS 'Indica se o usuário está online no momento';
COMMENT ON COLUMN users.last_seen_at IS 'Última vez que o usuário foi visto online';
