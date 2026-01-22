-- Verificar e corrigir RLS da tabela sales
-- Execute no SQL Editor do Supabase

-- 1. Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'sales';

-- 2. Ver políticas existentes
SELECT * FROM pg_policies WHERE tablename = 'sales';

-- 3. DESABILITAR RLS temporariamente (para teste)
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;

-- OU (melhor) criar política que permite leitura para todos
DROP POLICY IF EXISTS "Allow public read access to sales" ON sales;
CREATE POLICY "Allow public read access to sales" 
  ON sales FOR SELECT 
  USING (true);

-- 4. Verificar novamente
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'sales';
