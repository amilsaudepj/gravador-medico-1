-- ================================================================
-- MIGRATION: AUTO-ADICIONAR VISITANTES AO CRM
-- ================================================================
-- Cria tabela de leads do CRM e triggers para popular automaticamente
-- Todo visitante que entrar no site será adicionado ao CRM
-- ================================================================

-- 1. Criar tabela de leads do CRM (se não existir)
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  phone TEXT,
  stage TEXT NOT NULL DEFAULT 'lead', -- lead, contact, qualification, proposal, negotiation, won, lost
  value NUMERIC DEFAULT 0,
  source TEXT, -- Checkout, Analytics, Manual
  notes TEXT,
  last_contact TIMESTAMPTZ,
  next_followup TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  session_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT,
  city TEXT,
  country TEXT
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_email ON crm_leads(email);
CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON crm_leads(stage);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_at ON crm_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_session_id ON crm_leads(session_id);

-- 3. Função para adicionar lead quando visitante entra no checkout
CREATE OR REPLACE FUNCTION auto_add_lead_from_abandoned_cart()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se já existe um lead com este email
  IF NEW.customer_email IS NOT NULL AND NOT EXISTS (SELECT 1 FROM crm_leads WHERE email = NEW.customer_email) THEN
    INSERT INTO crm_leads (
      name,
      email,
      phone,
      stage,
      value,
      source,
      notes,
      session_id,
      utm_source,
      utm_medium,
      utm_campaign,
      created_at
    ) VALUES (
      NEW.customer_name,
      NEW.customer_email,
      NEW.customer_phone,
      'lead',
      NEW.total_amount,
      'Checkout - Carrinho Abandonado',
      'Abandonou carrinho',
      NEW.session_id,
      NEW.utm_source,
      NEW.utm_medium,
      NEW.utm_campaign,
      NEW.created_at
    );
    
    RAISE NOTICE '✅ Lead adicionado ao CRM: %', NEW.customer_email;
  ELSIF NEW.customer_email IS NOT NULL THEN
    -- Atualizar lead existente
    UPDATE crm_leads 
    SET 
      value = NEW.total_amount,
      notes = 'Abandonou carrinho novamente',
      updated_at = NOW()
    WHERE email = NEW.customer_email;
    
    RAISE NOTICE '🔄 Lead atualizado no CRM: %', NEW.customer_email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Função para atualizar lead quando venda é criada
CREATE OR REPLACE FUNCTION auto_update_lead_from_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o cliente já está no CRM, atualizar para "won"
  IF EXISTS (SELECT 1 FROM crm_leads WHERE email = NEW.customer_email) THEN
    UPDATE crm_leads 
    SET 
      stage = 'won',
      value = NEW.total_amount,
      notes = 'Venda concluída! ID: ' || NEW.id,
      updated_at = NOW()
    WHERE email = NEW.customer_email;
    
    RAISE NOTICE '🎉 Lead convertido em venda: %', NEW.customer_email;
  ELSE
    -- Se não existe, criar lead já como "won"
    INSERT INTO crm_leads (
      name,
      email,
      stage,
      value,
      source,
      notes,
      utm_source,
      utm_medium,
      utm_campaign,
      created_at
    ) VALUES (
      NEW.customer_name,
      NEW.customer_email,
      'won',
      NEW.total_amount,
      'Checkout - Venda Direta',
      'Comprou direto sem abandonar carrinho',
      NEW.utm_source,
      NEW.utm_medium,
      NEW.utm_campaign,
      NEW.created_at
    );
    
    RAISE NOTICE '✅ Cliente convertido direto: %', NEW.customer_email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Função para adicionar visitantes interessados (visitaram checkout/pricing)
CREATE OR REPLACE FUNCTION auto_add_lead_from_analytics()
RETURNS TRIGGER AS $$
DECLARE
  visitor_email TEXT;
  visitor_name TEXT;
