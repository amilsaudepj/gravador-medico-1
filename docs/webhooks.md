# ✅ IMPLEMENTAÇÃO: Webhooks AppMax + Motivos Reais de Falha

## 🎯 Problema Resolvido

**ANTES:** Dashboard mostrava motivos genéricos/estimados
- ❌ "Saldo insuficiente: 40%"
- ❌ "Cartão recusado: 35%" 
- ❌ Não identificava PIX expirado

**AGORA:** Dashboard mostra motivos REAIS dos webhooks
- ✅ "PIX Expirado: 3"
- ✅ "Boleto Vencido: 2"
- ✅ "Cartão Recusado: 1"

---

## 📁 Arquivos Criados/Modificados

### 1. **Banco de Dados**
✅ `database/ADD-FAILURE-REASON.sql`
- Adiciona coluna `failure_reason` na tabela `sales`
- Cria índice para performance
- Mapeia todos os webhooks da AppMax

### 2. **Webhook Handler**
✅ `app/api/webhooks/appmax/route.ts`
- Endpoint: `/api/webhooks/appmax`
- Processa 16 eventos da AppMax
- Atualiza status + motivo de falha
- Reverte carrinho para "abandonado" quando PIX/Boleto expira

### 3. **Dashboard V2**
✅ `app/admin/dashboard-v2/page.tsx`
- Agora lê `failure_reason` do banco
- Mostra top 3 motivos reais
- Conta chargebacks
- Fallback para estimativas se não houver dados

### 4. **Documentação**
✅ `WEBHOOK_APPMAX_CONFIG.md`
- Guia completo de configuração
- Lista de todos os eventos
- Como testar
- Troubleshooting

---

## 🔧 Como Implementar

### PASSO 1: Executar SQL no Supabase
```sql
-- Copie e cole no SQL Editor do Supabase
-- Arquivo: database/ADD-FAILURE-REASON.sql

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_failure_reason 
ON public.sales(failure_reason);
```

### PASSO 2: Configurar Webhook na AppMax

1. Acesse o painel da AppMax
2. Vá em **Configurações → Webhooks**
3. Configure a URL:
   ```
   https://gravador-medico.vercel.app/api/webhooks/appmax
   ```

4. Marque estes eventos:
   - ✅ Pedido aprovado
   - ✅ Pedido pago
   - ✅ **Pix Expirado** ← IMPORTANTE
   - ✅ Pix Gerado
   - ✅ Pix Pago
   - ✅ Pedido com boleto vencido
   - ✅ Pedido Estornado
   - ✅ Pedido Chargeback em Tratamento
   - ✅ Todos os outros da lista

### PASSO 3: Deploy
```bash
git add .
git commit -m "feat: Webhook AppMax + motivos reais de pagamentos recusados"
git push origin main
```

O Vercel fará deploy automático.

### PASSO 4: Testar

**Teste Manual:**
```bash
curl -X POST https://gravador-medico.vercel.app/api/webhooks/appmax \
  -H "Content-Type: application/json" \
  -d '{
    "event": "Pix Expirado",
    "order_id": "TEST123",
    "customer_email": "teste@email.com"
  }'
```

**Teste Real:**
1. Crie um pedido com PIX na AppMax
2. Aguarde 15 minutos (PIX expira)
3. AppMax enviará webhook "Pix Expirado"
4. Verifique na dashboard

---

## 📊 Mapeamento Completo de Eventos

| Webhook AppMax | Status no Banco | Motivo (failure_reason) |
|----------------|-----------------|-------------------------|
| Pedido aprovado | `approved` | - |
| Pedido autorizado | `approved` | - |
| Pedido pago | `paid` | - |
| **Pix Expirado** | `expired` | **PIX Expirado** ✅ |
| Pix Gerado | `pending` | - |
| Pix Pago | `paid` | - |
| Boleto Gerado | `pending` | - |
| Pedido com boleto vencido | `expired` | Boleto Vencido |
| Pedido Estornado | `refunded` | Estornado |
| Pedido Chargeback em Tratamento | `chargeback` | Chargeback em Análise |
| Pedido Chargeback Ganho | `approved` | *(remove motivo)* |
| Pedido pendente de integração | `pending` | - |
| Pedido integrado | `approved` | - |
| Pedido Autorizado com atraso | `approved` | - |
| Upsell pago | `paid` | - |

---

## 🎨 Resultado Visual

**Card "Pagamentos Recusados":**

```
┌────────────────────────────────────┐
│ ❌ PAGAMENTOS RECUSADOS            │
│                                    │
│ R$ 2.300                           │
│ 8 tentativas falharam              │
│                                    │
│ • PIX Expirado: 3                  │
│ • Boleto Vencido: 2                │
│ • Cartão Recusado: 3               │
│                                    │
│ [Ver Detalhes]                     │
└────────────────────────────────────┘
```

---

## 🔄 Fluxo Automático

### Quando PIX expira:

1. **AppMax detecta** PIX expirou (15 min)
2. **AppMax envia** webhook `"Pix Expirado"`
3. **API recebe** em `/api/webhooks/appmax`
4. **Sistema atualiza:**
   - `sales.status = 'expired'`
   - `sales.failure_reason = 'PIX Expirado'`
   - `abandoned_carts.status = 'abandoned'`
5. **Dashboard mostra:**
   - Card "Carrinhos Abandonados" +1
   - Card "Pagamentos Recusados" → "PIX Expirado: +1"

---

## ✅ Checklist de Implementação

- [x] Criar arquivo SQL `ADD-FAILURE-REASON.sql`
- [x] Criar webhook handler `/api/webhooks/appmax`
- [x] Atualizar dashboard-v2 para ler motivos reais
- [x] Criar documentação `WEBHOOK_APPMAX_CONFIG.md`
- [x] Corrigir erros TypeScript
- [ ] **Executar SQL no Supabase** ← VOCÊ PRECISA FAZER
- [ ] **Configurar webhooks na AppMax** ← VOCÊ PRECISA FAZER
- [ ] Fazer deploy
- [ ] Testar com PIX real

---

## 🧪 Como Validar se Funcionou

### 1. Verificar SQL executado
```sql
-- No Supabase SQL Editor
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'sales' 
  AND column_name = 'failure_reason';

-- Deve retornar: failure_reason
```

### 2. Verificar endpoint webhook
```bash
curl https://gravador-medico.vercel.app/api/webhooks/appmax

# Resposta esperada:
# { "status": "ok", "endpoint": "AppMax Webhook Handler", ... }
```

### 3. Simular PIX Expirado
```bash
curl -X POST https://gravador-medico.vercel.app/api/webhooks/appmax \
  -H "Content-Type: application/json" \
  -d '{
    "event": "Pix Expirado",
    "order_id": "PEDIDO_ID_REAL",
    "customer_email": "email@real.com"
  }'
```

### 4. Verificar banco de dados
```sql
SELECT 
    order_id,
    status,
    failure_reason,
    updated_at
FROM sales
WHERE failure_reason = 'PIX Expirado'
ORDER BY updated_at DESC
LIMIT 5;
```

### 5. Verificar dashboard
- Acesse: http://localhost:3000/admin/dashboard-v2
- Card "Pagamentos Recusados" deve mostrar "PIX Expirado: X"

---

**Status:** ✅ Código pronto  
**Próximo passo:** Executar SQL + configurar webhooks na AppMax  
**Data:** 21/01/2026
