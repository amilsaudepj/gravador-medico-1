# 🔄 Sistema de Redirecionamento Pós-Pagamento

## Visão Geral

Após a confirmação do pagamento (cartão ou PIX), o sistema redireciona automaticamente o cliente para a página de obrigado.

## Como Funciona

### 1. Fluxo do Pagamento

```
Cliente → Checkout → Pagamento → Webhook → Redirect → Página Obrigado
```

### 2. Componentes do Sistema

| Componente | Arquivo | Função |
|------------|---------|--------|
| Webhook MP | `app/api/webhooks/mercadopago-v3/route.ts` | Recebe notificação do Mercado Pago |
| Webhook Appmax | `app/api/webhooks/appmax/route.ts` | Recebe notificação da Appmax |
| Helper Redirect | `lib/redirect-helper.ts` | Gera e salva URL de redirect |
| API Redirect | `app/api/orders/[orderId]/redirect/route.ts` | Frontend consulta status |
| Hook React | `hooks/useOrderRedirect.ts` | Polling automático no frontend |

### 3. Tabela orders

A coluna `redirect_url` armazena a URL de redirecionamento:

```sql
-- Executar no Supabase SQL Editor
ALTER TABLE orders ADD COLUMN IF NOT EXISTS redirect_url TEXT;
```

## Uso no Frontend

### Hook useOrderRedirect

```tsx
import { useOrderRedirect } from '@/hooks/useOrderRedirect';

function CheckoutSuccess({ orderId }: { orderId: string }) {
  const { status, isApproved, redirectUrl, isLoading } = useOrderRedirect(orderId);

  // O hook faz polling automático e redireciona quando aprovado
  
  if (isLoading) {
    return <div>Verificando pagamento...</div>;
  }

  return (
    <div>
      <p>Status: {status}</p>
      {isApproved && <p>Pagamento aprovado! Redirecionando...</p>}
    </div>
  );
}
```

### API de Redirect

```bash
GET /api/orders/{orderId}/redirect

# Resposta quando aprovado:
{
  "should_redirect": true,
  "redirect_url": "/obrigado?order_id=xxx&name=João&email=joao@email.com",
  "status": "paid"
}

# Resposta quando pendente:
{
  "should_redirect": false,
  "status": "pending",
  "message": "Pagamento ainda não foi aprovado"
}
```

## Configuração

### Variáveis de Ambiente

```env
NEXT_PUBLIC_APP_URL=https://seusite.com
NEXT_PUBLIC_SUPABASE_URL=sua_url
SUPABASE_SERVICE_ROLE_KEY=sua_key
```

### Migration SQL

Execute no Supabase SQL Editor:

```sql
-- Arquivo: supabase/migrations/add-redirect-url-column.sql

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'redirect_url'
    ) THEN
        ALTER TABLE orders ADD COLUMN redirect_url TEXT;
    END IF;
END $$;
```

## Testando

1. **Fazer uma compra teste** no checkout
2. **Verificar nos logs** se o webhook recebeu a notificação
3. **Consultar a API**: `GET /api/orders/{orderId}/redirect`
4. **Verificar redirecionamento** para `/obrigado`

## Troubleshooting

### Não está redirecionando?

1. Verifique se a coluna `redirect_url` existe na tabela `orders`
2. Verifique os logs do webhook no Vercel/Supabase
3. Confirme que o status do pedido está como `paid` ou `approved`

### Webhook não está chegando?

1. Configure o webhook no painel do Mercado Pago/Appmax
2. Aponte para: `https://seusite.com/api/webhooks/mercadopago-v3`
3. Verifique se a URL está acessível publicamente

---

**Última atualização:** Janeiro 2026
