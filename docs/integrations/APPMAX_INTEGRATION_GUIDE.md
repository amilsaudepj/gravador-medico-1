# 🎯 Guia de Integração: Checkout Próprio + Appmax

## 📋 Visão Geral

Este guia mostra como usar seu **checkout customizado** mantendo a integração com a **Appmax** para processar pagamentos e gerenciar produtos.

### Vantagens desta Abordagem:

✅ **Checkout 100% customizado** com seu design e identidade visual  
✅ **Controle total da experiência** do usuário  
✅ **Order Bumps integrados** no seu design  
✅ **Appmax processa pagamentos** (sem precisar configurar gateways)  
✅ **Webhooks da Appmax** funcionam normalmente  
✅ **Gerenciamento de produtos** na Appmax  
✅ **Suporte ao cliente** via Appmax  

---

## 🔧 Configuração

### 1. Variáveis de Ambiente

Adicione ao seu arquivo `.env.local`:

```env
# Appmax API
APPMAX_API_URL=https://api.appmax.com.br
APPMAX_API_TOKEN=seu_token_aqui
APPMAX_PRODUCT_ID=32880073

# Order Bumps (criar produtos na Appmax)
APPMAX_ORDER_BUMP_VIP_ID=id_produto_vip
APPMAX_ORDER_BUMP_LIBRARY_ID=id_produto_biblioteca
```

### 2. Obter Token da API Appmax

1. Acesse o painel da Appmax
2. Vá em **Configurações** → **API**
3. Gere um novo token de API
4. Copie e cole no `.env.local`

### 3. Criar Produtos de Order Bump

Na Appmax, você precisa criar produtos separados para cada Order Bump:

1. **Produto VIP**: Consultoria Personalizada (R$ 147)
2. **Produto Biblioteca**: 50+ Modelos Prontos (R$ 97)

Anote os IDs desses produtos e adicione no `.env.local`.

---

## 💻 Como Funciona

### Fluxo de Compra

```
┌─────────────────────────────────────────────────────────┐
│  1. Cliente preenche seu checkout bonito               │
│     ✓ Dados pessoais                                   │
│     ✓ Seleciona order bumps                            │
│     ✓ Escolhe forma de pagamento                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  2. Seu frontend envia para /api/checkout              │
│     POST /api/checkout                                  │
│     { email, name, phone, cpf, paymentMethod, ... }    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  3. Sua API chama a API da Appmax                      │
│     createAppmaxOrder(data)                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  4. Appmax processa o pagamento                        │
│     ✓ Gera PIX QR Code                                 │
│     ✓ Processa cartão de crédito                       │
│     ✓ Cria o pedido no sistema                         │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  5. Você recebe a resposta                             │
│     { orderId, status, pixQrCode, ... }                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  6. Exibe para o cliente (seu design!)                 │
│     ✓ QR Code PIX                                       │
│     ✓ Confirmação de cartão                            │
│     ✓ Instruções de pagamento                          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  7. Appmax dispara webhook quando aprovado            │
│     POST /api/webhook/appmax                           │
│     { order_id, status: "approved", ... }              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  8. Seu webhook libera acesso                          │
│     ✓ Salva no banco de dados                          │
│     ✓ Envia email de boas-vindas                       │
│     ✓ Redireciona para /dashboard                      │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Estrutura de Dados

### Enviar para /api/checkout

```typescript
{
  // Dados do cliente
  name: "Dr. João Silva",
  email: "joao@exemplo.com",
  phone: "11999999999",
  cpf: "12345678900",
  
  // Endereço (opcional)
  address: {
    zipcode: "01310-100",
    street: "Av. Paulista",
    number: "1000",
    complement: "Apto 101",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP"
  },
  
  // Forma de pagamento
  paymentMethod: "pix", // ou "credit_card"
  
  // Order Bumps selecionados (índices)
  orderBumps: [0, 1], // 0 = VIP, 1 = Biblioteca
  
  // Dados do cartão (se paymentMethod = "credit_card")
  cardData: {
    number: "4111111111111111",
    holderName: "JOAO SILVA",
    expMonth: "12",
    expYear: "2028",
    cvv: "123",
    installments: 1
  },
  
  // UTM params (opcional)
  utmParams: {
    utm_source: "instagram",
    utm_medium: "stories",
    utm_campaign: "black_friday"
  }
}
```

### Resposta de /api/checkout

```typescript
{
  success: true,
  orderId: "ABC123456",
  status: "pending", // ou "approved"
  
  // Se for PIX
  pixQrCode: "00020126580014...",
  pixQrCodeBase64: "data:image/png;base64,...",
  
  // Se for boleto
  boletoUrl: "https://...",
  
  // Se for cartão
  paymentUrl: "https://..." // (se precisar 3DS)
}
```

---

## 🎨 Customização do Checkout

Seu checkout já está em `/app/checkout/page.tsx`. Para integrar com a Appmax:

### 1. Adicionar função de envio

```typescript
const handleCheckout = async () => {
  setLoading(true)
  
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        cpf: formData.cpf,
        paymentMethod: paymentMethod, // "pix" ou "credit_card"
        orderBumps: selectedOrderBumps, // [0, 1]
        cardData: paymentMethod === 'credit_card' ? {
          number: cardData.number,
          holderName: cardData.holderName,
          expMonth: cardData.expMonth,
          expYear: cardData.expYear,
          cvv: cardData.cvv,
          installments: cardData.installments
        } : undefined,
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      if (paymentMethod === 'pix') {
        // Exibir QR Code
        setPixQrCode(result.pixQrCodeBase64)
      } else {
        // Redirecionar para success
        router.push('/checkout/success?order=' + result.orderId)
      }
    } else {
      alert('Erro: ' + result.error)
    }
  } catch (error) {
    alert('Erro ao processar pagamento')
  } finally {
    setLoading(false)
  }
}
```

---

## 🔔 Webhooks

O webhook da Appmax já está configurado em `/api/webhook/appmax/route.ts`.

Quando um pagamento for aprovado:
1. Appmax envia POST para sua URL de webhook
2. Você valida e libera acesso ao usuário
3. Envia email de confirmação
4. Salva dados no banco

---

## 🚀 Próximos Passos

1. **Configure as variáveis de ambiente** no `.env.local`
2. **Obtenha o token da API** da Appmax
3. **Crie os produtos de Order Bump** na Appmax
4. **Atualize o checkout frontend** para chamar `/api/checkout`
5. **Teste com dados reais** (ambiente de sandbox da Appmax, se disponível)

---

## 📞 Suporte

Se precisar de ajuda:
- **Documentação Appmax**: https://api.appmax.com.br/docs
- **Suporte Appmax**: Entre em contato via painel

---

## ⚠️ Importante

- A Appmax cobra **taxas de transação** sobre cada venda
- Você precisa ter uma **conta ativa** na Appmax
- Configure o **webhook da Appmax** para apontar para sua URL
- Use **HTTPS** em produção (obrigatório para webhooks)
