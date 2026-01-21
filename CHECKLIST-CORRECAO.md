# ✅ CHECKLIST DE CORREÇÃO - APPMAX INTEGRATION

## 🎯 OBJETIVO
Fazer os dados da Appmax chegarem na tabela `sales` e aparecerem no dashboard admin.

---

## 📋 PASSO A PASSO

### ☑️ ETAPA 1: Corrigir o Banco de Dados

- [ ] **1.1** Abrir [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] **1.2** Clicar em "SQL Editor" no menu lateral
- [ ] **1.3** Clicar em "New Query"
- [ ] **1.4** Copiar todo o conteúdo de: `database/CORRECAO-URGENTE-SCHEMA.sql`
- [ ] **1.5** Colar no editor SQL
- [ ] **1.6** Executar (botão "Run" ou `Cmd/Ctrl + Enter`)
- [ ] **1.7** Verificar se executou sem erros

**Resultado esperado:**
```
Success. No rows returned
```

---

### ☑️ ETAPA 2: Testar Localmente

- [ ] **2.1** Abrir terminal na pasta do projeto
- [ ] **2.2** Executar: `npm run dev` (deixar rodando)
- [ ] **2.3** Abrir NOVO terminal
- [ ] **2.4** Executar: `node scripts/diagnostico-completo.js`

**Resultado esperado:**
```
✅ Webhook enviado:        ✅
✅ Dados em sales:         ✅
✅ Queries dashboard:      ✅
✅ Tabela customers:       ✅
✅ Logs de webhook:        ✅

✅ TUDO FUNCIONANDO!
```

Se ainda mostrar ❌, volte à ETAPA 1 e verifique se o SQL foi executado corretamente.

---

### ☑️ ETAPA 3: Testar Dashboard Admin

- [ ] **3.1** Acessar: http://localhost:3000/admin/dashboard
- [ ] **3.2** Fazer login (se necessário)
- [ ] **3.3** Verificar se aparece a venda de teste
- [ ] **3.4** Verificar se métricas estão preenchidas

**Deve aparecer:**
- Total de vendas: > 0
- Receita total: > R$ 0,00
- Lista de vendas recentes

---

### ☑️ ETAPA 4: Testar Webhook Manualmente

- [ ] **4.1** Servidor dev ainda rodando (`npm run dev`)
- [ ] **4.2** Abrir novo terminal
- [ ] **4.3** Executar:

```bash
curl -X POST http://localhost:3000/api/webhook/appmax \
  -H "Content-Type: application/json" \
  -d '{
    "appmax_order_id": "TEST-MANUAL-001",
    "status": "approved",
    "customer": {
      "name": "Cliente Teste Manual",
      "email": "teste-manual@exemplo.com"
    },
    "total_amount": 497.00,
    "payment_method": "credit_card"
  }'
```

- [ ] **4.4** Verificar resposta (deve ser `200 OK`)
- [ ] **4.5** Atualizar dashboard admin (F5)
- [ ] **4.6** Venda "TEST-MANUAL-001" deve aparecer

---

### ☑️ ETAPA 5: Deploy em Produção

- [ ] **5.1** Commitar mudanças:
```bash
git add .
git commit -m "fix: corrigir schema sales e webhooks_logs para integração Appmax"
git push
```

- [ ] **5.2** Aguardar deploy no Vercel
- [ ] **5.3** Acessar: https://gravadormedico.com.br/admin/dashboard
- [ ] **5.4** Verificar se vendas de teste aparecem

---

### ☑️ ETAPA 6: Configurar Webhook na Appmax

- [ ] **6.1** Acessar painel Appmax
- [ ] **6.2** Ir em: Configurações > Webhooks (ou Integrações)
- [ ] **6.3** Adicionar novo webhook:
  - **URL:** `https://gravadormedico.com.br/api/webhook/appmax`
  - **Método:** POST
  - **Content-Type:** application/json
  - **Eventos:** Selecionar:
    - ✅ Pedido Criado
    - ✅ Pedido Pago
    - ✅ Pedido Cancelado
    - ✅ Pedido Reembolsado

