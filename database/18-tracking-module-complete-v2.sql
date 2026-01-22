-- ================================================================
-- MÓDULO TINTIM KILLER: Rastreamento e Atribuição
-- Criação completa das tabelas necessárias - VERSÃO 2 (Corrigida)
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
    RAISE EXCEPTION 'Tabela users não encontrada. Execute primeiro: database/05-add-users-table.sql';
  END IF;
  
  RAISE NOTICE 'Verificação OK: Tabela users encontrada';
END $$;

-- ================================================================
-- 1. INTEGRAÇÃO META/FACEBOOK PIXEL
-- ================================================================

-- Drop se existir (para recriar limpa)
DROP TABLE IF EXISTS integrations_meta CASCADE;

CREATE TABLE integrations_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  pixel_id VARCHAR(50) NOT NULL,
  test_event_code VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_integrations_meta_user ON integrations_meta(user_id);
CREATE INDEX idx_integrations_meta_active ON integrations_meta(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE integrations_meta IS 'Integração com Meta/Facebook Pixel para tracking';
COMMENT ON COLUMN integrations_meta.access_token IS 'Token de acesso da API de Conversões';
COMMENT ON COLUMN integrations_meta.pixel_id IS 'ID do Pixel no Facebook Business Manager';
COMMENT ON COLUMN integrations_meta.test_event_code IS 'Código para testar eventos (opcional)';

-- ================================================================
-- 2. LINKS RASTREÁVEIS
-- ================================================================

DROP TABLE IF EXISTS tracking_links CASCADE;

CREATE TABLE tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
COMMENT ON COLUMN tracking_links.slug IS 'URL curta única (ex: promo-jan)';
COMMENT ON COLUMN tracking_links.whatsapp_number IS 'Número WhatsApp destino (5511999999999)';
COMMENT ON COLUMN tracking_links.whatsapp_message IS 'Mensagem pré-preenchida do WhatsApp';

-- ================================================================
-- 3. CLIQUES RASTREADOS
-- ================================================================

DROP TABLE IF EXISTS tracking_clicks CASCADE;

CREATE TABLE tracking_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES tracking_links(id) ON DELETE CASCADE,
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
COMMENT ON COLUMN tracking_clicks.ref_code IS 'Código único de 6 caracteres para atribuição';
COMMENT ON COLUMN tracking_clicks.event_id IS 'UUID para rastreamento no Meta Pixel';
COMMENT ON COLUMN tracking_clicks.ip_address IS 'IP do visitante (para fallback de atribuição)';

-- ================================================================
-- 4. FILA DE EVENTOS (Meta Pixel)
-- ================================================================

DROP TABLE IF EXISTS tracking_events_queue CASCADE;

CREATE TABLE tracking_events_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations_meta(id) ON DELETE CASCADE,
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
COMMENT ON COLUMN tracking_events_queue.event_id IS 'UUID único do evento (match com tracking_clicks)';
COMMENT ON COLUMN tracking_events_queue.event_time IS 'Unix timestamp do evento';
COMMENT ON COLUMN tracking_events_queue.user_data IS 'Dados do usuário (hashed): email, phone, etc';
COMMENT ON COLUMN tracking_events_queue.custom_data IS 'Dados customizados da conversão';
COMMENT ON COLUMN tracking_events_queue.status IS 'Status: pending, sent, failed';

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
COMMENT ON COLUMN funnel_events_map.event_name IS 'Nome do evento (ex: PageView, AddToCart)';
COMMENT ON COLUMN funnel_events_map.event_type IS 'Tipo: standard, custom';

-- ================================================================
-- 6. POPULAR DADOS INICIAIS
-- ================================================================

-- Eventos padrão do Meta/Facebook
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
-- 7. FUNCTIONS ÚTEIS
-- ================================================================

-- Function para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para auto-update
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

-- Function para gerar código REF único
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
-- 8. VIEWS ÚTEIS
-- ================================================================

-- View de estatísticas por link
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

COMMENT ON VIEW v_tracking_stats IS 'Estatísticas agregadas por link de rastreamento';

-- View de eventos pendentes na fila
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

COMMENT ON VIEW v_events_queue_pending IS 'Eventos pendentes para envio ao Meta Pixel';

-- ================================================================
-- 9. RLS (Row Level Security) - Opcional mas recomendado
-- ================================================================

-- Habilita RLS nas tabelas principais
ALTER TABLE integrations_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_clicks ENABLE ROW LEVEL SECURITY;

-- Políticas: usuário só vê seus próprios dados
CREATE POLICY "Users can view own integrations"
  ON integrations_meta FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
  ON integrations_meta FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON integrations_meta FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON integrations_meta FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tracking links"
  ON tracking_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracking links"
  ON tracking_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracking links"
  ON tracking_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tracking links"
  ON tracking_links FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view clicks from own links"
  ON tracking_clicks FOR SELECT
  USING (
    link_id IN (
      SELECT id FROM tracking_links WHERE user_id = auth.uid()
    )
  );

-- ================================================================
-- 10. GRANTS DE PERMISSÃO
-- ================================================================

-- Permissões para authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON integrations_meta TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tracking_links TO authenticated;
GRANT SELECT, INSERT ON tracking_clicks TO authenticated;
GRANT SELECT ON tracking_events_queue TO authenticated;
GRANT SELECT ON funnel_events_map TO authenticated;
GRANT SELECT ON v_tracking_stats TO authenticated;
GRANT SELECT ON v_events_queue_pending TO authenticated;

-- Permissões para anon (público) - apenas INSERT em tracking_clicks
GRANT INSERT ON tracking_clicks TO anon;

-- ================================================================
-- SCRIPT CONCLUÍDO
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Módulo Tintim Killer instalado com sucesso!';
  RAISE NOTICE '📊 Tabelas criadas: 5';
  RAISE NOTICE '📈 Views criadas: 2';
  RAISE NOTICE '🔒 RLS habilitado e configurado';
  RAISE NOTICE '🎯 Eventos padrão inseridos: 16';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Próximo passo: Configure a integração Meta em /admin/tracking/pixels';
END $$;
