# 🔄 Sistema de Redirecionamento para Página de Obrigado

Sistema automático que redireciona clientes para a página `/obrigado` após confirmação do pagamento via webhook (Mercado Pago ou Appmax).

---

## 📋 Índice

- [Como Funciona](#-como-funciona)
- [Instalação](#-instalação)
- [Uso no Frontend](#-uso-no-frontend)
- [API Endpoints](#-api-endpoints)
- [Configuração do Banco](#-configuração-do-banco)
- [Exemplos](#-exemplos)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Como Funciona

### Fluxo Completo

```
1. Cliente finaliza compra → Cria pedido (status: pending)
                           ↓
2. Mercado Pago/Appmax processa pagamento
                           ↓
3. Webhook recebe notificação → Valida pagamento
                           ↓
4. Sistema gera URL /obrigado → Salva em orders.redirect_url
                           ↓
5. Frontend faz polling → Detecta redirect_url
                           ↓
6. Cliente é redirecionado → /obrigado?order_id=xxx&email=xxx
```

### Componentes

1. **Backend (Webhooks)**
   - `lib/redirect-helper.ts` - Geração e validação de URLs
   - `app/api/webhooks/mercadopago-v3/route.ts` - Webhook MP
   - `lib/appmax-webhook.ts` - Webhook Appmax

2. **API Status**
   - `app/api/order/status/route.ts` - Endpoint para verificar status

3. **Frontend**
   - `hooks/useOrderRedirect.ts` - Hook React para polling
   - `components/OrderRedirectManager.tsx` - UI de redirecionamento

4. **Banco de Dados**
   - `database/migrations/add-redirect-url.sql` - Migration

---

## 🚀 Instalação

### 1. Executar Migration SQL

```bash
# Conectar ao Supabase
npx supabase db push

# Ou executar manualmente:
psql $DATABASE_URL -f database/migrations/add-redirect-url.sql
```

### 2. Verificar Variáveis de Ambiente

```bash
# .env.local
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

---

## 💻 Uso no Frontend

### Opção 1: Hook Direto

```tsx
'use client'

import { useOrderRedirect } from '@/hooks/useOrderRedirect'

export default function CheckoutSuccessPage({ 
  orderId 
}: { 
  orderId: string 
}) {
  const { status, isPolling, hasTimedOut } = useOrderRedirect({
    orderId,
    enabled: true,
    pollingInterval: 3000, // 3 segundos
    maxAttempts: 40, // 2 minutos
    onStatusChange: (newStatus) => {
      console.log('Status:', newStatus)
    },
    onRedirect: (url) => {
      console.log('Redirecionando para:', url)
    }
  })

  return (
    <div>
      <h1>Processando Pagamento...</h1>
      <p>Status: {status}</p>
      {isPolling && <p>Verificando...</p>}
      {hasTimedOut && (
        <a href={`/obrigado?order_id=${orderId}`}>
          Ir para Página de Obrigado
        </a>
      )}
    </div>
  )
}
```

### Opção 2: Componente Manager (Recomendado)

```tsx
'use client'

import { OrderRedirectManager } from '@/components/OrderRedirectManager'

export default function CheckoutSuccessPage({ 
  orderId,
  customerEmail 
}: { 
  orderId: string
  customerEmail: string
}) {
  return (
    <div>
      <h1>Pagamento em Processamento</h1>
      
      {/* Componente gerencia tudo automaticamente */}
      <OrderRedirectManager 
        orderId={orderId}
        customerEmail={customerEmail}
        onTimeout={() => {
          console.log('Timeout - mostrar fallback')
        }}
      />
      
      {/* Conteúdo da página... */}
    </div>
  )
}
```

### Opção 3: Integração no Checkout Existente

```tsx
// Em sua página de checkout após finalizar compra
const handleCheckoutSuccess = async (result: CheckoutResult) => {
  if (result.order_id) {
    // Iniciar polling automático
    setOrderId(result.order_id)
    setShowRedirectManager(true)
  }
}

return (
  <>
    {/* Seu formulário de checkout */}
    
    {/* Mostrar quando pagamento for bem sucedido */}
    {showRedirectManager && orderId && (
      <OrderRedirectManager 
        orderId={orderId}
        customerEmail={customerEmail}
      />
    )}
  </>
)
```

---

## 🔌 API Endpoints

### GET `/api/order/status`

Verifica status atual do pedido e URL de redirecionamento.

**Parâmetros:**
- `order_id` (query, required) - ID do pedido

**Exemplo:**
```bash
curl "http://localhost:3000/api/order/status?order_id=abc123"
```

**Resposta:**
```json
{
  "order_id": "abc123",
  "status": "paid",
  "redirect_url": "http://localhost:3000/obrigado?order_id=abc123&email=cliente@email.com&t=xxx",
  "has_redirect": true,
  "customer": {
    "email": "cliente@email.com",
    "name": "João Silva"
  },
  "payment": {
    "method": "credit_card",
    "amount": 49.90
  },
  "created_at": "2026-01-27T10:30:00Z"
}
```

---

## 🗄️ Configuração do Banco

### Estrutura da Tabela

```sql
-- Coluna adicionada em orders
ALTER TABLE orders 
ADD COLUMN redirect_url TEXT;

-- Índice para busca rápida
CREATE INDEX idx_orders_redirect_url 
ON orders(redirect_url) 
WHERE redirect_url IS NOT NULL;
```

### Dados Salvos

Quando o webhook confirma o pagamento:

```sql
UPDATE orders 
SET 
  status = 'paid',
  redirect_url = 'https://seu-dominio.com/obrigado?order_id=xxx&email=xxx&t=token'
WHERE id = 'order_id';
```

---

## 📝 Exemplos

### Exemplo 1: PIX via Mercado Pago

```
1. Cliente finaliza compra com PIX
2. MP gera QR Code
3. Cliente paga
4. MP envia webhook → /api/webhooks/mercadopago-v3
5. Sistema detecta pagamento aprovado
6. Cria URL: /obrigado?order_id=123&email=cliente@email.com&t=xyz
7. Salva em orders.redirect_url
8. Frontend faz polling e detecta URL
9. Redireciona automaticamente
```

### Exemplo 2: Cartão via Appmax

```
1. Cliente finaliza compra com cartão
2. Appmax processa
3. Appmax envia webhook → /api/webhooks/appmax
4. Sistema confirma aprovação
5. Cria URL de obrigado
6. Frontend redireciona
```

### Exemplo 3: Timeout / Fallback

```tsx
<OrderRedirectManager 
  orderId={orderId}
  customerEmail={email}
  onTimeout={() => {
    // Após 2 minutos sem redirect_url
    // Mostrar botão manual
    setShowManualLink(true)
  }}
/>

{showManualLink && (
  <a href={`/obrigado?order_id=${orderId}&email=${email}`}>
    Acessar Página de Obrigado Manualmente
  </a>
)}
```

---

## 🔧 Troubleshooting

### Problema: Polling não detecta redirect_url

**Causa:** Webhook não foi processado ou falhou

**Solução:**
```sql
-- Verificar logs do webhook
SELECT * FROM webhook_logs 
WHERE event_id = 'payment_id'
ORDER BY created_at DESC;

-- Verificar se redirect_url foi salva
SELECT id, status, redirect_url 
FROM orders 
WHERE id = 'order_id';
```

### Problema: Cliente não é redirecionado

**Causa:** JavaScript bloqueado ou erro no hook

**Solução:**
1. Verificar console do navegador
2. Adicionar botão manual como fallback
3. Verificar se `NEXT_PUBLIC_APP_URL` está correto

### Problema: URL de obrigado inválida

**Causa:** Parâmetros faltando

**Solução:**
```typescript
// Sempre passar email e order_id
const redirectUrl = await createAndSaveRedirectUrl({
  orderId: order.id,
  customerEmail: order.customer_email, // Obrigatório
  customerName: order.customer_name,
  paymentMethod: 'credit_card',
  amount: order.total_amount,
  status: 'paid'
})
```

---

## ✅ Checklist de Implementação

- [x] Migration SQL executada
- [x] Webhooks atualizados (MP + Appmax)
- [x] Endpoint `/api/order/status` criado
- [x] Hook `useOrderRedirect` implementado
- [x] Componente `OrderRedirectManager` criado
- [x] Variável `NEXT_PUBLIC_APP_URL` configurada
- [ ] Teste de webhook MP em sandbox
- [ ] Teste de webhook Appmax
- [ ] Teste de polling no frontend
- [ ] Teste de timeout/fallback

---

## 🎯 Próximos Passos

1. **Executar Migration SQL**
   ```bash
   psql $DATABASE_URL -f database/migrations/add-redirect-url.sql
   ```

2. **Testar Webhooks**
   ```bash
   # Mercado Pago
   curl -X POST http://localhost:3000/api/webhooks/mercadopago-v3 \
     -H 'Content-Type: application/json' \
     -d '{"type":"payment","data":{"id":"123"}}'
   
   # Appmax
   curl -X POST http://localhost:3000/api/webhooks/appmax \
     -H 'Content-Type: application/json' \
     -d '{"event":"order.paid","data":{"order_id":"123"}}'
   ```

3. **Integrar no Frontend**
   - Adicionar `<OrderRedirectManager>` na página de checkout
   - Ou usar hook `useOrderRedirect` diretamente

4. **Testar Fluxo Completo**
   - Fazer compra teste
   - Verificar logs do webhook
   - Confirmar redirecionamento automático

---

## 📚 Referências

- **Webhook Mercado Pago:** `app/api/webhooks/mercadopago-v3/route.ts`
- **Webhook Appmax:** `lib/appmax-webhook.ts`
- **Helper de Redirect:** `lib/redirect-helper.ts`
- **API Status:** `app/api/order/status/route.ts`
- **Hook React:** `hooks/useOrderRedirect.ts`
- **Componente UI:** `components/OrderRedirectManager.tsx`

---

## 🆘 Suporte

Se algo não funcionar:

1. Verifique os logs do webhook
2. Verifique se a coluna `redirect_url` existe
3. Teste o endpoint `/api/order/status`
4. Verifique o console do navegador

---

**Desenvolvido com ❤️ para o Gravador Médico**
