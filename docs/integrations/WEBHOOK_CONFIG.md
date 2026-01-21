# ⚙️ Configuração do Webhook Appmax

## 📍 URL do Webhook Configurada

```
https://www.gravadormedico.com.br/api/webhook/appmax
```

## 🔧 Como Configurar no Painel Appmax

1. **Acesse:** https://admin.appmax.com.br
2. **Menu:** Configurações → Webhooks ou Integrações
3. **Adicione a URL:** `https://www.gravadormedico.com.br/api/webhook/appmax`
4. **Selecione os Eventos:**
   - ✅ Pagamento Aprovado
   - ✅ Pagamento Recusado
   - ✅ Pagamento Cancelado
   - ✅ Estorno
   - ✅ Chargeback
5. **Copie o Secret gerado** e adicione no `.env.local`:
   ```
   APPMAX_WEBHOOK_SECRET=seu_secret_aqui
   ```

## 📦 Produtos Configurados

### Produto Principal
- **ID:** 32880073
- **Link:** https://gravadormedico1768482029857.carrinho.app/one-checkout/ocudf/32880073

### Order Bump 1 - Consultoria VIP
- **ID:** 32989468
- **Link:** https://gravadormedico1768482029857.carrinho.app/one-checkout/ocmdf/32989468

### Order Bump 2 - Biblioteca Premium
- **ID:** 32989503
- **Link:** https://gravadormedico1768482029857.carrinho.app/one-checkout/ocmdf/32989503

### Order Bump 3 - Treinamento Avançado
- **ID:** 32989520
- **Link:** https://gravadormedico1768482029857.carrinho.app/one-checkout/ocmdf/32989520

## 🔐 Segurança do Webhook

O endpoint `/api/webhook/appmax` está preparado para:
- ✅ Validar assinatura usando HMAC-SHA256
- ✅ Verificar timestamp para evitar replay attacks
- ✅ Processar apenas eventos válidos
- ✅ Log de todos os eventos recebidos

## 🧪 Teste o Webhook

Para testar localmente:
```bash
# Use ngrok para expor sua máquina local
ngrok http 3000

# Use a URL gerada no painel Appmax
https://abc123.ngrok.io/api/webhook/appmax
```

## 📊 Eventos Processados

O webhook processa os seguintes status:
- `approved` - Pagamento aprovado → Libera acesso
- `pending` - Aguardando pagamento PIX
- `refused` - Pagamento recusado
- `canceled` - Pagamento cancelado
- `refunded` - Pagamento estornado
- `chargedback` - Chargeback

## ⚠️ Importante

**Webhook Secret:** Ainda não configurado! 
Você precisa:
1. Acessar o painel Appmax
2. Ir em Configurações → Webhooks
3. Copiar o secret gerado
4. Adicionar no `.env.local` como `APPMAX_WEBHOOK_SECRET`

Sem o secret, o webhook não conseguirá validar os eventos recebidos.
