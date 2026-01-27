# 📚 ÍNDICE - ENTERPRISE CHECKOUT V3.0

## 🎯 COMECE AQUI

Este é o sistema completo de **Checkout Transparente Enterprise-Grade** com cascata automática (Mercado Pago → AppMax), segurança PCI-DSS e integração com Lovable.

---

## 📁 ARQUIVOS PRINCIPAIS

### **📖 Documentação**
1. **[IMPLEMENTACAO-ENTERPRISE-V3.md](./IMPLEMENTACAO-ENTERPRISE-V3.md)** ⭐
   - **Resumo executivo** do que foi implementado
   - Lista completa de arquivos criados
   - Padrões de segurança (PCI-DSS, OWASP ASVS L2, SOC2)
   - Fluxo End-to-End completo
   - Métricas de sucesso esperadas

2. **[ENTERPRISE-CHECKOUT-GUIA.md](./ENTERPRISE-CHECKOUT-GUIA.md)** ⭐
   - **Guia passo a passo** de configuração
   - Checklist de implementação
   - Comandos para testes
   - Queries de monitoramento
   - Troubleshooting

3. **[.env.template](./.env.template)**
   - Template com todas as variáveis necessárias
   - Comentários explicativos para cada chave
   - Checklist de segurança

---

## 🗄️ BANCO DE DADOS

### **[database/schema-enterprise-checkout.sql](./database/schema-enterprise-checkout.sql)**
**Execute este SQL no Supabase primeiro!**

**Contém:**
- ✅ Tabelas: `orders`, `payment_attempts`, `webhook_logs`, `integration_logs`
- ✅ Enums tipados
- ✅ Índices de performance
- ✅ RLS Policies (segurança)
- ✅ Trigger de sanitização automática (PCI-DSS)
- ✅ Views de analytics
- ✅ Função RPC `get_checkout_stats()`

**Executar:**
```sql
-- No Supabase SQL Editor, cole todo o conteúdo deste arquivo e clique em "Run"
```

---

## 💻 BACKEND

### **1. Validators**
**[lib/validators/checkout.ts](./lib/validators/checkout.ts)**
- Schemas Zod para validação
- Validação real de CPF
- Helpers de sanitização
- Validação de IP (anti-SSRF)

### **2. Middleware de Segurança**
**[middleware.ts](./middleware.ts)**
- Rate Limiting (10 req/min checkout, 100 req/min webhooks)
- Security Headers (HSTS, CSP, X-Frame-Options)
- Proteção de rotas `/admin/*`
- OWASP ASVS L2 compliant

### **3. API de Checkout (Cascata)**
**[app/api/checkout/cascade/route.ts](./app/api/checkout/cascade/route.ts)**
- Dual Tokenization
- Validação Turnstile
- Idempotência rigorosa
- Tentativa MP → Fallback AppMax
- Log completo de tentativas

### **4. Webhook Handler**
**[app/api/webhooks/mercadopago-v3/route.ts](./app/api/webhooks/mercadopago-v3/route.ts)**
- Validação HMAC SHA-256
- Idempotência (event_id único)
- Provisionamento automático (Lovable)
- Envio de email (Resend)
- Retry automático

---

## 🚀 EDGE FUNCTION (LOVABLE)

### **[supabase/functions/admin-user-manager/index.ts](./supabase/functions/admin-user-manager/index.ts)**

**Deploy no Supabase do Lovable:**
```bash
supabase login
supabase link --project-ref SEU_PROJETO_LOVABLE
supabase functions deploy admin-user-manager
supabase secrets set EXTERNAL_API_SECRET=webhook-appmax-2026-secure-key
```

**Endpoints:**
- `GET /?email=x` → Buscar usuário
- `POST` → Criar usuário (auto-confirm)
- `PATCH` → Reset senha

---

## 🎨 FRONTEND

### **[components/checkout/CheckoutFormV3.tsx](./components/checkout/CheckoutFormV3.tsx)**

**Features:**
- Dual Tokenization Paralela (MP + AppMax)
- Cloudflare Turnstile (anti-bot)
- UX invisível (usuário não sabe do fallback)
- Estados visuais (loading, success, error)
- PCI-DSS compliant

**Usar:**
```tsx
import CheckoutFormV3 from '@/components/checkout/CheckoutFormV3';

<CheckoutFormV3
  productId="plan-enterprise"
  productName="Plano Enterprise"
  amount={297.00}
  onSuccess={(orderId) => router.push(`/obrigado?order=${orderId}`)}
/>
```

