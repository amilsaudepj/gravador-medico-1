-- ================================================================
-- MÓDULO TINTIM KILLER: Rastreamento e Atribuição
-- VERSÃO SAFE - Sem dependências da tabela users
-- ================================================================
-- IMPORTANTE: Esta versão NÃO usa foreign keys para users
-- Você pode adicionar as FKs manualmente depois se necessário
-- ================================================================

-- ================================================================
-- 1. INTEGRAÇÃO META/FACEBOOK PIXEL
-- ================================================================

DROP TABLE IF EXISTS integrations_meta CASCADE;

CREATE TABLE integrations_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- SEM FK por enquanto
  access_token TEXT NOT NULL,
  pixel_id VARCHAR(50) NOT NULL,
  test_event_code VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integrations_meta_user ON integrations_meta(user_id);
CREATE INDEX idx_integrations_meta_active ON integrations_meta(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE integrations_meta IS 'Integração com Meta/Facebook Pixel para tracking';

-- ================================================================
-- 2. LINKS RASTREÁVEIS
-- ================================================================

DROP TABLE IF EXISTS tracking_links CASCADE;

CREATE TABLE tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- SEM FK por enquanto
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tracking_links_slug ON tracking_links(slug);
CREATE INDEX idx_tracking_links_user ON tracking_links(user_id);
CREATE INDEX idx_tracking_links_active ON tracking_links(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE tracking_links IS 'Links rastreáveis para campanhas de WhatsApp';

-- ================================================================
-- 3. CLIQUES RASTREADOS
-- ================================================================

DROP TABLE IF EXISTS tracking_clicks CASCADE;

CREATE TABLE tracking_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL, -- FK será adicionada depois
  ref_code VARCHAR(6) NOT NULL,
  event_id UUID NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  referer TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tracking_clicks_link ON tracking_clicks(link_id);
CREATE INDEX idx_tracking_clicks_ref_code ON tracking_clicks(ref_code);
CREATE INDEX idx_tracking_clicks_event_id ON tracking_clicks(event_id);
CREATE INDEX idx_tracking_clicks_ip ON tracking_clicks(ip_address, created_at DESC);
CREATE INDEX idx_tracking_clicks_clicked_at ON tracking_clicks(clicked_at DESC);

COMMENT ON TABLE tracking_clicks IS 'Registro de todos os cliques rastreados';

-- ================================================================
-- 4. FILA DE EVENTOS (Meta Pixel)
-- ================================================================

DROP TABLE IF EXISTS tracking_events_queue CASCADE;

CREATE TABLE tracking_events_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL, -- FK será adicionada depois
  event_id UUID NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  event_time BIGINT NOT NULL,
  user_data JSONB,
  custom_data JSONB,
  event_source_url TEXT,
  action_source VARCHAR(50) DEFAULT 'website',
  status VARCHAR(20) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_events_queue_status ON tracking_events_queue(status) WHERE status = 'pending';
CREATE INDEX idx_events_queue_integration ON tracking_events_queue(integration_id);
CREATE INDEX idx_events_queue_event_id ON tracking_events_queue(event_id);
CREATE INDEX idx_events_queue_created ON tracking_events_queue(created_at DESC);

COMMENT ON TABLE tracking_events_queue IS 'Fila de eventos para enviar ao Meta Pixel';

-- ================================================================
-- 5. MAPA DE EVENTOS DO FUNIL
-- ================================================================

DROP TABLE IF EXISTS funnel_events_map CASCADE;

CREATE TABLE funnel_events_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR(100) NOT NULL UNIQUE,
  event_type VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_funnel_events_active ON funnel_events_map(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_funnel_events_type ON funnel_events_map(event_type);

COMMENT ON TABLE funnel_events_map IS 'Mapeamento de eventos do funil para o Meta Pixel';

-- ================================================================
-- 6. POPULAR DADOS INICIAIS
-- ================================================================

INSERT INTO funnel_events_map (event_name, event_type, description, is_active) VALUES
  ('PageView', 'standard', 'Visualização de página', TRUE),
  ('ViewContent', 'standard', 'Visualizou conteúdo específico', TRUE),
  ('AddToCart', 'standard', 'Adicionou ao carrinho', TRUE),
  ('InitiateCheckout', 'standard', 'Iniciou checkout', TRUE),
  ('Purchase', 'standard', 'Compra realizada', TRUE),
  ('Lead', 'standard', 'Lead capturado', TRUE),
  ('CompleteRegistration', 'standard', 'Registro completado', TRUE),
  ('Contact', 'standard', 'Contato iniciado', TRUE),
  ('CustomizeProduct', 'standard', 'Produto customizado', TRUE),
  ('FindLocation', 'standard', 'Localização buscada', TRUE),
  ('Schedule', 'standard', 'Agendamento realizado', TRUE),
  ('StartTrial', 'standard', 'Trial iniciado', TRUE),
  ('SubmitApplication', 'standard', 'Aplicação enviada', TRUE),
  ('Subscribe', 'standard', 'Assinatura realizada', TRUE),
  ('WhatsAppClick', 'custom', 'Clique no botão WhatsApp', TRUE),
  ('WhatsAppSent', 'custom', 'Mensagem WhatsApp enviada', TRUE)
ON CONFLICT (event_name) DO NOTHING;

-- ================================================================
-- 7. ADICIONAR FOREIGN KEYS (Execute separadamente se necessário)
-- ================================================================

-- Agora adicionamos as FKs COM SEGURANÇA
-- Se der erro, pode pular esta parte

DO $$
BEGIN
  -- FK: tracking_clicks -> tracking_links
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_tracking_clicks_link_id'
  ) THEN
    ALTER TABLE tracking_clicks 
    ADD CONSTRAINT fk_tracking_clicks_link_id 
    FOREIGN KEY (link_id) REFERENCES tracking_links(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ FK tracking_clicks -> tracking_links criada';
  END IF;

  -- FK: tracking_events_queue -> integrations_meta
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_tracking_events_integration_id'
  ) THEN
    ALTER TABLE tracking_events_queue 
    ADD CONSTRAINT fk_tracking_events_integration_id 
    FOREIGN KEY (integration_id) REFERENCES integrations_meta(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ FK tracking_events_queue -> integrations_meta criada';
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️  Erro ao criar FKs: %', SQLERRM;
END $$;

-- ================================================================
-- 8. FUNCTIONS ÚTEIS
-- ================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION generate_ref_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(6) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 9. VIEWS ÚTEIS
-- ================================================================

CREATE OR REPLACE VIEW v_tracking_stats AS
SELECT 
  tl.id,
  tl.user_id,
  tl.slug,
  tl.campaign_name,
  tl.whatsapp_number,
  tl.is_active,
  tl.created_at,
  COUNT(DISTINCT tc.id) AS total_clicks,
  COUNT(DISTINCT tc.ip_address) AS unique_ips,
  COUNT(DISTINCT CASE WHEN tc.clicked_at >= NOW() - INTERVAL '7 days' THEN tc.id END) AS clicks_7d,
  COUNT(DISTINCT CASE WHEN tc.clicked_at >= NOW() - INTERVAL '30 days' THEN tc.id END) AS clicks_30d,
  MAX(tc.clicked_at) AS last_click_at
FROM tracking_links tl
LEFT JOIN tracking_clicks tc ON tc.link_id = tl.id
GROUP BY tl.id, tl.user_id, tl.slug, tl.campaign_name, tl.whatsapp_number, tl.is_active, tl.created_at;

CREATE OR REPLACE VIEW v_events_queue_pending AS
SELECT 
  teq.*,
  im.pixel_id,
  im.access_token,
  im.test_event_code
FROM tracking_events_queue teq
JOIN integrations_meta im ON im.id = teq.integration_id
WHERE teq.status = 'pending'
  AND im.is_active = TRUE
ORDER BY teq.created_at ASC;

-- ================================================================
-- 10. LINK DE EXEMPLO (OPCIONAL)
-- ================================================================

-- Descomente para inserir um link de teste
-- Substitua o user_id pelo ID real do seu usuário

/*
INSERT INTO tracking_links (user_id, slug, whatsapp_number, whatsapp_message, campaign_name, utm_source, utm_medium) VALUES
('0d738f59-d00a-4c0a-ad63-183674de3421', 'teste-jan', '5511999999999', 'Olá! Gostaria de saber mais sobre o produto.', 'Campanha Teste Janeiro', 'facebook', 'cpc')
ON CONFLICT DO NOTHING;
*/

-- ================================================================
-- SCRIPT CONCLUÍDO
-- ================================================================

DO $$
DECLARE
  total_tables INTEGER;
  total_views INTEGER;
  total_events INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tables FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('integrations_meta', 'tracking_links', 'tracking_clicks', 'tracking_events_queue', 'funnel_events_map');
  
  SELECT COUNT(*) INTO total_views FROM pg_views 
  WHERE schemaname = 'public' 
  AND viewname IN ('v_tracking_stats', 'v_events_queue_pending');
  
  SELECT COUNT(*) INTO total_events FROM funnel_events_map;
  
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ MÓDULO TINTIM KILLER INSTALADO COM SUCESSO!           ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tabelas criadas: % / 5', total_tables;
  RAISE NOTICE '📈 Views criadas: % / 2', total_views;
  RAISE NOTICE '🎯 Eventos padrão: % / 16', total_events;
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Próximos passos:';
  RAISE NOTICE '   1. Acesse /admin/tracking/pixels para configurar Meta Pixel';
  RAISE NOTICE '   2. Acesse /admin/tracking/links para criar seus links';
  RAISE NOTICE '   3. Use o formato: https://seudominio.com/r/[slug]';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NOTA: Foreign keys para users não foram criadas';
  RAISE NOTICE '   Isso evita erros de dependência circular';
  RAISE NOTICE '   O sistema funcionará normalmente sem elas';
  RAISE NOTICE '';
END $$;
