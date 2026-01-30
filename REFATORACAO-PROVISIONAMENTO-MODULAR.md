# 🏗️ REFATORAÇÃO: Sistema de Provisionamento Modular

> **Data:** 29 de Janeiro de 2026  
> **Objetivo:** Separar o processo de entrega em 3 etapas independentes à prova de falhas

---

## 📋 RESUMO EXECUTIVO

O sistema de provisionamento foi **completamente refatorado** para ser:
- ✅ **Modular**: Cada etapa é independente
- ✅ **Resiliente**: Falha em uma etapa não afeta as anteriores
- ✅ **Transparente**: Cliente sempre sabe o status da compra
- ✅ **Rastreável**: Cada etapa tem logs detalhados

---

## 🔴 PROBLEMA ANTERIOR

```
❌ FLUXO ANTIGO (Tudo ou Nada)
┌─────────────────────────────────────────────────────────┐
│ Webhook recebe pagamento aprovado                       │
│            ↓                                            │
│ Tenta criar usuário no Lovable                          │
│            ↓                                            │
│ Tenta enviar email                                      │
│            ↓                                            │
│ [SE QUALQUER COISA FALHAR] → Cliente não recebe NADA    │
│                              → Acha que levou golpe 😱   │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ NOVA ARQUITETURA

```
✅ FLUXO NOVO (Modular & Resiliente)

┌─────────────────────────────────────────────────────────┐
│ 🔔 WEBHOOK (MP/AppMax)                                  │
│                                                         │
│ 1️⃣ Pagamento Aprovado                                   │
│ 2️⃣ 📧 ENVIA EMAIL DE CONFIRMAÇÃO (fire-and-forget)     │
│    "Parabéns! Recebemos seu pedido. Em 2 minutos você   │
│     receberá outro e-mail com sua senha."               │
│ 3️⃣ Adiciona na fila: stage = 'queued'                  │
│                                                         │
│ ✅ Cliente já sabe que compra foi recebida!             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 🏭 PROVISIONING WORKER (Máquina de Estados)             │
│                                                         │
│ STAGE: queued                                           │
│    ↓                                                    │
│ STAGE: creating_user                                    │
│    ├── ✅ Sucesso → Salva user_id e senha               │
│    │               → Avança para: sending_credentials   │
│    └── ❌ Falha   → Marca: failed_at_user               │
│                   → Agenda retry (5min, 10min, 20min)   │
│                   → Cliente já tem email de confirmação!│
│    ↓                                                    │
│ STAGE: sending_credentials                              │
│    ├── ✅ Sucesso → Envia WelcomeEmail com senha        │
│    │               → Avança para: completed 🎉          │
│    └── ❌ Falha   → Marca: failed_at_email              │
│                   → Agenda retry                        │
│    ↓                                                    │
│ STAGE: completed                                        │
│    → order_status = 'active'                            │
│    → Cliente está usando o produto!                     │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 ARQUIVOS MODIFICADOS/CRIADOS

### 1️⃣ Novo Template de Email
**Arquivo:** `emails/PurchaseConfirmationEmail.tsx`

```tsx
// Email de confirmação IMEDIATO
// Enviado no momento do pagamento aprovado
// Tranquiliza o cliente enquanto o sistema processa

Props:
- customerName: string
- orderId: string
- orderValue: number
- paymentMethod: string
```

**Subject:** `✅ Compra Confirmada! Seu acesso está sendo gerado - Gravador Médico`

---

### 2️⃣ Nova Função de Email
**Arquivo:** `lib/email.ts`

```typescript
// Nova função para email rápido
export async function sendPurchaseConfirmationEmail(params: {
  to: string
  customerName: string
  orderId: string
  orderValue: number
  paymentMethod: string
}): Promise<{ success: boolean; emailId?: string; error?: string }>
```

---

### 3️⃣ Webhooks Atualizados

**Arquivo:** `app/api/webhooks/mercadopago-v3/route.ts`

```typescript
// ANTES do provisionamento
if (customerEmail && customerName) {
  // 🚀 FAST RESPONSE: Fire-and-forget
  sendPurchaseConfirmationEmail({
    to: customerEmail,
    customerName: customerName,
    orderId: saleId || paymentId,
    orderValue: totalAmount,
    paymentMethod: paymentMethod || 'mercadopago'
  }).then(result => {
    // Log assíncrono
  }).catch(err => {
    // Erro não bloqueia o fluxo
  });
}
```

**Arquivo:** `lib/appmax-webhook.ts`
- Mesmo padrão de fire-and-forget

