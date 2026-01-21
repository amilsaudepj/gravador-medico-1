# ⚡ Guia Rápido - 5 Minutos

## 🎯 Objetivo

Ter seu checkout bonito usando o **gateway da Appmax** (sem configurar nada de pagamento).

---

## 🔥 3 Passos Essenciais

### 1️⃣ Configure o Backend (Já está pronto!)

Arquivos criados:
- ✅ `lib/appmax.ts` - Integração
- ✅ `app/api/checkout/route.ts` - Endpoint
- ✅ `app/api/checkout/status/route.ts` - Status

### 2️⃣ Variáveis de Ambiente

Edite `.env.local`:

```bash
APPMAX_API_TOKEN=seu_token_aqui  # Obter no painel Appmax
APPMAX_PRODUCT_ID=32880073       # Já está correto
```

**Como obter o token:**
1. Painel Appmax → Configurações → API
2. Gerar Token
3. Copiar e colar

### 3️⃣ Atualize o Frontend

No seu `app/checkout/page.tsx`, adicione a função:

```typescript
const handleCheckout = async () => {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: formData.name,
      email: formData.email,
      cpf: formData.cpf,
      phone: formData.phone,
      paymentMethod: paymentMethod, // 'pix' ou 'credit_card'
      
      // Se cartão:
      cardData: paymentMethod === 'credit_card' ? {
        number: cardNumber,
        holderName: holderName,
        expMonth: expMonth,
        expYear: expYear,
        cvv: cvv,
        installments: 1
      } : undefined
    })
  })

  const result = await response.json()
  
  if (result.success) {
    if (paymentMethod === 'pix') {
      setPixQrCode(result.pixQrCodeBase64) // Mostra QR Code
    } else {
      router.push('/checkout/success') // Redireciona
    }
  }
}
```

---

## 🎨 O Que Você Faz

```typescript
// 1. Coleta dados no seu checkout bonito
const formData = {
  name: "Dr. João Silva",
  email: "joao@email.com",
  cpf: "12345678900",
  phone: "11999999999"
}

// 2. Envia para sua API
await fetch('/api/checkout', {
  method: 'POST',
  body: JSON.stringify(formData)
})

// 3. Mostra resultado no seu design
if (result.pixQrCodeBase64) {
  // Seu modal bonito com QR Code
  setShowPixModal(true)
}
```

---

## 🚀 O Que a Appmax Faz

**Tudo relacionado a pagamento:**
- Processa cartão com gateway próprio
- Gera QR Code PIX
- Gera boleto
- Valida antifraude
- Confirma pagamento
- Envia webhook

**Você NÃO configura nada de gateway!**

---

## ✅ Pronto!

Seu checkout:
- 🎨 Design seu
- 💳 Pagamento Appmax
- 🔔 Webhooks automáticos
- 🚀 Zero configuração de gateway

---

## 📖 Precisa de Mais Detalhes?

Leia: [CHECKOUT_GATEWAY_APPMAX.md](./CHECKOUT_GATEWAY_APPMAX.md)

**Dúvidas? Tem 6 documentos completos com tudo detalhado!**
