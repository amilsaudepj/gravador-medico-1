# 🚨 CORREÇÃO URGENTE - APPMAX → SALES → DASHBOARD

**Data:** 20 de janeiro de 2026  
**Status:** PROBLEMA IDENTIFICADO E SOLUÇÃO PRONTA

---

## ❌ PROBLEMAS IDENTIFICADOS

### 1. **Tabela `sales` - Colunas faltando**
```
❌ Column 'appmax_order_id' does not exist
```

O webhook tenta inserir dados usando `appmax_order_id`, mas a coluna não existe no banco.

### 2. **Tabela `webhooks_logs` - Estrutura incompleta**
```
❌ Column 'created_at' does not exist
```

O webhook tenta logar com colunas que não existem.

### 3. **Discordância entre schemas**
- `supabase-admin-schema.sql` tem uma estrutura
- `database/01-schema-completo.sql` tem outra
- O banco de dados tem uma terceira estrutura

---

## ✅ SOLUÇÃO

### PASSO 1: Executar correção no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Cole o conteúdo do arquivo: `database/CORRECAO-URGENTE-SCHEMA.sql`
5. Clique em **Run** (ou pressione `Ctrl/Cmd + Enter`)

Isso vai:
- ✅ Adicionar `appmax_order_id` na tabela `sales`
- ✅ Adicionar `created_at` e outras colunas em `webhooks_logs`
- ✅ Criar tabela `customers` se não existir
- ✅ Criar índices necessários

### PASSO 2: Verificar se funcionou

Execute no terminal:

```bash
node scripts/diagnostico-completo.js
```

**Resultado esperado:**
```
✅ Webhook enviado:        ✅
✅ Dados em sales:         ✅
✅ Queries dashboard:      ✅
✅ Tabela customers:       ✅
✅ Logs de webhook:        ✅
```

---

## 🔍 POR QUE ISSO ACONTECEU?

O problema aconteceu porque:

1. **Múltiplos arquivos de schema** foram criados:
   - `supabase-admin-schema.sql`
   - `database/01-schema-completo.sql`
   - Outros arquivos de migração

2. **Não ficou claro qual executar** no Supabase

3. **O webhook foi desenvolvido** esperando uma estrutura (`appmax_order_id`)

4. **Mas o banco tem outra estrutura** (provavelmente só tem `order_id` ou outro nome)

---

## 📋 VERIFICAÇÃO MANUAL (Opcional)

Se quiser verificar a estrutura atual antes de rodar a correção:

```sql
-- Ver colunas da tabela sales
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'sales' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Ver colunas da tabela webhooks_logs
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'webhooks_logs' AND table_schema = 'public'
ORDER BY ordinal_position;
```

---

## 🎯 APÓS A CORREÇÃO

### 1. Teste o webhook manualmente

Com o servidor rodando (`npm run dev`):

```bash
curl -X POST http://localhost:3000/api/webhook/appmax \
  -H "Content-Type: application/json" \
  -d '{
    "appmax_order_id": "TEST-001",
    "status": "approved",
    "customer": {
      "name": "Cliente Teste",
      "email": "teste@exemplo.com"
    },
    "total_amount": 297.00,
    "payment_method": "credit_card"
  }'
```

### 2. Verifique no dashboard admin

1. Acesse: http://localhost:3000/admin/dashboard
2. Você deve ver a venda de teste aparecendo
3. Métricas devem estar preenchidas

### 3. Configure webhook na Appmax

URL: `https://gravadormedico.com.br/api/webhook/appmax`

---

## 📊 ESTRUTURA CORRETA DAS TABELAS

### `sales`
```sql
- id (UUID)
- appmax_order_id (TEXT) ← ADICIONADA
- appmax_customer_id (TEXT) ← ADICIONADA
- customer_id (UUID FK customers)
- customer_name (TEXT)
- customer_email (TEXT)
- customer_phone (TEXT)
- customer_cpf (TEXT)
- total_amount (NUMERIC)
- subtotal (NUMERIC)
- discount (NUMERIC)
- status (TEXT)
- payment_method (TEXT)
- utm_source (TEXT)
- utm_campaign (TEXT)
- utm_medium (TEXT)
- ip_address (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- paid_at (TIMESTAMPTZ)
- metadata (JSONB)
```

### `webhooks_logs`
```sql
- id (UUID)
- endpoint (TEXT) ← ADICIONADA
- payload (JSONB)
- response_status (INTEGER) ← ADICIONADA
- processing_time_ms (INTEGER) ← ADICIONADA
- error (TEXT) ← ADICIONADA
- created_at (TIMESTAMPTZ) ← ADICIONADA
```

### `customers`
```sql
- id (UUID)
- email (TEXT UNIQUE)
- name (TEXT)
- phone (TEXT)
- cpf (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

---

## 🚀 PRÓXIMOS PASSOS

Após executar a correção:

1. ✅ Testar webhook local
2. ✅ Verificar dashboard mostrando dados
3. ✅ Deploy no Vercel
4. ✅ Configurar webhook na Appmax (produção)
5. ✅ Fazer compra de teste real
6. ✅ Confirmar que aparece no dashboard

---

## 💡 DICA: Evitar problemas futuros

**Crie um único arquivo "source of truth":**

```bash
database/
  └── SCHEMA-MASTER.sql  # ← ÚNICO arquivo oficial
```

E documente claramente:
- ✅ Este é o schema oficial
- ✅ Execute APENAS este arquivo
- ✅ Outros são backups/histórico

---

## 📞 SUPORTE

Se após executar a correção ainda houver problemas, verifique:

1. **Logs do Supabase:** Dashboard > Logs
2. **Console do navegador:** F12 > Console
3. **Terminal do servidor:** `npm run dev` (ver erros)
4. **Vercel Logs:** Se em produção

---

**✅ EXECUTE A CORREÇÃO AGORA:**

```bash
# 1. Copie o SQL
cat database/CORRECAO-URGENTE-SCHEMA.sql

# 2. Cole no Supabase SQL Editor

# 3. Execute (Cmd/Ctrl + Enter)

# 4. Teste
node scripts/diagnostico-completo.js
```

**Status esperado:** TUDO ✅