**Adicionar no `app/layout.tsx`:**
```tsx
<script src="https://sdk.mercadopago.com/js/v2"></script>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

---

## 🔧 SETUP RÁPIDO

### **Opção 1: Script Automatizado**
```bash
./scripts/setup-enterprise-checkout.sh
```

### **Opção 2: Manual**

#### **1. Instalar Dependências**
```bash
npm install uuid zod mercadopago @supabase/supabase-js
```

#### **2. Configurar Variáveis**
```bash
cp .env.template .env.local
# Editar .env.local com suas chaves
```

#### **3. Rodar SQL**
```sql
-- No Supabase SQL Editor:
-- Copiar e colar: database/schema-enterprise-checkout.sql
```

#### **4. Deploy Edge Function**
```bash
supabase functions deploy admin-user-manager
supabase secrets set EXTERNAL_API_SECRET=webhook-appmax-2026-secure-key
```

#### **5. Configurar Webhooks**
- **Mercado Pago:** https://www.mercadopago.com.br/developers/panel/app
  - URL: `https://seudominio.com.br/api/webhooks/mercadopago-v3`
  - Evento: `payment.updated`

#### **6. Rodar Projeto**
```bash
npm run dev
```

---

## 🧪 TESTES

### **1. Testar Schema SQL**
```sql
SELECT * FROM gateway_performance;
SELECT * FROM cascata_metrics;
SELECT * FROM get_checkout_stats(NOW() - INTERVAL '7 days', NOW());
```

### **2. Testar Edge Function**
```bash
curl -X POST \
  https://seu-projeto-lovable.supabase.co/functions/v1/admin-user-manager \
  -H 'x-api-secret: webhook-appmax-2026-secure-key' \
  -H 'Content-Type: application/json' \
  -d '{"email":"teste@exemplo.com","autoConfirm":true}'
```

### **3. Testar Checkout**
- Rodar: `npm run dev`
- Cartão de teste MP: `5031 4332 1540 6351` (CVV: 123)

---

## 📊 MONITORAMENTO

### **Queries Úteis:**

```sql
-- Pedidos de hoje
SELECT * FROM orders WHERE DATE(created_at) = CURRENT_DATE;

-- Performance por gateway
SELECT * FROM gateway_performance;

-- Taxa de resgate (AppMax salvou quantos?)
SELECT 
  COUNT(*) FILTER (WHERE fallback_used = true) as rescued,
  ROUND(COUNT(*) FILTER (WHERE fallback_used = true)::numeric / COUNT(*) * 100, 2) as rescue_rate_percent
FROM orders WHERE status = 'paid';

-- Webhooks pendentes
SELECT * FROM webhook_logs
WHERE processed = false
AND created_at > NOW() - INTERVAL '1 hour';
```

---

## 🛡️ SEGURANÇA - CHECKLIST

- [ ] ✅ Service Role Key nunca exposta no frontend
- [ ] ✅ Webhook secrets configurados
- [ ] ✅ HTTPS habilitado em produção
- [ ] ✅ Rate limiting ativo
- [ ] ✅ RLS habilitado em todas as tabelas
- [ ] ✅ Dados de cartão NUNCA salvos
- [ ] ✅ Turnstile ativo
- [ ] ✅ CPF sanitizado em logs
- [ ] ✅ Idempotência implementada
- [ ] ✅ HMAC validation nos webhooks

---

## 🎯 FLUXO COMPLETO

```
USUÁRIO → Checkout Form (Frontend)
   ↓
   Tokenização Dupla (MP + AppMax)
   ↓
   POST /api/checkout/cascade
   ↓
   Validação Turnstile
   ↓
   Idempotência Check
   ↓
   Criar Order (pending)
   ↓
   Tentativa 1: Mercado Pago
   ├─ ✅ Aprovado? → Order = paid
   └─ ❌ Rejeitado? → Tentativa 2
   ↓
   Tentativa 2: AppMax (Fallback)
   ├─ ✅ Aprovado? → Order = paid (rescued)
   └─ ❌ Rejeitado? → Order = failed
   ↓
   Mercado Pago envia Webhook
   ↓
   Validação HMAC
   ↓
   Provisionamento Lovable
   ↓
   Envio de Email
   ↓
   ✅ CLIENTE TEM ACESSO
```

---

## 📞 SUPORTE

**Documentação Oficial:**
- [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
- [Supabase Docs](https://supabase.com/docs)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile)

**Logs:**
```bash
# Vercel
vercel logs --follow

# Supabase Edge Functions
supabase functions logs admin-user-manager --follow
```

---

## ✅ STATUS DA IMPLEMENTAÇÃO

- ✅ **Banco de Dados:** 100% completo
- ✅ **Backend (API):** 100% completo
- ✅ **Edge Function:** 100% completo
- ✅ **Frontend:** 100% completo
- ✅ **Segurança:** PCI-DSS + OWASP ASVS L2
- ✅ **Documentação:** Completa
- ✅ **Scripts de Setup:** Prontos

**🎉 SISTEMA PRONTO PARA PRODUÇÃO!**

---

## 🚀 PRÓXIMOS PASSOS

1. Executar SQL no Supabase
2. Configurar .env.local
3. Deploy Edge Function (Lovable)
4. Configurar webhooks (MP)
5. Testar checkout em dev
6. Deploy em produção (Vercel)
7. Monitorar métricas

**Qualquer dúvida, consulte: [ENTERPRISE-CHECKOUT-GUIA.md](./ENTERPRISE-CHECKOUT-GUIA.md)**
