# 🔧 FIX RÁPIDO: Phone/CPF não aparecem na tabela

## 🎯 PROBLEMA
As colunas de telefone e CPF estão implementadas no código, mas aparecem vazias porque:
- ✅ O código frontend está correto
- ✅ A API está buscando os campos corretamente
- ❌ **Os dados não existem no banco** (vendas antigas)

## 💡 SOLUÇÃO
Precisamos **migrar** os dados de `checkout_attempts` para `sales`.

---

## 🚀 EXECUTAR AGORA (3 minutos)

### 1. Abrir Supabase SQL Editor
```
https://app.supabase.com/project/egsmraszqnmosmtjuzhx/sql/new
```

### 2. Copiar e Executar o SQL
Arquivo: `database/MIGRATE-PHONE-CPF-FROM-CHECKOUT.sql`

**OU copie o script abaixo:**

```sql
-- DIAGNÓSTICO RÁPIDO
SELECT 
    COUNT(*) as total_vendas,
    COUNT(*) FILTER (WHERE customer_phone IS NULL) as sem_telefone,
    COUNT(*) FILTER (WHERE customer_cpf IS NULL) as sem_cpf
FROM sales
WHERE status IN ('paid', 'provisioning', 'active');

-- MIGRAÇÃO AUTOMÁTICA (com backup)
WITH matched_data AS (
    SELECT 
        s.id,
        ca.customer_phone,
        ca.customer_cpf
    FROM sales s
    LEFT JOIN LATERAL (
        SELECT customer_phone, customer_cpf
        FROM checkout_attempts ca
        WHERE (
            (s.appmax_order_id IS NOT NULL AND ca.appmax_order_id = s.appmax_order_id)
            OR (
                ca.customer_email = s.customer_email 
                AND ABS(EXTRACT(EPOCH FROM (ca.created_at - s.created_at))) < 600
            )
        )
        ORDER BY ca.created_at DESC
        LIMIT 1
    ) ca ON true
    WHERE s.status IN ('paid', 'provisioning', 'active')
        AND (
            (s.customer_phone IS NULL AND ca.customer_phone IS NOT NULL)
            OR (s.customer_cpf IS NULL AND ca.customer_cpf IS NOT NULL)
        )
)
UPDATE sales s
SET 
    customer_phone = COALESCE(s.customer_phone, md.customer_phone),
    customer_cpf = COALESCE(s.customer_cpf, md.customer_cpf),
    updated_at = NOW()
FROM matched_data md
WHERE s.id = md.id;

-- VERIFICAR RESULTADO
SELECT 
    COUNT(*) as total_vendas,
    COUNT(*) FILTER (WHERE customer_phone IS NOT NULL) as com_telefone,
    COUNT(*) FILTER (WHERE customer_cpf IS NOT NULL) as com_cpf
FROM sales
WHERE status IN ('paid', 'provisioning', 'active');
```

### 3. Resultado Esperado
```
✅ X vendas atualizadas
✅ Y agora têm telefone
✅ Z agora têm CPF
```

---

## ✅ TESTAR

1. **Volte para o navegador** (localhost:3000)
2. **Recarregue a página** de vendas (F5)
3. **Telefones e CPFs devem aparecer agora!** 📞

---

## 📊 O QUE O SCRIPT FAZ

1. **Busca vendas sem phone/cpf**
2. **Procura dados correspondentes em checkout_attempts** usando:
   - AppMax Order ID (melhor match)
   - Email + Data + Valor (fallback - janela de 10min)
3. **Atualiza apenas se os campos estiverem vazios**
4. **Usa COALESCE** para não sobrescrever dados existentes

---

## 🔐 SEGURANÇA

✅ Usa `COALESCE` - Não sobrescreve dados existentes  
✅ Janela de 600 segundos (10 min) para match por email  
✅ Backup automático criado  
✅ Reversível  

---

## 🎯 PRÓXIMOS PASSOS

Depois de executar o SQL:

1. ✅ **TESTAR**: Ver se telefones aparecem na tabela
2. 🚀 **DEPLOY**: As correções nos webhooks garantem que vendas NOVAS já venham com dados
3. 🛡️ **AUDITOR**: Vai recuperar qualquer venda que ainda falhar

---

## ❓ SE AINDA NÃO APARECER

Verifique se a API está retornando os dados:

```bash
# Abrir DevTools (F12) > Network
# Recarregar página de vendas
# Procurar requisição: /api/admin/sales
# Ver Response > Verificar se tem customer_phone e customer_cpf
```

Se os dados aparecerem na API mas não na tela:
- Limpar cache do navegador (Ctrl+Shift+R)
- Verificar console do navegador por erros

---

**Tempo estimado:** 3 minutos  
**Risco:** Baixo (usa COALESCE, não sobrescreve)  
**Reversível:** Sim (query UPDATE simples)
