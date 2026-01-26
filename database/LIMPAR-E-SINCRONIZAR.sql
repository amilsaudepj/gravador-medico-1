-- =====================================================
-- LIMPAR TODOS OS PEDIDOS E PREPARAR PARA SINCRONIZAÇÃO
-- =====================================================
-- Este script deleta todos os pedidos do banco
-- Depois você usará o botão "Sincronizar Pedidos Appmax"
-- para importar os 53 pedidos da Appmax desde 15/01
-- =====================================================

-- PASSO 1: Verificar quantos pedidos existem atualmente
SELECT 
    COUNT(*) as total_pedidos,
    MIN(created_at) as primeiro_pedido,
    MAX(created_at) as ultimo_pedido
FROM public.sales;

-- PASSO 2: Ver distribuição por status
SELECT 
    status,
    COUNT(*) as total
FROM public.sales
GROUP BY status
ORDER BY total DESC;

-- PASSO 3: DELETAR TODOS os pedidos
DELETE FROM public.sales;

-- PASSO 4: Verificar que a tabela está vazia
SELECT COUNT(*) as pedidos_restantes FROM public.sales;
-- Deve retornar 0

-- PASSO 5: Resetar sequência de IDs (opcional, para começar do 1)
-- Isso garante que os novos pedidos terão IDs sequenciais limpos
-- (apenas se a tabela usar SERIAL/IDENTITY, senão ignore)

-- =====================================================
-- PRÓXIMOS PASSOS APÓS EXECUTAR ESTE SCRIPT
-- =====================================================
-- 
-- 1. ✅ Execute este script SQL no Supabase
-- 2. ✅ Aguarde o deploy terminar (2 minutos)
-- 3. ✅ Acesse /admin/dashboard
-- 4. ✅ Clique em "Sincronizar Pedidos Appmax"
-- 5. ✅ Sistema vai importar os 53 pedidos desde 15/01
-- 
-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- ✅ Tabela sales limpa (0 pedidos)
-- ✅ Pronta para receber importação da Appmax
-- ✅ Todos os status corretos (paid, refunded, fraud_analysis, etc)
-- ✅ Todos os cupons registrados
-- ✅ Todas as datas corretas
-- =====================================================