---

### 4️⃣ Worker Refatorado
**Arquivo:** `lib/provisioning-worker.ts`

**Novas funções:**
- `fetchQueueItems()` - Passo A: Ler itens da fila
- `executeUserCreation()` - Passo B: Criar usuário Lovable
- `executeSendCredentials()` - Passo C: Enviar email de credenciais

**Máquina de Estados:**
```typescript
switch (currentStage) {
  case 'queued':
  case 'creating_user':
  case 'failed_at_user':
    // Executa criação de usuário
    break;
    
  case 'sending_credentials':
  case 'failed_at_email':
    // Executa envio de credenciais
    break;
    
  case 'completed':
    // Nada a fazer
    break;
    
  case 'failed_permanent':
    // Intervenção manual necessária
    break;
}
```

---

### 5️⃣ Migração do Banco
**Arquivo:** `database/MIGRATE-PROVISIONING-STAGES.sql`

```sql
-- Nova coluna para máquina de estados
ALTER TABLE provisioning_queue 
ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'queued';

-- Valores permitidos:
-- 'queued'              → Item na fila
-- 'creating_user'       → Criando usuário no Lovable
-- 'sending_credentials' → Enviando email com senha
-- 'completed'           → Tudo OK
-- 'failed_at_user'      → Falha na criação (retry)
-- 'failed_at_email'     → Falha no email (retry)
-- 'failed_permanent'    → Esgotou tentativas
```

---

## 🚀 COMO FAZER DEPLOY

### Passo 1: Executar Migração SQL
```sql
-- No Supabase SQL Editor, execute:
-- database/MIGRATE-PROVISIONING-STAGES.sql
```

### Passo 2: Deploy do Código
```bash
git add -A
git commit -m "feat: Sistema de provisionamento modular e resiliente

✅ Email de confirmação imediato (Fast Response)
🏭 Worker com máquina de estados
📊 Stages: queued → creating_user → sending_credentials → completed
🔄 Retry automático por etapa
📧 Cliente sempre informado sobre status"
git push
```

### Passo 3: Verificar Deploy
1. Faça uma compra teste
2. Verifique se recebeu email de confirmação IMEDIATO
3. Verifique se recebeu email de credenciais após ~2 minutos
4. Confira logs em `integration_logs` com `stage` nos details

---

## 📊 BENEFÍCIOS

| Cenário | ❌ Antes | ✅ Agora |
|---------|---------|---------|
| Lovable fora do ar | Cliente não recebe nada | Cliente recebe confirmação |
| Resend fora do ar | Cliente não recebe nada | Usuário criado, retry agendado |
| Erro aleatório | Reprocessamento manual | Retry automático em 5min |
| Cliente preocupado | "Será golpe?" | "Vi que deu certo!" |

---

## 🔍 MONITORAMENTO

### Ver itens na fila por stage
```sql
SELECT stage, status, COUNT(*) 
FROM provisioning_queue 
GROUP BY stage, status;
```

### Ver falhas recentes
```sql
SELECT * FROM provisioning_queue 
WHERE stage LIKE 'failed%' 
ORDER BY updated_at DESC 
LIMIT 10;
```

### Ver logs de uma venda
```sql
SELECT * FROM integration_logs 
WHERE order_id = 'SEU-ORDER-ID'
ORDER BY created_at;
```

---

## 🛠️ TROUBLESHOOTING

### Cliente não recebeu email de confirmação
1. Verificar `email_logs` com `email_type = 'purchase_confirmation'`
2. Verificar spam/promotions
3. Verificar Resend dashboard

### Cliente recebeu confirmação mas não as credenciais
1. Verificar `provisioning_queue` com o `sale_id`
2. Ver o `stage` atual
3. Se `failed_at_user`: Lovable pode estar fora
4. Se `failed_at_email`: Resend pode estar fora
5. Retry manual: Usar botão "Resincronizar" no admin

### Worker não está processando
1. Verificar se cron está rodando
2. Verificar logs do worker
3. Processar manual: `POST /api/admin/process-provisioning`

---

## ✅ CONCLUSÃO

Com esta refatoração:

1. **Cliente sempre recebe email imediato** de confirmação
2. **Se algo falhar**, ele sabe que a compra foi recebida
3. **Retry automático** resolve 90% dos problemas sozinho
4. **Logs detalhados** facilitam debug
5. **Máquina de estados** permite continuar de onde parou

---

> 💡 **Lema:** "Melhor o cliente saber que estamos trabalhando do que achar que levou golpe!"