- [ ] **6.4** Salvar configuração
- [ ] **6.5** Testar webhook (botão "Testar" se disponível)

---

### ☑️ ETAPA 7: Fazer Compra de Teste Real

- [ ] **7.1** Acessar: https://gravadormedico.com.br
- [ ] **7.2** Adicionar produto ao carrinho
- [ ] **7.3** Ir para checkout
- [ ] **7.4** Preencher dados (use email real para receber confirmação)
- [ ] **7.5** Usar dados de teste do gateway (se disponível)
- [ ] **7.6** Finalizar compra

**ATENÇÃO:** Use ambiente de teste/sandbox se disponível!

- [ ] **7.7** Aguardar 1-2 minutos
- [ ] **7.8** Acessar: https://gravadormedico.com.br/admin/dashboard
- [ ] **7.9** Verificar se venda apareceu
- [ ] **7.10** Verificar métricas atualizadas

---

### ☑️ ETAPA 8: Monitoramento

- [ ] **8.1** Abrir: Supabase Dashboard > Logs
- [ ] **8.2** Filtrar por tabela: `webhooks_logs`
- [ ] **8.3** Verificar se webhooks estão sendo recebidos
- [ ] **8.4** Verificar se há erros

- [ ] **8.5** No dashboard admin, ir em: /admin/webhooks (se existir)
- [ ] **8.6** Ver histórico de webhooks recebidos

---

## 🐛 TROUBLESHOOTING

### Problema: Ainda mostra coluna não existe

**Solução:**
1. Confirme que executou o SQL no projeto correto do Supabase
2. Tente executar novamente o `CORRECAO-URGENTE-SCHEMA.sql`
3. Verifique se está usando as variáveis de ambiente corretas (.env.local)

### Problema: Webhook retorna 500

**Solução:**
1. Verifique logs do servidor (`npm run dev`)
2. Veja o console.log detalhado
3. Confira se variáveis de ambiente estão configuradas

### Problema: Dados não aparecem no dashboard

**Solução:**
1. Verifique se venda tem status `approved`, `paid` ou `completed`
2. Tente clicar em "Todas as vendas" se houver filtro
3. Verifique tabela `sales` diretamente no Supabase

### Problema: RLS (Row Level Security) bloqueando acesso

**Solução:**
1. No Supabase, vá em: Database > Policies
2. Verifique se usuário atual é admin
3. Tabela `profiles` deve ter `role = 'admin'` para seu usuário

---

## 📊 VERIFICAÇÃO FINAL

Após completar todas as etapas, você deve ter:

✅ **Banco de dados:**
- Tabela `sales` com coluna `appmax_order_id`
- Tabela `webhooks_logs` com coluna `created_at`
- Tabela `customers` criada

✅ **Webhook:**
- Recebe dados da Appmax
- Salva em `sales` sem erros
- Loga tudo em `webhooks_logs`

✅ **Dashboard Admin:**
- Mostra vendas
- Métricas calculadas corretamente
- Gráficos preenchidos

✅ **Produção:**
- Webhook configurado na Appmax
- Vendas reais aparecendo no dashboard
- Tudo funcionando end-to-end

---

## 🎉 SUCESSO!

Quando todas as caixas estiverem marcadas ✅, a integração estará 100% funcional!

**Tempo estimado total:** 20-30 minutos

---

## 📞 PRÓXIMOS PASSOS (Opcional)

Após tudo funcionando, considere:

- [ ] Adicionar mais campos no webhook (endereço, CPF, etc)
- [ ] Criar recuperação de carrinhos abandonados
- [ ] Adicionar notificações por email
- [ ] Integrar com Meta CAPI para tracking
- [ ] Criar relatórios avançados
- [ ] Adicionar filtros no dashboard

---

**✅ COMECE AGORA!**

Etapa 1 → Copie e execute: `database/CORRECAO-URGENTE-SCHEMA.sql`
