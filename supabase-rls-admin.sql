-- RLS: Garantir que Admins possam ver todas as vendas
-- Execute este SQL no Supabase SQL Editor

-- Remove política antiga se existir
DROP POLICY IF EXISTS "Admins can view all sales" ON public.sales;

-- Cria nova política permitindo admins lerem tudo
CREATE POLICY "Admins can view all sales"
ON public.sales
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- Garantir que admins também podem inserir (caso precisem criar manualmente)
DROP POLICY IF EXISTS "Admins can insert sales" ON public.sales;

CREATE POLICY "Admins can insert sales"
ON public.sales
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- Garantir que admins podem atualizar
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;

CREATE POLICY "Admins can update sales"
ON public.sales
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);
