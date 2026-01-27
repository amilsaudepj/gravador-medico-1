-- ============================================
-- 🔄 ADICIONAR COLUNA REDIRECT_URL
-- ============================================
-- Adiciona campo para armazenar URL de
-- redirecionamento para página de obrigado
-- ============================================

-- Adicionar coluna redirect_url na tabela orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS redirect_url TEXT;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_orders_redirect_url 
ON orders(redirect_url) 
WHERE redirect_url IS NOT NULL;

-- Comentário da coluna
COMMENT ON COLUMN orders.redirect_url IS 'URL de redirecionamento para página de obrigado após confirmação do pagamento';

-- ============================================
-- ✅ VERIFICAÇÃO
-- ============================================

-- Listar colunas da tabela orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
