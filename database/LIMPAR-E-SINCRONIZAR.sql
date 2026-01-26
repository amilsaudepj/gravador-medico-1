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
-- Primeiro deletar sales_items (itens dos pedidos)
DELETE FROM public.sales_items;

-- Depois deletar sales (pedidos principais)
DELETE FROM public.sales;

-- PASSO 4: Verificar que as tabelas estão vazias
SELECT 
    (SELECT COUNT(*) FROM public.sales) as pedidos_restantes,
    (SELECT COUNT(*) FROM public.sales_items) as itens_restantes;
-- Ambos devem retornar 0

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
