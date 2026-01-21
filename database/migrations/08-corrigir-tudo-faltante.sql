-- ============================================
-- SCRIPT DEFINITIVO - CORRIGE TODOS OS ERROS
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Criar tabela analytics_visits (FALTANTE - erro mais frequente)
CREATE TABLE IF NOT EXISTS public.analytics_visits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_seen timestamptz DEFAULT now(),
    page_path text,
    referrer text,
    user_agent text,
    is_online boolean DEFAULT false,
    ip_address text,
    country text,
    city text
);

-- 2. Índices para analytics_visits
CREATE INDEX IF NOT EXISTS idx_analytics_visits_session ON public.analytics_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_visits_created ON public.analytics_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_visits_online ON public.analytics_visits(is_online) WHERE is_online = true;

-- 3. RLS para analytics_visits
ALTER TABLE public.analytics_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read analytics_visits" ON public.analytics_visits;
CREATE POLICY "Public read analytics_visits" 
ON public.analytics_visits 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Public insert analytics_visits" ON public.analytics_visits;
CREATE POLICY "Public insert analytics_visits" 
ON public.analytics_visits 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Public update analytics_visits" ON public.analytics_visits;
CREATE POLICY "Public update analytics_visits" 
ON public.analytics_visits 
FOR UPDATE 
USING (true);

-- 4. View de Clientes COM COALESCE para evitar undefined
DROP VIEW IF EXISTS public.customer_sales_summary CASCADE;
CREATE OR REPLACE VIEW public.customer_sales_summary AS
SELECT 
    c.id,
    c.email,
    c.name,
    c.phone,
    c.created_at,
    COALESCE(COUNT(DISTINCT s.id), 0)::int as total_orders,
    COALESCE(SUM(s.total_amount), 0)::numeric as total_spent,
    MAX(s.created_at) as last_purchase,
    MIN(s.created_at) as first_purchase
FROM public.customers c
LEFT JOIN public.sales s ON s.customer_id = c.id AND s.status = 'approved'
GROUP BY c.id, c.email, c.name, c.phone, c.created_at;

-- 5. Tabela abandoned_carts (se não existir)
CREATE TABLE IF NOT EXISTS public.abandoned_carts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    customer_email text,
    customer_name text,
    customer_phone text,
    items jsonb DEFAULT '[]'::jsonb,
    total_amount numeric DEFAULT 0,
    status text DEFAULT 'abandoned' CHECK (status IN ('abandoned', 'recovered', 'expired')),
    recovery_link text,
    session_id text,
    source text,
    utm_campaign text,
    utm_medium text,
    utm_source text
);

-- 6. Adicionar coluna recovery_status em checkout_attempts (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'checkout_attempts' 
        AND column_name = 'recovery_status'
    ) THEN
        ALTER TABLE public.checkout_attempts 
        ADD COLUMN recovery_status text DEFAULT 'pending' 
        CHECK (recovery_status IN ('pending', 'abandoned', 'recovered'));
    END IF;
END $$;

-- 7. RLS para abandoned_carts
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read abandoned_carts" ON public.abandoned_carts;
CREATE POLICY "Public read abandoned_carts" 
ON public.abandoned_carts 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Public insert abandoned_carts" ON public.abandoned_carts;
CREATE POLICY "Public insert abandoned_carts" 
ON public.abandoned_carts 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Public update abandoned_carts" ON public.abandoned_carts;
CREATE POLICY "Public update abandoned_carts" 
ON public.abandoned_carts 
FOR UPDATE 
USING (true);

-- 8. Índices para abandoned_carts
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON public.abandoned_carts(customer_email);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_status ON public.abandoned_carts(status);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_created ON public.abandoned_carts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_session ON public.abandoned_carts(session_id);

-- 9. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_abandoned_carts_updated_at ON public.abandoned_carts;
CREATE TRIGGER update_abandoned_carts_updated_at 
    BEFORE UPDATE ON public.abandoned_carts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_analytics_visits_updated_at ON public.analytics_visits;
CREATE TRIGGER update_analytics_visits_updated_at 
    BEFORE UPDATE ON public.analytics_visits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
-- Execute isso depois para confirmar que tudo foi criado:
SELECT 
    'analytics_visits' as table_name,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_visits') as exists
UNION ALL
SELECT 
    'abandoned_carts',
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'abandoned_carts')
UNION ALL
SELECT 
    'customer_sales_summary (VIEW)',
    EXISTS(SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'customer_sales_summary');
