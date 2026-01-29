# 📦 DEPLOY - CORREÇÕES E AUDITOR

## 🎯 O QUE FOI IMPLEMENTADO

### 1. ✅ FIX: Webhook Mercado Pago - Salvar Phone/CPF
**Problema:** Colunas de telefone e CPF vazias na tabela de vendas  
**Causa:** Webhook MP não estava salvando dados do checkout  
**Solução:** Buscar phone/cpf em `checkout_attempts` e salvar em `sales`

**Arquivo:** `lib/mercadopago-webhook.ts`
- Busca dados de `checkout_attempts` usando `mercadopago_payment_id`
- Extrai `customer_phone` e `customer_cpf`
- Atualiza `sales` junto com status e payment_details
- Só atualiza se os campos ainda estiverem vazios (não sobrescreve)

### 2. ✅ FIX: API Resend Email - Query Corrigida
**Problema:** Erro "Erro ao buscar venda no banco"  
**Causa:** Query usava `.eq('order_status', 'paid')` mas campo é `status`  
**Solução:** Usar `.in('status', ['paid', 'provisioning', 'active'])`

**Arquivo:** `app/api/admin/resend-email/route.ts`
- Corrigiu nome do campo de `order_status` para `status`
- Expandiu busca para incluir status `provisioning` e `active`
- Melhorou mensagem de erro com log de debug

### 3. 🛡️ NOVO: Auditor de Consistência (Cron Job)
**Objetivo:** Recuperação automática de vendas aprovadas esquecidas  
**Frequência:** A cada 2 minutos (120x/dia)  
**Proteção:** Garantir que NENHUMA venda paga seja perdida

**Arquivo:** `app/api/cron/audit-recovery/route.ts`

#### Como Funciona:
1. **Busca vendas `paid`** nas últimas 24 horas
2. **Verifica se estão na fila** (`provisioning_queue`)
3. **Verifica se foram processadas** (`integration_logs`)
4. **Recupera vendas esquecidas:**
   - Insere na fila com status `pending`
   - Registra log de auditoria
   - Exibe alerta detalhado no console

#### Segurança:
- Autenticação via Bearer Token (`CRON_SECRET`)
- Proteção contra duplicação
- Janela de 24h (evita reprocessar vendas antigas)
- Logs completos para auditoria

---

## 📁 ARQUIVOS MODIFICADOS

### Webhooks
- ✅ `lib/mercadopago-webhook.ts` - Adicionar extração de phone/cpf

### APIs Admin
- ✅ `app/api/admin/resend-email/route.ts` - Corrigir query de busca

### Cron Jobs (NOVO)
- ✅ `app/api/cron/audit-recovery/route.ts` - Auditor de Consistência
- ✅ `vercel.json` - Configuração do cron (*/2 * * * *)

### Configuração
- ✅ `.env.example` - Adicionar `CRON_SECRET`

### Documentação
- ✅ `AUDITOR-CONSISTENCIA.md` - Documentação completa

---

## 🚀 PASSOS PARA DEPLOY

### 1. Configurar Variável de Ambiente
```bash
# Vercel Dashboard > Settings > Environment Variables
CRON_SECRET=gerar-valor-aleatorio-seguro-aqui
```

### 2. Fazer Deploy
```bash
git add -A
git commit -m "fix: MP webhook phone/cpf + resend email query + auditor consistência"
git push
vercel --prod
```

### 3. Verificar Cron Ativo
- Acessar: https://vercel.com/seu-projeto/settings/cron-jobs
- Confirmar: `/api/cron/audit-recovery` está ativo (*/2 * * * *)

---

## 🧪 TESTAR APÓS DEPLOY

### 1. Testar Webhook MP (Phone/CPF)
```bash
# Fazer compra via Mercado Pago
# Verificar na tabela de vendas se phone/cpf foram salvos
```

### 2. Testar Resend Email
```bash
# No dashboard admin
# Clicar em "Reenviar Email" em alguma venda
# Verificar se envia sem erro
```

### 3. Testar Auditor (Manual)
```bash
curl -X GET https://seu-dominio.com/api/cron/audit-recovery \
  -H "Authorization: Bearer seu-cron-secret"
```

### 4. Monitorar Logs do Cron
```bash
# Vercel Dashboard > Logs
# Filtrar por: /api/cron/audit-recovery
# Verificar execuções a cada 2 minutos
```

---

## 📊 MÉTRICAS ESPERADAS

### Webhook MP
- ✅ 100% das vendas MP devem ter phone/cpf salvos
- ✅ Dados aparecem imediatamente após pagamento

### Resend Email
- ✅ 0% de erros "venda não encontrada"
- ✅ Emails enviados com sucesso

### Auditor
- ✅ Taxa de recuperação < 1% (ideal: 0%)
- ✅ Tempo de detecção: máximo 2 minutos
- ✅ Tempo de execução: < 3 segundos

---

## ⚠️ IMPORTANTE

### Variável CRON_SECRET
**CRÍTICO:** Configure um valor seguro no Vercel!

```bash
# Gerar valor aleatório seguro:
openssl rand -base64 32

# Exemplo de valor gerado:
CRON_SECRET=xK8mP3nQ9wR2tY5vU7zB1cD4fG6hJ8kL0mN2pQ5rS7tV9xZ1
```

### Monitoramento Contínuo
- **Primeiras 24h:** Monitorar logs ativamente
- **Primeira semana:** Verificar métricas de recuperação
- **Rotina:** Revisar logs de auditoria semanalmente

---

## 🎯 CHECKLIST PRÉ-DEPLOY

- [x] Código sem erros de TypeScript
- [x] Webhook MP com extração de phone/cpf
- [x] API resend email com query corrigida
- [x] Auditor de Consistência implementado
- [x] Cron configurado em vercel.json
- [x] CRON_SECRET em .env.example
- [x] Documentação completa criada
- [ ] CRON_SECRET configurado no Vercel (FAZER ANTES DO DEPLOY!)
- [ ] Git commit + push
- [ ] Deploy no Vercel
- [ ] Teste de webhook MP
- [ ] Teste de resend email
- [ ] Teste manual do auditor
- [ ] Monitoramento de 24h

---

## 📞 PRÓXIMOS PASSOS

1. **Configure CRON_SECRET no Vercel** (CRÍTICO!)
2. **Faça o deploy**
3. **Teste cada funcionalidade**
4. **Monitore logs por 24h**
5. **Documente resultados**

---

## 🏆 RESULTADO ESPERADO

✅ **Phone/CPF salvos:** 100% das vendas MP  
✅ **Resend Email:** 0% de erros  
✅ **Zero Vendas Perdidas:** Recovery em até 2 minutos  
✅ **Sistema Robusto:** Múltiplas camadas de proteção  
✅ **Auditoria Completa:** Logs de todas as operações  

---

**Status:** ✅ Pronto para Deploy  
**Data:** 29/01/2026  
**Versão:** 1.0.0
