# 📚 Appmax API - Referência Completa

## 🔑 Autenticação

Todas as requisições precisam do header de autenticação:

```
Authorization: Bearer SEU_TOKEN_AQUI
```

---

## 📦 Endpoints Principais

### 1. Criar Pedido

**POST** `/v1/orders`

Cria um novo pedido na Appmax.

**Request:**
```json
{
  "customer": {
    "name": "Dr. João Silva",
    "email": "joao@exemplo.com",
    "phone": "11999999999",
    "cpf": "12345678900",
    "address": {
      "zipcode": "01310-100",
      "street": "Av. Paulista",
      "number": "1000",
      "complement": "Apto 101",
      "neighborhood": "Bela Vista",
      "city": "São Paulo",
      "state": "SP"
    }
  },
  "product_id": "32880073",
  "quantity": 1,
  "payment_method": "credit_card", // ou "pix", "boleto"
  "order_bumps": [
    {
      "product_id": "12345",
      "quantity": 1
    }
  ],
  "card_data": {
    "number": "4111111111111111",
    "holder_name": "JOAO SILVA",
    "exp_month": "12",
    "exp_year": "2028",
    "cvv": "123",
    "installments": 1
  },
  "utm_params": {
    "utm_source": "instagram",
    "utm_medium": "stories",
    "utm_campaign": "black_friday"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "id": "ORDER_ABC123",
  "status": "approved", // ou "pending"
  "payment_url": "https://...",
  "pix_qr_code": "00020126580014...",
  "pix_qr_code_base64": "data:image/png;base64,...",
  "boleto_url": "https://...",
  "created_at": "2026-01-19T10:30:00Z"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "invalid_card",
  "message": "Cartão inválido ou recusado"
}
```

---

### 2. Buscar Pedido

**GET** `/v1/orders/:orderId`

Busca informações de um pedido específico.

**Response:**
```json
{
  "id": "ORDER_ABC123",
  "status": "approved",
  "customer": {
    "name": "Dr. João Silva",
    "email": "joao@exemplo.com"
  },
  "items": [
    {
      "product_id": "32880073",
      "product_name": "Método Gravador Médico",
      "quantity": 1,
      "price": 36.00
    }
  ],
  "total": 36.00,
  "payment_method": "credit_card",
  "created_at": "2026-01-19T10:30:00Z",
  "approved_at": "2026-01-19T10:31:00Z"
}
```

---

### 3. Validar Acesso do Cliente

**POST** `/v1/customers/validate`

Verifica se um cliente tem acesso a um produto.

**Request:**
```json
{
  "email": "joao@exemplo.com",
  "product_id": "32880073"
}
```

**Response:**
```json
{
  "has_access": true,
  "purchase_date": "2026-01-19T10:31:00Z",
  "order_id": "ORDER_ABC123"
}
```

---

### 4. Listar Produtos

**GET** `/v1/products`

Lista todos os seus produtos.

**Response:**
```json
{
  "products": [
    {
      "id": "32880073",
      "name": "Método Gravador Médico Completo",
      "price": 36.00,
      "status": "active"
    }
  ]
}
```

---

## 🔔 Webhooks

A Appmax envia webhooks para eventos importantes:

### Configurar Webhook

No painel da Appmax:
1. Vá em **Configurações** → **Webhooks**
2. Adicione sua URL: `https://seusite.com/api/webhook/appmax`
3. Selecione os eventos desejados

### Eventos Disponíveis

- `order.created` - Pedido criado
- `order.approved` - Pagamento aprovado
- `order.cancelled` - Pedido cancelado
- `order.refunded` - Pedido reembolsado

### Payload do Webhook

```json
{
  "event": "order.approved",
  "order_id": "ORDER_ABC123",
  "customer": {
    "name": "Dr. João Silva",
    "email": "joao@exemplo.com",
    "cpf": "12345678900"
  },
  "product_id": "32880073",
  "amount": 36.00,
  "payment_method": "credit_card",
  "timestamp": "2026-01-19T10:31:00Z"
}
```

### Validar Webhook

A Appmax envia um header de assinatura:

```
X-Appmax-Signature: sha256=...
```

Valide usando HMAC SHA256 com seu secret key.

---

## 💳 Formas de Pagamento

### PIX
- Status inicial: `pending`
- QR Code válido por 30 minutos
- Aprovação instantânea após pagamento

### Cartão de Crédito
- Status inicial: `pending` ou `approved`
- Pode requerer 3D Secure (redirecionar para `payment_url`)
- Aprovação em até 5 segundos

### Boleto
- Status inicial: `pending`
- Válido por 3 dias
- Aprovação em até 2 dias úteis

---

## 📊 Status de Pedidos

| Status | Descrição |
|--------|-----------|
| `pending` | Aguardando pagamento |
| `approved` | Pagamento aprovado |
| `processing` | Processando pagamento |
| `rejected` | Pagamento recusado |
| `cancelled` | Pedido cancelado |
| `refunded` | Pedido reembolsado |

---

## ⚠️ Códigos de Erro

| Código | Descrição |
|--------|-----------|
| `invalid_card` | Cartão inválido |
| `insufficient_funds` | Saldo insuficiente |
| `expired_card` | Cartão expirado |
| `invalid_cvv` | CVV inválido |
| `fraud_detected` | Possível fraude |
| `customer_not_found` | Cliente não encontrado |
| `product_not_found` | Produto não encontrado |

---

## 🔒 Segurança

### Rate Limiting
- **60 requisições por minuto** por IP
- Header `X-RateLimit-Remaining` indica requisições restantes

### Retry Logic
- Use **exponential backoff** em caso de erro 429 ou 500
- Exemplo: 1s → 2s → 4s → 8s

### Webhook Security
- Sempre valide a assinatura `X-Appmax-Signature`
- Use HTTPS (obrigatório)
- Responda com status 200 rapidamente (< 5s)

---

## 🧪 Ambiente de Testes

A Appmax pode ter um ambiente sandbox (verificar documentação oficial).

**Base URL Sandbox:** `https://sandbox-api.appmax.com.br`

### Cartões de Teste

| Número | Resultado |
|--------|-----------|
| 4111 1111 1111 1111 | Aprovado |
| 4000 0000 0000 0002 | Recusado |
| 5555 5555 5555 4444 | Erro de processamento |

---

## 📞 Suporte

- **Documentação Oficial**: https://api.appmax.com.br/docs
- **Status da API**: https://status.appmax.com.br
- **Suporte**: Painel Appmax → Ajuda
