# ⚡ AÇÃO IMEDIATA - CORRIGIR INTEGRAÇÃO APPMAX

## 🚨 PROBLEMA
Dados da Appmax **NÃO chegam** na tabela `sales` e dashboard mostra **tudo zerado**.

## ✅ CAUSA
Coluna `appmax_order_id` **não existe** na tabela `sales` do banco de dados.

## 🎯 SOLUÇÃO (5 MINUTOS)

### 1️⃣ Abra o Supabase
🔗 https://supabase.com/dashboard

### 2️⃣ Vá em SQL Editor
Clique em "SQL Editor" → "New Query"

### 3️⃣ Cole este código:

```sql
-- Adicionar colunas faltantes
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS appmax_order_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_appmax_order_id 
  ON public.sales(appmax_order_id);

ALTER TABLE public.webhooks_logs 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.webhooks_logs 
  ADD COLUMN IF NOT EXISTS endpoint TEXT;

ALTER TABLE public.webhooks_logs 
  ADD COLUMN IF NOT EXISTS response_status INTEGER;

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4️⃣ Execute
Pressione `Cmd/Ctrl + Enter`

### 5️⃣ Teste
```bash
node scripts/diagnostico-completo.js
```

**Esperado:** TUDO ✅

---

## 📚 DOCUMENTAÇÃO COMPLETA

Leia estes arquivos para entender tudo:

- 📖 **SOLUCAO-VISUAL.md** - Diagrama do fluxo
- 📖 **RESUMO-EXECUTIVO.md** - Análise completa  
- 📖 **CHECKLIST-CORRECAO.md** - Passo a passo detalhado
- 📄 **database/CORRECAO-URGENTE-SCHEMA.sql** - SQL completo

---

## 🆘 PRECISA DE AJUDA?

Execute o diagnóstico:
```bash
node scripts/diagnostico-completo.js
```

Ele vai mostrar exatamente onde está o problema.

---

**✅ EXECUTE AGORA O SQL ACIMA NO SUPABASE!**
