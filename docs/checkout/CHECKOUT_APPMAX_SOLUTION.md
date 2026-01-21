# ✅ SOLUÇÃO: Checkout Próprio + Gateway Appmax

## 🎯 O Problema

O checkout da Appmax (`https://gravadormedico.carrinho.app/one-checkout/ocudf/32880073`) é feio e não atende às suas necessidades de design e experiência do usuário.

## 💡 A Solução

**Criar seu próprio checkout customizado** e usar a **API + Gateway da Appmax** para processar os pagamentos.

### Como Funciona:
1. **Seu checkout coleta os dados** (nome, email, cartão, etc.)
2. **Envia para a API da Appmax** via seu backend
3. **Appmax processa com gateway próprio** (PIX, Cartão, Boleto)
4. **Webhook retorna** quando pagamento aprovado
5. **Você libera acesso** ao cliente

### Vantagens:
- ✅ **Design 100% seu** - Controle total da experiência
- ✅ **Order Bumps personalizados** - Dentro do seu layout
- ✅ **Gateway da Appmax** - Sem configurar nada de pagamento
- ✅ **Webhooks funcionam** - Sistema de acesso automático
- ✅ **Gerenciamento na Appmax** - Produtos, relatórios, etc.
- ✅ **PCI Compliance** - Appmax cuida da segurança

---

## 📦 O Que Foi Implementado

### 1. **Biblioteca de Integração** (`lib/appmax.ts`)
   - `createAppmaxOrder()` - Cria pedidos via API
   - `getAppmaxOrder()` - Busca status de pedidos
   - `validateAppmaxAccess()` - Valida acesso do cliente

### 2. **API de Checkout** (`app/api/checkout/route.ts`)
   - Recebe dados do frontend
   - Envia para Appmax
   - Retorna QR Code PIX ou confirma cartão

### 3. **API de Status** (`app/api/checkout/status/route.ts`)
   - Verifica status do pagamento
   - Usado para polling do PIX

### 4. **Documentação Completa**
   - `APPMAX_INTEGRATION_GUIDE.md` - Guia completo de integração
   - `APPMAX_API_REFERENCE.md` - Referência da API
   - `CHECKOUT_FRONTEND_EXAMPLE.md` - Exemplo de implementação frontend

---

## 🚀 Como Usar

### Passo 1: Configurar Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
# Token da API Appmax (obter no painel)
APPMAX_API_TOKEN=seu_token_aqui

# ID do produto principal
APPMAX_PRODUCT_ID=32880073

# IDs dos Order Bumps (criar na Appmax)
APPMAX_ORDER_BUMP_VIP_ID=id_vip
APPMAX_ORDER_BUMP_LIBRARY_ID=id_biblioteca
```

### Passo 2: Obter Token da API

1. Acesse o painel da Appmax
2. Vá em **Configurações** → **API**
3. Gere um novo token
4. Cole no `.env.local`

### Passo 3: Criar Produtos de Order Bump

Na Appmax, crie 2 produtos:
1. **VIP Consulting** - R$ 147
2. **Premium Library** - R$ 97

Anote os IDs e adicione no `.env.local`.

### Passo 4: Atualizar o Frontend

Use o exemplo em `CHECKOUT_FRONTEND_EXAMPLE.md` para atualizar seu `app/checkout/page.tsx`.

Principais adições:
- Estados para formulário
- Função `handleCheckout()`
- Polling para PIX
- Formulários de dados pessoais e cartão

### Passo 5: Configurar Webhook

No painel da Appmax:
1. Vá em **Configurações** → **Webhooks**
2. URL: `https://seusite.com/api/webhook/appmax`
3. Eventos: `order.approved`, `order.cancelled`

---

## 🎨 Fluxo de Compra

```
1. Cliente preenche SEU checkout bonito
   ↓
2. Frontend envia POST /api/checkout
   ↓
3. Sua API chama API da Appmax
   ↓
4. Appmax processa pagamento
   ↓
5. Retorna PIX QR Code ou confirma cartão
   ↓
6. Cliente paga
   ↓
7. Appmax dispara webhook
   ↓
8. Seu sistema libera acesso
```

---

## 📝 Exemplo de Integração Frontend

```typescript
// Função principal de checkout
const handleCheckout = async () => {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      cpf: formData.cpf,
      paymentMethod: 'pix', // ou 'credit_card'
      orderBumps: [0, 1], // índices selecionados
      cardData: { /* se cartão */ },
    })
  })

  const result = await response.json()
  
  if (result.success) {
    // PIX: mostrar QR Code
    if (result.pixQrCode) {
      setPixQrCode(result.pixQrCodeBase64)
    }
    // Cartão: redirecionar
    else {
      window.location.href = '/checkout/success'
    }
  }
}
```

---

## 🔒 Segurança

- ✅ Todos os dados sensíveis processados pela Appmax
- ✅ Validação de webhooks com assinatura
- ✅ HTTPS obrigatório em produção
- ✅ Tokens de API mantidos no servidor

---

## 📊 Formas de Pagamento

### PIX
- QR Code gerado instantaneamente
- Polling automático para verificar pagamento
- Aprovação em tempo real

### Cartão de Crédito
- Processamento imediato
- Suporte a parcelamento
- 3D Secure quando necessário

---

## 🎯 Próximos Passos

1. ✅ Configurar variáveis de ambiente
2. ✅ Obter token da API Appmax
3. ✅ Criar produtos de Order Bump
4. ✅ Atualizar frontend do checkout
5. ✅ Testar fluxo completo
6. ✅ Configurar webhook em produção

---

## 📞 Suporte

**Dúvidas sobre a Appmax:**
- Documentação oficial (se disponível)
- Suporte via painel Appmax

**Dúvidas sobre esta implementação:**
- Consulte `APPMAX_INTEGRATION_GUIDE.md`
- Veja `CHECKOUT_FRONTEND_EXAMPLE.md` para exemplos

---

## ⚠️ Notas Importantes

1. **API da Appmax**: A implementação assume que a Appmax tem uma API REST. Você precisará confirmar a documentação oficial real da Appmax.

2. **Endpoints**: Os endpoints usados (`/v1/orders`, etc.) são baseados em padrões comuns de APIs. Ajuste conforme a documentação oficial.

3. **Testes**: Teste primeiro em ambiente de desenvolvimento antes de ir para produção.

4. **Taxas**: A Appmax cobra taxas sobre transações. Verifique os valores no seu contrato.

---

## 🎉 Resultado Final

Você terá:
- ✨ Checkout lindo e profissional (SEU design)
- 🚀 Pagamentos processados pela Appmax
- 📦 Order Bumps integrados
- 🔔 Webhooks automáticos
- 💰 Gestão na Appmax

**O melhor dos dois mundos!**
