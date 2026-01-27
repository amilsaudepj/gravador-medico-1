-- Adiciona coluna redirect_url na tabela orders para armazenar URL de redirecionamento
-- após pagamento aprovado

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS redirect_url TEXT;

-- Adiciona índice para melhorar performance de busca
CREATE INDEX IF NOT EXISTS idx_orders_redirect_url ON orders(redirect_url) 
WHERE redirect_url IS NOT NULL;

-- Adiciona comentário na coluna
COMMENT ON COLUMN orders.redirect_url IS 'URL de redirecionamento para página de obrigado após pagamento aprovado';
