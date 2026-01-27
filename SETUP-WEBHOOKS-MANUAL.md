# 🔔 GUIA RÁPIDO - CONFIGURAÇÃO DE WEBHOOKS

## ✅ O QUE VOCÊ PRECISA FAZER MANUALMENTE

### **1️⃣ CLOUDFLARE TURNSTILE (Anti-Bot)**

**Link:** https://dash.cloudflare.com/

**Passos:**
1. Login no Cloudflare
2. Ir em: **Turnstile** (menu lateral)
3. Clicar em **"Add Site"**
4. Configurar:
   - **Site Name:** Gravador Médico Checkout
   - **Domain:** localhost (para dev) + seu domínio de produção
   - **Widget Mode:** Managed (Recommended)
5. Copiar as chaves geradas:
   - **Site Key** → Substituir em `.env.local`: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - **Secret Key** → Substituir em `.env.local`: `TURNSTILE_SECRET_KEY`

---

### **2️⃣ MERCADO PAGO WEBHOOK**

**Link:** https://www.mercadopago.com.br/developers/panel/app

**Passos:**
1. Login no Mercado Pago
2. Ir em: **Suas integrações** → Selecionar sua aplicação
3. Clicar em **"Webhooks"** (menu lateral)
4. Clicar em **"Configurar notificações"**
5. Adicionar URL:
   ```
   https://seudominio.com.br/api/webhooks/mercadopago-v3
   ```
   ⚠️ **Para desenvolvimento local, use ngrok:**
   ```bash
   ngrok http 3000
   # Use a URL gerada: https://xxxxx.ngrok.io/api/webhooks/mercadopago-v3
   ```

6. Selecionar eventos:
   - ✅ **Pagamentos** (payment.updated)
   
7. Clicar em **"Salvar"**

8. Copiar o **Webhook Secret** que aparece na tela
   - Substituir em `.env.local`: `MERCADOPAGO_WEBHOOK_SECRET`

---

### **3️⃣ RESEND (Emails - Opcional)**

**Link:** https://resend.com/

**Passos:**
1. Criar conta (se não tiver)
2. Ir em: **API Keys**
3. Clicar em **"Create API Key"**
4. Copiar a chave gerada
   - Substituir em `.env.local`: `RESEND_API_KEY`

**Alternativa:** Se não quiser usar Resend agora, pode comentar as linhas de envio de email no webhook handler.

---

## ✅ VERIFICAÇÃO

Após configurar, rode:
```bash
grep -E "(TURNSTILE|MERCADOPAGO_WEBHOOK|RESEND)" .env.local
```

Deve mostrar as chaves configuradas (não mais `xxxxxxx`).

---

## 🧪 TESTE DO WEBHOOK (LOCAL)

### **Instalar ngrok (se não tiver):**
```bash
# Via npm
npm install -g ngrok

# Ou baixar: https://ngrok.com/download
```

### **Expor localhost:**
```bash
ngrok http 3000
```

Copiar a URL gerada (ex: `https://abc123.ngrok.io`) e configurar no Mercado Pago.

### **Testar manualmente:**
```bash
curl -X POST http://localhost:3000/api/webhooks/mercadopago-v3 \
  -H 'Content-Type: application/json' \
  -H 'x-signature: v1,test123,ts=1234567890' \
  -H 'x-request-id: test-request-id' \
  -d '{
    "type": "payment",
    "action": "payment.updated",
    "data": { "id": "123456789" }
  }'
```

---

## 📝 ANOTAÇÕES

- ⚠️ **Webhook Secret:** Guarde em local seguro (1Password, Bitwarden, etc.)
- 🔒 **Turnstile:** Em produção, use modo "Invisible" para melhor UX
- 📧 **Resend:** 100 emails/dia grátis no plano Free

---

**Quando terminar, volte aqui e continue com o Passo 6!**
