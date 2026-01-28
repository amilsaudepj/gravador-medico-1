# 🔍 Sistema de Logging Detalhado para Debug de Checkout

## Contexto
Para debugar o **Erro 402** onde o Mercado Pago recusava transações após gerar o token com sucesso, implementamos um sistema de logging detalhado que grava todas as tentativas de pagamento no banco de dados.

## Tabela: `checkout_logs`

### Estrutura
```sql
CREATE TABLE checkout_logs (
  id UUID PRIMARY KEY,
  session_id TEXT,
  order_id TEXT,
  gateway TEXT NOT NULL,           -- 'mercadopago', 'appmax'
  status TEXT NOT NULL,             -- 'SUCCESS', 'ERROR', 'FALLBACK'
  payload_sent JSONB,               -- Dados enviados ao gateway
  response_data JSONB,              -- Resposta de sucesso
  error_response JSONB,             -- Resposta de erro completa
  error_message TEXT,               -- Mensagem de erro
  error_cause TEXT,                 -- Causa/tipo do erro
  http_status INTEGER,              -- Status HTTP da resposta
  created_at TIMESTAMP WITH TIME ZONE
);
```

### Como Executar no Supabase
1. Acesse o **SQL Editor** no Supabase
2. Execute o arquivo: `database/CREATE-CHECKOUT-LOGS.sql`
3. Verifique se a tabela foi criada: `SELECT * FROM checkout_logs LIMIT 1;`

## O Que é Logado

### ✅ Mercado Pago - Sucesso
```json
{
  "gateway": "mercadopago",
  "status": "SUCCESS",
  "payload_sent": {
    "transaction_amount": 97,
    "payment_method_id": "credit_card",
    "payer_email": "cliente@email.com",
    "token": "a3f5d7c..."
  },
  "response_data": {
    "id": 12345678,
    "status": "approved",
    "payment_method_id": "visa"
  },
  "http_status": 200
}
```

### ❌ Mercado Pago - Erro 402
```json
{
  "gateway": "mercadopago",
  "status": "ERROR",
  "payload_sent": {
    "transaction_amount": 97,
    "payment_method_id": "credit_card",
    "payer": {
      "email": "cliente@email.com",
      "identification": { "type": "CPF", "number": "12345678900" }
    }
  },
  "error_response": {
    "status": "rejected",
    "status_detail": "cc_rejected_bad_filled_card_number",
    "message": "Invalid card number"
  },
  "error_message": "Invalid card number",
  "http_status": 402
}
```

### 🔄 AppMax - Fallback
```json
{
  "gateway": "appmax",
  "status": "SUCCESS",
  "payload_sent": {
    "customer": { "name": "João", "email": "joao@email.com" },
    "payment_method": "credit_card",
    "card_data": { "number": "****1234" }
  },
  "response_data": {
    "success": true,
    "order_id": "APM-123456",
    "status": "approved"
  }
}
```

## Como Consultar os Logs

### Ver últimas tentativas com erro
```sql
SELECT 
  created_at,
  order_id,
  gateway,
  status,
  error_message,
  http_status,
  payload_sent->>'transaction_amount' as valor,
  error_response
FROM checkout_logs
WHERE status = 'ERROR'
ORDER BY created_at DESC
LIMIT 20;
```

### Analisar erros 402 do Mercado Pago
```sql
SELECT 
  created_at,
  order_id,
  payload_sent,
  error_response,
  error_message
FROM checkout_logs
WHERE gateway = 'mercadopago'
  AND http_status = 402
ORDER BY created_at DESC;
```

### Ver histórico de um pedido específico
```sql
SELECT 
  created_at,
  gateway,
  status,
  payload_sent,
  response_data,
  error_response
FROM checkout_logs
WHERE order_id = 'seu-order-id-aqui'
ORDER BY created_at ASC;
```

### Taxa de sucesso por gateway
```sql
SELECT 
  gateway,
  status,
  COUNT(*) as total,
  ROUND(COUNT(*)::decimal / SUM(COUNT(*)) OVER (PARTITION BY gateway) * 100, 2) as percentual
FROM checkout_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY gateway, status
ORDER BY gateway, status;
```

## Pontos Logados no Código

### 1. Mercado Pago - Antes da chamada
- Payload completo (sem dados sensíveis completos)
- Token truncado para segurança

### 2. Mercado Pago - Após resposta
- Se **SUCESSO**: Grava dados do pagamento aprovado
- Se **ERRO**: Grava erro completo, status_detail, cause

### 3. Mercado Pago - Erro de rede
- Timeout, erros de conexão, AbortError
- Stack trace completo

### 4. Mercado Pago - Catch geral
- Qualquer exceção não tratada
- Tipo de erro, mensagem, stack

### 5. AppMax - Resultado
- Sucesso ou falha do fallback
- Payload sanitizado (CVV e número completo ocultos)

### 6. AppMax - Catch
- Erros de integração com AppMax
- Detalhes da exceção

## Segurança e Privacidade

### ✅ Dados Seguros
- Tokens truncados (primeiros 10 caracteres)
- Número de cartão: apenas últimos 4 dígitos
- CVV: sempre `***` nos logs

### ❌ Nunca Gravado
- Token completo de cartão
- Número completo de cartão
- CVV real

## Benefícios

1. **Debug Rápido**: Ver exatamente o que foi enviado ao gateway
2. **Análise de Padrões**: Identificar erros recorrentes
3. **Auditoria**: Histórico completo de tentativas
4. **Performance**: Monitorar tempos de resposta
5. **Taxa de Aprovação**: Calcular conversão por gateway

## Próximos Passos

Após executar o SQL no Supabase:
1. Fazer uma compra de teste
2. Consultar `SELECT * FROM checkout_logs ORDER BY created_at DESC LIMIT 5;`
3. Analisar os payloads e respostas
4. Identificar o motivo exato do erro 402

---

**Arquivo SQL**: `database/CREATE-CHECKOUT-LOGS.sql`  
**Implementado em**: `app/api/checkout/enterprise/route.ts`  
**Data**: 28/01/2026
