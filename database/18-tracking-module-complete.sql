-- ================================================================
-- MÓDULO TINTIM KILLER: Rastreamento e Atribuição
-- Criação completa das tabelas necessárias
-- ================================================================
-- IMPORTANTE: Execute o script 05-add-users-table.sql primeiro
-- se a tabela users ainda não existir
-- ================================================================

-- ================================================================
-- 0. VERIFICAÇÃO DE DEPENDÊNCIAS
-- ================================================================
DO $$ 
BEGIN
  -- Verifica se a tabela users existe
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    RAISE EXCEPTION 'Tabela users não encontrada. Execute primeiro: 05-add-users-table.sql';
  END IF;
END $$;

-- ================================================================
-- 1. INTEGRAÇÃO META/FACEBOOK PIXEL
-- ================================================================
CREATE TABLE IF NOT EXISTS integrations_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  pixel_id VARCHAR(50) NOT NULL,
  test_event_code VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona FK somente se a tabela users existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'integrations_meta_user_id_fkey'
  ) THEN
    ALTER TABLE integrations_meta 
    ADD CONSTRAINT integrations_meta_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_integrations_meta_user ON integrations_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_meta_active ON integrations_meta(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE integrations_meta IS 'Integração com Meta/Facebook Pixel para tracking';
COMMENT ON COLUMN integrations_meta.access_token IS 'Token de acesso da API de Conversões';
COMMENT ON COLUMN integrations_meta.pixel_id IS 'ID do Pixel no Facebook Business Manager';
COMMENT ON COLUMN integrations_meta.test_event_code IS 'Código para testar eventos (opcional)';

-- ================================================================
-- 2. LINKS RASTREÁVEIS
-- ================================================================
CREATE TABLE IF NOT EXISTS tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  destination_url TEXT,
  whatsapp_number VARCHAR(20) NOT NULL,
  whatsapp_message TEXT NOT NULL,
  campaign_name VARCHAR(255),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tracking_links_slug ON tracking_links(slug);
CREATE INDEX IF NOT EXISTS idx_tracking_links_user ON tracking_links(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_active ON tracking_links(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE tracking_links IS 'Links rastreáveis para campanhas de WhatsApp';
COMMENT ON COLUMN tracking_links.slug IS 'URL curta única (ex: promo-jan)';
COMMENT ON COLUMN tracking_links.whatsapp_number IS 'Número WhatsApp destino (5511999999999)';
COMMENT ON COLUMN tracking_links.whatsapp_message IS 'Mensagem pré-preenchida do WhatsApp';

-- ================================================================
-- 3. CLIQUES RASTREADOS
-- ================================================================
CREATE TABLE IF NOT EXISTS tracking_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL,
  ref_code VARCHAR(6) NOT NULL,
  event_id UUID NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  referer TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_link FOREIGN KEY (link_id) REFERENCES tracking_links(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tracking_clicks_link ON tracking_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_tracking_clicks_ref_code ON tracking_clicks(ref_code);
CREATE INDEX IF NOT EXISTS idx_tracking_clicks_event_id ON tracking_clicks(event_id);
CREATE INDEX IF NOT EXISTS idx_tracking_clicks_ip ON tracking_clicks(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_clicks_clicked_at ON tracking_clicks(clicked_at DESC);

COMMENT ON TABLE tracking_clicks IS 'Registro de todos os cliques rastreados';
COMMENT ON COLUMN tracking_clicks.ref_code IS 'Código único de 6 caracteres para atribuição';
COMMENT ON COLUMN tracking_clicks.event_id IS 'UUID para rastreamento no Meta Pixel';
COMMENT ON COLUMN tracking_clicks.ip_address IS 'IP do visitante (para fallback de atribuição)';

-- ================================================================
-- 4. FILA DE EVENTOS (Meta Pixel)
-- ================================================================
CREATE TABLE IF NOT EXISTS tracking_events_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL,
  event_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  user_data JSONB,
  custom_data JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  retry_count INT DEFAULT 0,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_integration FOREIGN KEY (integration_id) REFERENCES integrations_meta(id) ON DELETE CASCADE,
  CONSTRAINT chk_status CHECK (status IN ('pending', 'sent', 'failed')),
  CONSTRAINT chk_event_type CHECK (event_type IN (
    'PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 
    'Purchase', 'Lead', 'Contact', 'CompleteRegistration'
  ))
);

CREATE INDEX IF NOT EXISTS idx_events_queue_integration ON tracking_events_queue(integration_id);
CREATE INDEX IF NOT EXISTS idx_events_queue_status ON tracking_events_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_events_queue_event_id ON tracking_events_queue(event_id);
CREATE INDEX IF NOT EXISTS idx_events_queue_created_at ON tracking_events_queue(created_at DESC);

COMMENT ON TABLE tracking_events_queue IS 'Fila de eventos para envio ao Meta Pixel';
COMMENT ON COLUMN tracking_events_queue.event_type IS 'Tipo de evento do Meta Pixel';
COMMENT ON COLUMN tracking_events_queue.status IS 'pending, sent, failed';
COMMENT ON COLUMN tracking_events_queue.retry_count IS 'Número de tentativas de envio';

-- ================================================================
-- 5. MAPEAMENTO DE FUNIL (Atribuição)
-- ================================================================
CREATE TABLE IF NOT EXISTS funnel_events_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_code VARCHAR(6) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_id UUID NOT NULL,
  remote_jid VARCHAR(100),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  sale_id UUID,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
  CONSTRAINT chk_funnel_event_type CHECK (event_type IN (
    'PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 
    'Purchase', 'Lead', 'Contact', 'CompleteRegistration'
  ))
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_ref_code ON funnel_events_map(ref_code);
CREATE INDEX IF NOT EXISTS idx_funnel_events_event_type ON funnel_events_map(event_type);
CREATE INDEX IF NOT EXISTS idx_funnel_events_sale_id ON funnel_events_map(sale_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_remote_jid ON funnel_events_map(remote_jid);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created_at ON funnel_events_map(created_at DESC);

COMMENT ON TABLE funnel_events_map IS 'Mapeamento completo do funil de conversão';
COMMENT ON COLUMN funnel_events_map.ref_code IS 'Código de rastreamento que originou o evento';
COMMENT ON COLUMN funnel_events_map.remote_jid IS 'WhatsApp JID do cliente';
COMMENT ON COLUMN funnel_events_map.sale_id IS 'Relaciona com venda quando é Purchase';

-- ================================================================
-- 6. TRIGGERS PARA UPDATED_AT
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_integrations_meta_updated_at ON integrations_meta;
CREATE TRIGGER update_integrations_meta_updated_at
  BEFORE UPDATE ON integrations_meta
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tracking_links_updated_at ON tracking_links;
CREATE TRIGGER update_tracking_links_updated_at
  BEFORE UPDATE ON tracking_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tracking_events_queue_updated_at ON tracking_events_queue;
CREATE TRIGGER update_tracking_events_queue_updated_at
  BEFORE UPDATE ON tracking_events_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 7. VIEWS ÚTEIS
-- ================================================================

-- View: Links com estatísticas
CREATE OR REPLACE VIEW tracking_links_with_stats AS
SELECT 
  tl.*,
  COUNT(DISTINCT tc.id) as clicks_count,
  COUNT(DISTINCT CASE WHEN fem.event_type = 'Purchase' THEN fem.id END) as conversions_count,
  MAX(tc.clicked_at) as last_click_at
FROM tracking_links tl
LEFT JOIN tracking_clicks tc ON tc.link_id = tl.id
LEFT JOIN funnel_events_map fem ON fem.ref_code = tc.ref_code
GROUP BY tl.id;

COMMENT ON VIEW tracking_links_with_stats IS 'Links com contadores de cliques e conversões';

-- View: Dashboard de estatísticas por usuário
CREATE OR REPLACE VIEW tracking_user_stats AS
SELECT 
  tl.user_id,
  COUNT(DISTINCT tl.id) as total_links,
  COUNT(DISTINCT CASE WHEN tl.is_active THEN tl.id END) as active_links,
  COUNT(DISTINCT tc.id) as total_clicks,
  COUNT(DISTINCT fem.id) as total_events,
  COUNT(DISTINCT CASE WHEN fem.event_type = 'Purchase' THEN fem.id END) as total_conversions,
  ROUND(
    CASE 
      WHEN COUNT(DISTINCT tc.id) > 0 
      THEN (COUNT(DISTINCT CASE WHEN fem.event_type = 'Purchase' THEN fem.id END)::numeric / COUNT(DISTINCT tc.id)::numeric * 100)
      ELSE 0 
    END, 
    2
  ) as conversion_rate
FROM tracking_links tl
LEFT JOIN tracking_clicks tc ON tc.link_id = tl.id
LEFT JOIN funnel_events_map fem ON fem.ref_code = tc.ref_code
GROUP BY tl.user_id;

COMMENT ON VIEW tracking_user_stats IS 'Estatísticas consolidadas por usuário';

-- ================================================================
-- 8. DADOS DE EXEMPLO (OPCIONAL - APENAS PARA DESENVOLVIMENTO)
-- ================================================================

-- Descomentar para inserir dados de teste
/*
-- Usuário de teste (assumindo que existe id específico)
INSERT INTO integrations_meta (user_id, access_token, pixel_id, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'EAATest123...', '123456789012345', true)
ON CONFLICT DO NOTHING;

-- Link de exemplo
INSERT INTO tracking_links (user_id, slug, whatsapp_number, whatsapp_message, campaign_name, utm_source, utm_medium) VALUES
('00000000-0000-0000-0000-000000000001', 'teste-jan', '5511999999999', 'Olá! Gostaria de saber mais sobre o produto.', 'Campanha Teste Janeiro', 'facebook', 'cpc')
ON CONFLICT DO NOTHING;
*/

-- ================================================================
-- FIM DO SCRIPT
-- ================================================================

SELECT 'Tabelas do módulo Tintim Killer criadas com sucesso!' as status;
