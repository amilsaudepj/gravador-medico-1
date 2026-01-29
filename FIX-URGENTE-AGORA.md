# 🚨 FIX URGENTE - Phone/CPF e Resend Email

## 🎯 PROBLEMAS IDENTIFICADOS

### 1. Phone/CPF não aparecem
- ✅ Código frontend correto
- ✅ API buscando corretamente
- ❌ **Dados não migrados do checkout**

### 2. Resend Email com erro 500
- ❌ Query estava usando campo `status` que pode não existir
- ❌ Filtro `.in('status', [...])` causava erro

---

## 🔧 CORREÇÕES APLICADAS

### Fix 1: Resend Email API
**Arquivo:** `app/api/admin/resend-email/route.ts`

**Mudanças:**
- ✅ Removido campo `status` da seleção
- ✅ Removido filtro `.in('status', [...])`
- ✅ Adicionado log de erro detalhado
- ✅ Query mais simples e segura

**Agora busca:**
- Por `saleId` (se fornecido)
- Por `customer_email` (se fornecido)
- SEM filtro de status (mais permissivo)

### Fix 2: Migração Phone/CPF
**Arquivos criados:**
- `database/FIX-CLIENTES-ESPECIFICOS.sql` - Migração completa
- `database/DEBUG-CLIENTES-SEM-DADOS.sql` - Diagnóstico
- `database/VERIFY-SALES-STRUCTURE.sql` - Verificar estrutura

---

## 🚀 EXECUTAR AGORA

### PASSO 1: Migrar Dados (Supabase SQL Editor)

Execute este SQL:

```sql
-- MIGRAÇÃO FORÇADA DOS 3 CLIENTES
UPDATE sales s
SET 
    customer_phone = ca.customer_phone,
    customer_cpf = ca.customer_cpf,
    updated_at = NOW()
FROM (
    SELECT customer_phone, customer_cpf
    FROM checkout_attempts
    WHERE customer_email = 'gabriel_acardoso@hotmail.com'
    ORDER BY created_at DESC
    LIMIT 1
) ca
WHERE s.customer_email = 'gabriel_acardoso@hotmail.com'
    AND (ca.customer_phone IS NOT NULL OR ca.customer_cpf IS NOT NULL);

UPDATE sales s
SET 
    customer_phone = ca.customer_phone,
    customer_cpf = ca.customer_cpf,
    updated_at = NOW()
FROM (
    SELECT customer_phone, customer_cpf
    FROM checkout_attempts
    WHERE customer_email = 'gacardosorj@gmail.com'
    ORDER BY created_at DESC
    LIMIT 1
) ca
WHERE s.customer_email = 'gacardosorj@gmail.com'
    AND (ca.customer_phone IS NOT NULL OR ca.customer_cpf IS NOT NULL);

UPDATE sales s
SET 
    customer_phone = ca.customer_phone,
    customer_cpf = ca.customer_cpf,
    updated_at = NOW()
FROM (
    SELECT customer_phone, customer_cpf
    FROM checkout_attempts
    WHERE customer_email = 'carol.lucas20@hotmail.com'
    ORDER BY created_at DESC
    LIMIT 1
) ca
WHERE s.customer_email = 'carol.lucas20@hotmail.com'
    AND (ca.customer_phone IS NOT NULL OR ca.customer_cpf IS NOT NULL);

-- MIGRAÇÃO GERAL (TODOS OS OUTROS)
WITH matched_data AS (
    SELECT DISTINCT ON (s.id)
        s.id,
        ca.customer_phone,
        ca.customer_cpf
    FROM sales s
    INNER JOIN checkout_attempts ca ON ca.customer_email = s.customer_email
    WHERE (s.customer_phone IS NULL OR s.customer_cpf IS NULL)
        AND (ca.customer_phone IS NOT NULL OR ca.customer_cpf IS NOT NULL)
    ORDER BY s.id, ca.created_at DESC
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
FROM sales;
```

### PASSO 2: Recarregar Página
1. **F5** na página de vendas
2. **Verificar** se telefones/CPFs aparecem

### PASSO 3: Testar Resend Email
1. **Clicar** em "Reenviar Email" em qualquer venda
2. **Verificar** se funciona sem erro 500

---

## 📊 DIAGNÓSTICO (Se ainda não funcionar)

Execute este SQL para investigar:

```sql
-- Ver estrutura da tabela sales
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sales'
ORDER BY ordinal_position;

-- Ver dados dos 3 clientes
SELECT 
    id, customer_email, customer_phone, customer_cpf
FROM sales
WHERE customer_email IN (
    'gabriel_acardoso@hotmail.com',
    'gacardosorj@gmail.com',
    'carol.lucas20@hotmail.com'
);

-- Ver dados no checkout
SELECT 
    customer_email, customer_phone, customer_cpf
FROM checkout_attempts
WHERE customer_email IN (
    'gabriel_acardoso@hotmail.com',
    'gacardosorj@gmail.com',
    'carol.lucas20@hotmail.com'
);
```

---

## ⚠️ SE CHECKOUT_ATTEMPTS NÃO TEM DADOS

Se os clientes NÃO preencheram phone/cpf no checkout:
- ❌ Não há dados para migrar
- 💡 **Solução:** Precisam fazer nova compra ou você adiciona manualmente

**Adicionar manualmente:**
```sql
UPDATE sales
SET 
    customer_phone = '11999887766',
    customer_cpf = '12345678901'
WHERE customer_email = 'gabriel_acardoso@hotmail.com';
```

---

## 🔄 PRÓXIMOS PASSOS

1. ✅ **Execute SQL de migração** (PASSO 1)
2. ✅ **Recarregue a página** (F5)
3. ✅ **Teste resend email**
4. 📸 **Me envie print** se ainda não funcionar

---

**Resultado esperado:**
- ✅ Telefones e CPFs aparecem na tabela
- ✅ Resend Email funciona sem erro 500
- ✅ Logs do navegador sem erros

**Tempo estimado:** 2 minutos
