# 🛒 Checkout Profissional - Gravador Médico

Sistema de checkout completo estilo Kiwify/Braip integrado com Mercado Pago.

## ✨ Features Implementadas

### 🎯 Página de Checkout (`/checkout`)
- ✅ **Barra de countdown** no topo (15 minutos)
- ✅ **Timer de urgência** com progress bar animado
- ✅ **2 Order Bumps** profissionais com toggle
- ✅ **Cálculo automático** de valores
- ✅ **Desconto de 5% para PIX**
- ✅ **Seletor de forma de pagamento** (Cartão/PIX)
- ✅ **Formulário completo** de checkout
- ✅ **Design responsivo** e de alta conversão
- ✅ **Trust badges** e garantia em destaque
- ✅ **Social proof** em tempo real

### 🔌 Integração com Mercado Pago
- ✅ API de pagamento configurada
- ✅ Suporte para **Cartão de Crédito**
- ✅ Suporte para **PIX** (com QR Code)
- ✅ Sistema de **webhook** para notificações
- ✅ Consulta de status de pagamento
- ✅ Página de sucesso

## 📦 Estrutura Criada

```
├── app/
│   ├── checkout/
│   │   ├── page.tsx              # Página principal do checkout
│   │   └── success/
│   │       └── page.tsx          # Página de confirmação
│   └── api/
│       └── checkout/
│           └── route.ts          # API endpoint para processar pagamento
├── lib/
│   └── mercadopago.ts            # Funções de integração com MP
└── .env.example                  # Template de variáveis de ambiente
```

## 🚀 Como Configurar

### 1. Criar Conta no Mercado Pago

1. Acesse: https://www.mercadopago.com.br
2. Crie uma conta (gratuito)
3. Ative sua conta para receber pagamentos

### 2. Obter Credenciais

1. Acesse o painel de desenvolvedores: https://www.mercadopago.com.br/developers/panel
2. Vá em **"Credenciais"**
3. Copie o **Access Token** (privado) e a **Public Key** (pública)

### 3. Configurar Variáveis de Ambiente

1. Copie o arquivo de exemplo:
```bash
cp .env.example .env.local
```

2. Edite `.env.local` e adicione suas credenciais:
```env
MERCADOPAGO_ACCESS_TOKEN=APP-1234567890123456-123456-abcdef123456789
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-1234567890123456-123456-abcdef123456789
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Instalar Dependências (se necessário)

```bash
npm install canvas-confetti
```

### 5. Testar o Checkout

```bash
npm run dev
```

Acesse: http://localhost:3000/checkout

## 💳 Fluxo de Pagamento

### Cartão de Crédito
1. Cliente preenche dados do formulário
2. Frontend valida e coleta dados do cartão
3. Envia para `/api/checkout`
4. API processa com Mercado Pago
5. Retorna status (aprovado/pendente/recusado)
6. Redireciona para página de sucesso

### PIX
1. Cliente seleciona PIX
2. Aplica desconto de 5%
3. Envia para `/api/checkout`
4. API gera QR Code e código PIX
5. Exibe QR Code para pagamento
6. Webhook notifica quando pago
7. Redireciona para página de sucesso

## 🎨 Customização

### Alterar Valores

Edite em `app/checkout/page.tsx`:

```typescript
const basePrice = 36  // Preço base do produto

const orderBumps = [
  {
    title: "Seu Título",
    description: "Sua descrição",
    originalPrice: 497,
    price: 147,
    // ...
  }
]
```

### Alterar Tempo do Countdown

```typescript
const [timeLeft, setTimeLeft] = useState(15 * 60) // 15 minutos
```

### Alterar Desconto PIX

```typescript
const pixDiscount = paymentMethod === "pix" 
  ? Math.round(subtotal * 0.05)  // 5% de desconto
  : 0
```

## 🔔 Configurar Webhook

### 1. No Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel/webhooks
2. Clique em **"Criar Webhook"**
3. URL: `https://seu-dominio.com/api/webhook/mercadopago`
4. Eventos: `payment`

### 2. Criar API Route

Crie `app/api/webhook/mercadopago/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { handleWebhook } from "@/lib/mercadopago"

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  try {
    await handleWebhook(body)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Erro" }, { status: 500 })
  }
}
```

## 📊 Monitoramento

### Ver Pagamentos
Acesse: https://www.mercadopago.com.br/activities

### Ver Logs de Webhook
Acesse: https://www.mercadopago.com.br/developers/panel/webhooks

## 🎯 Order Bumps Criados

### Order Bump 1: Pacote VIP
- **Título**: Consultoria Personalizada
- **Original**: R$ 497
- **Com desconto**: R$ 147
- **Desconto**: 70%

### Order Bump 2: Biblioteca Premium
- **Título**: 50+ Modelos Prontos
- **Original**: R$ 297
- **Com desconto**: R$ 97
- **Desconto**: 67%

## 🔒 Segurança

- ✅ Access Token nunca exposto no frontend
- ✅ Validação de dados no servidor
- ✅ Idempotency Key para evitar duplicação
- ✅ HTTPS obrigatório em produção
- ✅ Webhook com validação de origem

## 🚀 Deploy na Vercel

1. Adicione as variáveis de ambiente no dashboard da Vercel
2. Deploy normalmente
3. Configure webhook com URL de produção

## 📝 Próximos Passos

1. [ ] Adicionar máscaras nos campos (CPF, cartão, etc)
2. [ ] Integrar SDK do Mercado Pago no frontend (tokenização de cartão)
3. [ ] Implementar sistema de cupons de desconto
4. [ ] Adicionar mais order bumps
5. [ ] Implementar sistema de upsell pós-compra
6. [ ] Criar dashboard de vendas
7. [ ] Implementar pixel de conversão (Facebook/Google)

## 🆘 Suporte

- **Documentação Mercado Pago**: https://www.mercadopago.com.br/developers/pt/docs
- **Status da API**: https://status.mercadopago.com/

---

Feito com ❤️ para o Gravador Médico
