-- ====================================================================
-- ANALYTICS & CARRINHOS ABANDONADOS
-- ====================================================================
-- Este script cria as tabelas necessárias para tracking de:
-- 1. Visitas ao site (Analytics)
-- 2. Carrinhos abandonados (Abandoned Carts)
-- ====================================================================

-- 1. TABELA DE VISITAS (ANALYTICS)
-- Registra cada pageview, origem, UTMs
create table if not exists public.analytics_visits (
  id uuid default gen_random_uuid() primary key,
  page_path text not null,
  referrer text, -- De onde veio (Instagram, Google, direto)
  utm_source text, -- Para rastrear campanhas (ex: instagram)
  utm_medium text, -- Tipo de mídia (ex: social, cpc)
  utm_campaign text, -- Nome da campanha
  utm_content text, -- Variação do anúncio
  utm_term text, -- Palavra-chave (Google Ads)
  user_agent text, -- Navegador/dispositivo
  ip_address text, -- IP do visitante (opcional, LGPD)
  session_id text, -- ID da sessão (para agrupar visitas)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices para performance
create index if not exists idx_analytics_visits_created_at on analytics_visits(created_at desc);
create index if not exists idx_analytics_visits_page_path on analytics_visits(page_path);
create index if not exists idx_analytics_visits_utm_source on analytics_visits(utm_source);
create index if not exists idx_analytics_visits_session_id on analytics_visits(session_id);

-- 2. TABELA DE CARRINHOS ABANDONADOS
-- Salva dados do cliente assim que ele preenche email/telefone
create table if not exists public.abandoned_carts (
  id uuid default gen_random_uuid() primary key,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_cpf text,
  step text default 'form_filled', -- Em que passo parou: form_filled, payment_started, payment_pending
  status text default 'abandoned', -- 'abandoned' (não comprou) ou 'recovered' (comprou depois)
  product_id text, -- ID do produto principal
  order_bumps jsonb, -- Array com bumps selecionados
  discount_code text, -- Cupom que estava usando
  cart_value numeric(10,2), -- Valor total do carrinho
  utm_source text, -- De onde veio
  utm_medium text,
  utm_campaign text,
  session_id text, -- Para rastrear jornada completa
  recovered_at timestamp with time zone, -- Quando recuperou (comprou)
  recovered_order_id text, -- ID do pedido na Appmax (se recuperou)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Índices
create index if not exists idx_abandoned_carts_email on abandoned_carts(customer_email);
create index if not exists idx_abandoned_carts_status on abandoned_carts(status);
create index if not exists idx_abandoned_carts_created_at on abandoned_carts(created_at desc);
create index if not exists idx_abandoned_carts_session_id on abandoned_carts(session_id);

-- 3. ROW LEVEL SECURITY (RLS)
-- Qualquer um pode INSERIR dados (anônimo)
-- Apenas ADMINs podem LER os dados

alter table public.analytics_visits enable row level security;
alter table public.abandoned_carts enable row level security;

-- Policy: Qualquer um pode inserir visitas (tracking anônimo)
create policy "Anon can insert visits" 
  on analytics_visits 
  for insert 
  with check (true);

-- Policy: Qualquer um pode inserir carrinhos
create policy "Anon can insert carts" 
  on abandoned_carts 
  for insert 
  with check (true);

-- Policy: Qualquer um pode atualizar carrinhos (para marcar como recovered)
create policy "Anon can update carts" 
  on abandoned_carts 
  for update 
  using (true);

-- Policy: Apenas admins podem LER visitas
create policy "Admins view all visits" 
  on analytics_visits 
  for select 
  using (
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );

-- Policy: Apenas admins podem LER carrinhos abandonados
create policy "Admins view all carts" 
  on abandoned_carts 
  for select 
  using (
    auth.uid() in (
      select id from public.profiles where role = 'admin'
    )
  );

-- 4. FUNÇÃO PARA ATUALIZAR updated_at AUTOMATICAMENTE
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger para atualizar updated_at em abandoned_carts
drop trigger if exists update_abandoned_carts_updated_at on abandoned_carts;
create trigger update_abandoned_carts_updated_at
  before update on abandoned_carts
  for each row
  execute function update_updated_at_column();

-- 5. VIEWS ÚTEIS PARA O DASHBOARD
-- View: Visitas de hoje
create or replace view analytics_visits_today as
select 
  count(*) as total_visits,
  count(distinct session_id) as unique_sessions,
  count(distinct utm_source) as traffic_sources
from analytics_visits
where created_at >= current_date;

-- View: Carrinhos abandonados hoje
create or replace view abandoned_carts_today as
select 
  count(*) filter (where status = 'abandoned') as abandoned_count,
  count(*) filter (where status = 'recovered') as recovered_count,
  sum(cart_value) filter (where status = 'abandoned') as lost_revenue,
  sum(cart_value) filter (where status = 'recovered') as recovered_revenue
from abandoned_carts
where created_at >= current_date;

-- View: Taxa de conversão (últimos 30 dias)
create or replace view conversion_stats_30d as
select
  (select count(*) from analytics_visits where created_at >= current_date - interval '30 days') as total_visits,
  (select count(*) from sales where status = 'approved' and created_at >= current_date - interval '30 days') as total_sales,
  (select count(*) from abandoned_carts where status = 'abandoned' and created_at >= current_date - interval '30 days') as total_abandoned,
  case 
    when (select count(*) from analytics_visits where created_at >= current_date - interval '30 days') > 0
    then round(
      (select count(*) from sales where status = 'approved' and created_at >= current_date - interval '30 days')::numeric / 
      (select count(*) from analytics_visits where created_at >= current_date - interval '30 days')::numeric * 100, 
      2
    )
    else 0
  end as conversion_rate;

-- ====================================================================
-- PRONTO! Execute este script no SQL Editor do Supabase
-- Depois disso, implemente o tracking no frontend
-- ====================================================================

-- Para verificar se funcionou:
-- select * from analytics_visits limit 10;
-- select * from abandoned_carts limit 10;
-- select * from analytics_visits_today;
-- select * from abandoned_carts_today;
-- select * from conversion_stats_30d;
