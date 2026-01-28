-- =====================================================
-- MIGRAÇÃO: Lógica correta de carrinhos abandonados
-- =====================================================
-- Descrição: 
-- 1. Cliente preenche dados → status = 'pending'
-- 2. Cliente COMPRA → registro é DELETADO (não é abandonado!)
-- 3. Após 5 minutos sem comprar → cron marca como 'abandoned'
-- =====================================================

-- 1. Dropar a constraint antiga
ALTER TABLE abandoned_carts DROP CONSTRAINT IF EXISTS abandoned_carts_status_check;

-- 2. Adicionar nova constraint com 'pending'
ALTER TABLE abandoned_carts ADD CONSTRAINT abandoned_carts_status_check 
CHECK (status IN ('pending', 'abandoned', 'recovered', 'expired'));

-- 3. Atualizar registros antigos para 'abandoned' (já são abandonados)
UPDATE abandoned_carts 
SET status = 'abandoned' 
WHERE status IS NULL OR status = '';

-- =====================================================
-- FUNÇÃO: Marcar pending como abandoned após 5 minutos
-- =====================================================
CREATE OR REPLACE FUNCTION mark_abandoned_carts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Marca como 'abandoned' os carrinhos 'pending' com mais de 5 minutos
  UPDATE abandoned_carts
  SET 
    status = 'abandoned',
    updated_at = NOW()
  WHERE 
    status = 'pending'
    AND created_at < NOW() - INTERVAL '5 minutes';
    
  -- Log opcional
  RAISE NOTICE 'Carrinhos marcados como abandonados: %', (
    SELECT COUNT(*) FROM abandoned_carts 
    WHERE status = 'abandoned' 
    AND updated_at > NOW() - INTERVAL '1 minute'
  );
END;
$$;

-- =====================================================
-- CRON JOB: Executar a cada 5 minutos
-- =====================================================
-- Para ativar o cron, execute no Supabase SQL Editor:
-- 
-- SELECT cron.schedule(
--   'mark-abandoned-carts',     -- nome do job
--   '*/5 * * * *',              -- a cada 5 minutos
--   $$ SELECT mark_abandoned_carts(); $$
-- );
--
-- Para verificar jobs ativos:
-- SELECT * FROM cron.job;
--
-- Para desativar:
-- SELECT cron.unschedule('mark-abandoned-carts');

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Para testar manualmente:
-- SELECT mark_abandoned_carts();
--
-- Para ver carrinhos pending antigos:
-- SELECT * FROM abandoned_carts 
-- WHERE status = 'pending' 
-- AND created_at < NOW() - INTERVAL '5 minutes';
