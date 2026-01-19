# 🛒 Fluxo de Checkout - Gravador Médico

## 📋 Solução Atual (Híbrida - Redirect)

### Como Funciona:

```mermaid
Cliente → Checkout Customizado → Appmax Hospedado → Pagamento → Webhook
```

### Passo a Passo:

1. **Cliente na Home** (`gravadormedico.com.br`)
   - Clica em "COMPRAR AGORA"
   - → Redireciona para `/checkout`

2. **Checkout Customizado** (`/checkout`)
   - ✅ PASSO 1: Preenche dados pessoais (nome, email, telefone, CPF)
   - ✅ PASSO 2: Seleciona Order Bumps (opcional)
   - ✅ PASSO 3: Escolhe método de pagamento (PIX ou Cartão)
   - Clica em "FINALIZAR COMPRA"
   - → Envia dados para `/api/checkout`

3. **Backend** (`/api/checkout`)
   - Recebe os dados
   - Monta URL da Appmax: `https://gravadormedico1768482029857.carrinho.app/one-checkout/ocudf/32880073`
   - Adiciona query params: `?name=...&email=...&phone=...&cpf=...`
   - → Retorna URL de redirect

4. **Frontend Redireciona**
   - `window.location.href = redirectUrl`
   - → Cliente vai para o checkout HOSPEDADO da Appmax

5. **⚠️ Checkout Appmax** (IMPORTANTE!)
   - Cliente vê formulário da Appmax (já pré-preenchido)
   - **PRECISA CLICAR EM "CONTINUAR" ou "FINALIZAR COMPRA"**
   - Appmax processa o pagamento
   - Gera PIX ou processa cartão
   - → Cria o pedido no painel Appmax

6. **Webhook Notifica** (`/api/webhook/appmax`)
   - Appmax envia evento "OrderApproved" ou "OrderPaid"
   - Sistema cria usuário no Supabase
   - Libera acesso ao produto

---

## ⚠️ Problema Atual

### Erro 1003 - "Algo inesperado aconteceu"

**Causas Possíveis:**

1. **Deploy em Andamento**
   - Vercel ainda está publicando a nova versão
   - Aguarde 2-3 minutos

2. **Servidor Appmax Temporariamente Indisponível**
   - Erro temporário da infraestrutura Appmax
   - Tente novamente em alguns minutos

3. **URL Inválida**
   - Falta algum parâmetro obrigatório
   - Veremos nos logs

---

## 🔄 Solução Alternativa (API Direta)

Se você quiser processar TUDO sem redirect:

### Vantagens:
- ✅ Cliente nunca sai do seu site
- ✅ Controle total do fluxo
- ✅ Pode mostrar PIX QR Code diretamente

### Desvantagens:
- ❌ Precisa de acesso à API v3 da Appmax
- ❌ Mais complexo para manter
- ❌ Pode não estar disponível no seu plano

### Arquivo já criado:
- `app/api/checkout/route-api.ts` (pronto para usar)

Para ativar:
```bash
mv app/api/checkout/route.ts app/api/checkout/route-redirect.ts
mv app/api/checkout/route-api.ts app/api/checkout/route.ts
```

---

## 📊 Order Bumps

### Problema Atual:

A URL da Appmax **não permite enviar múltiplos produtos**. Só aceita:
- `/ocudf/{productId}` - Um produto único

### Soluções:

1. **Configurar no Painel Appmax** (RECOMENDADO)
   - Vá em Produtos > Editar Produto Principal
   - Configure os 3 order bumps lá
   - Eles aparecerão automaticamente no checkout

2. **Usar API Direta**
   - Permite enviar array de produtos
   - Mas precisa de acesso à API

3. **Criar Bundles/Kits**
   - Criar produtos combinados no painel
   - Ex: "Gravador + VIP", "Gravador + Biblioteca"

---

## 🧪 Como Testar

### Teste Completo:

1. Acesse: `https://gravadormedico.com.br`
2. Clique em "COMPRAR AGORA"
3. Preencha todos os dados
4. Selecione order bumps (opcional)
5. Escolha PIX
6. Clique em "FINALIZAR COMPRA"
7. **Na página da Appmax, clique em "CONTINUAR"**
8. Veja o PIX gerado
9. Faça um pagamento de teste
10. Verifique o webhook: `https://gravadormedico.com.br/api/webhook/appmax`

### Teste de API (para desenvolvedores):

```bash
# Teste criação de cliente + pedido + PIX
curl http://localhost:3000/api/test/appmax-api

# Teste webhook
curl -X POST http://localhost:3000/api/webhook/appmax \
  -H "Content-Type: application/json" \
  -d '{
    "event": "OrderApproved",
    "data": {
      "id": 123456,
      "customer": {
        "email": "teste@teste.com",
        "firstname": "Teste",
        "lastname": "API"
      },
      "status": "aprovado",
      "paid_at": "2026-01-19 10:00:00"
    }
  }'
```

---

## 📞 Próximos Passos

1. ✅ Aguardar deploy do Vercel (~2 min)
2. ✅ Testar novamente em produção
3. ⚠️ Se erro 1003 persistir:
   - Verificar painel Appmax
   - Testar com produto diferente
   - Contatar suporte Appmax

4. 💡 Configurar Order Bumps no painel Appmax (recomendado)

---

## 🔗 Links Importantes

- **Site**: https://gravadormedico.com.br
- **Checkout**: https://gravadormedico.com.br/checkout
- **Webhook**: https://gravadormedico.com.br/api/webhook/appmax
- **Painel Appmax**: https://admin.appmax.com.br
- **Vercel**: https://vercel.com/helciodmtts-projects/gravador-medico

---

## 📚 Documentação

- [Appmax API](https://docs.appmax.com.br/api/)
- [Appmax Webhooks](https://docs.appmax.com.br/webhooks/)
- [Next.js App Router](https://nextjs.org/docs/app)