BEGIN
  -- Verificar se visitou páginas de interesse (checkout, pricing, obrigado)
  IF NEW.page_path LIKE '%checkout%' OR 
     NEW.page_path LIKE '%pricing%' OR 
     NEW.page_path LIKE '%obrigado%' THEN
    
    -- Tentar extrair email de query params (se houver)
    -- Por enquanto, criar lead sem email baseado em session_id
    
    -- Verificar se já existe lead para esta sessão
    IF NOT EXISTS (SELECT 1 FROM crm_leads WHERE session_id = NEW.session_id) THEN
      INSERT INTO crm_leads (
        name,
        stage,
        source,
        notes,
        session_id,
        utm_source,
        utm_medium,
        utm_campaign,
        device_type,
        city,
        country,
        created_at
      ) VALUES (
        'Visitante de ' || COALESCE(NEW.city, 'Localização desconhecida'),
        'lead',
        'Analytics - Visitou ' || NEW.page_path,
        'Demonstrou interesse visitando: ' || NEW.page_path,
        NEW.session_id,
        NEW.utm_source,
        NEW.utm_medium,
        NEW.utm_campaign,
        NEW.device_type,
        NEW.city,
        NEW.country,
        NEW.created_at
      );
      
      RAISE NOTICE '👀 Lead de visitante interessado: %', NEW.session_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar triggers
DROP TRIGGER IF EXISTS trigger_add_lead_from_cart ON abandoned_carts;
CREATE TRIGGER trigger_add_lead_from_cart
  AFTER INSERT ON abandoned_carts
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_lead_from_abandoned_cart();

DROP TRIGGER IF EXISTS trigger_update_lead_from_sale ON sales;
CREATE TRIGGER trigger_update_lead_from_sale
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_lead_from_sale();

DROP TRIGGER IF EXISTS trigger_add_lead_from_analytics ON analytics_visits;
CREATE TRIGGER trigger_add_lead_from_analytics
  AFTER INSERT ON analytics_visits
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_lead_from_analytics();

-- 7. Popular CRM com dados históricos (últimos 90 dias)
INSERT INTO crm_leads (
  name,
  email,
  phone,
  stage,
  value,
  source,
  notes,
  utm_source,
  utm_medium,
  utm_campaign,
  created_at,
  updated_at
)
SELECT DISTINCT ON (customer_email)
  customer_name,
  customer_email,
  NULL as phone, -- sales não tem customer_phone no schema atual
  CASE 
    WHEN status IN ('approved', 'paid') THEN 'won'
    WHEN status = 'pending' THEN 'proposal'
    ELSE 'lost'
  END as stage,
  total_amount,
  'Checkout - Importação Histórica',
  'Importado de vendas antigas',
  sales.utm_source,
  sales.utm_medium,
  sales.utm_campaign,
  sales.created_at,
  sales.updated_at
FROM sales
WHERE sales.created_at >= NOW() - INTERVAL '90 days'
  AND sales.customer_email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.email = sales.customer_email)
ORDER BY customer_email, sales.created_at DESC;

-- 8. Popular com carrinhos abandonados
INSERT INTO crm_leads (
  name,
  email,
  phone,
  stage,
  value,
  source,
  notes,
  session_id,
  utm_source,
  utm_medium,
  utm_campaign,
  created_at,
  updated_at
)
SELECT DISTINCT ON (customer_email)
  customer_name,
  customer_email,
  customer_phone,
  CASE 
    WHEN status = 'recovered' THEN 'won'
    ELSE 'contact'
  END as stage,
  total_amount,
  'Checkout - Carrinho Abandonado',
  'Abandonou carrinho',
  abandoned_carts.session_id,
  abandoned_carts.utm_source,
  abandoned_carts.utm_medium,
  abandoned_carts.utm_campaign,
  abandoned_carts.created_at,
  abandoned_carts.updated_at
FROM abandoned_carts
WHERE abandoned_carts.created_at >= NOW() - INTERVAL '90 days'
  AND abandoned_carts.customer_email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM crm_leads WHERE crm_leads.email = abandoned_carts.customer_email)
ORDER BY customer_email, abandoned_carts.created_at DESC;

-- ================================================================
-- VERIFICAÇÃO
-- ================================================================
SELECT 
  stage,
  COUNT(*) as total,
  SUM(value) as valor_total,
  AVG(value) as valor_medio
FROM crm_leads
GROUP BY stage
ORDER BY 
  CASE stage
    WHEN 'lead' THEN 1
    WHEN 'contact' THEN 2
    WHEN 'qualification' THEN 3
    WHEN 'proposal' THEN 4
    WHEN 'negotiation' THEN 5
    WHEN 'won' THEN 6
    WHEN 'lost' THEN 7
  END;

COMMENT ON TABLE crm_leads IS 'Leads do CRM - Populado automaticamente via triggers de abandoned_carts, sales e analytics_visits';
