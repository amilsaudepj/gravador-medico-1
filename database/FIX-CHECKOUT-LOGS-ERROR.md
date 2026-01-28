# 🚨 Solução: Erro "column session_id does not exist"

## Problema
```
ERROR: 42703: column "session_id" does not exist
```

A tabela `checkout_logs` já existia no banco com uma estrutura diferente.

## ✅ SOLUÇÃO RÁPIDA

### **Execute este SQL no Supabase SQL Editor:**

```sql
-- Dropar e recriar tabela
DROP POLICY IF EXISTS "Service can insert logs" ON checkout_logs;
DROP POLICY IF EXISTS "Admin can read logs" ON checkout_logs;
DROP TABLE IF EXISTS public.checkout_logs CASCADE;

-- Recriar com estrutura correta
CREATE TABLE public.checkout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  order_id TEXT,
  gateway TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_sent JSONB,
  response_data JSONB,
  error_response JSONB,
  error_message TEXT,
  error_cause TEXT,
  http_status INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Índices
CREATE INDEX idx_checkout_logs_session_id ON checkout_logs(session_id);
CREATE INDEX idx_checkout_logs_order_id ON checkout_logs(order_id);
CREATE INDEX idx_checkout_logs_gateway ON checkout_logs(gateway);
CREATE INDEX idx_checkout_logs_status ON checkout_logs(status);
CREATE INDEX idx_checkout_logs_created_at ON checkout_logs(created_at DESC);

-- RLS
ALTER TABLE public.checkout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can insert logs" 
  ON checkout_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can read logs" 
  ON checkout_logs FOR SELECT USING (true);
```

### **OU use o arquivo pronto:**

Execute no SQL Editor:
```
database/FIX-CHECKOUT-LOGS-TABLE.sql
```

## Verificar se funcionou

```sql
-- Ver estrutura da tabela
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'checkout_logs'
ORDER BY ordinal_position;

-- Deve mostrar:
-- id, session_id, order_id, gateway, status, payload_sent, 
-- response_data, error_response, error_message, error_cause, 
-- http_status, created_at
```

## Testar

Faça uma compra de teste e depois:

```sql
SELECT * FROM checkout_logs ORDER BY created_at DESC LIMIT 5;
```

---

**Arquivo SQL completo**: `database/FIX-CHECKOUT-LOGS-TABLE.sql`
