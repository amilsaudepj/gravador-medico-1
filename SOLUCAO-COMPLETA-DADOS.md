# 🎯 SOLUÇÃO COMPLETA: Mercado Pago + Carrinhos Abandonados + AppMax

## ✅ O QUE JÁ ESTÁ IMPLEMENTADO

### 1. **Registro de Tentativas do Mercado Pago** ✅
- ✅ Código em `app/api/checkout/enterprise/route.ts` JÁ registra todas as tentativas
- ✅ Salva em `payment_attempts` com status: `success`, `rejected`, `failed`
- ✅ Inclui `rejection_code` para análise (ex: `cc_rejected_insufficient_funds`)

### 2. **Sincronização AppMax** ✅
- ✅ Código existe em `lib/appmax-sync.ts`
- ✅ API existe em `app/api/admin/sync-appmax/route.ts`
- ✅ Evita duplicatas por email + data

### 3. **Estrutura SQL** ⚠️
- ❌ **VIEWS NÃO EXECUTADAS**: `sales_by_gateway`, `cascata_analysis`, `sales_overview`
- ❌ **FUNÇÕES NÃO EXECUTADAS**: `get_gateway_stats`, `get_analytics_period`
- ✅ Tabelas existem: `sales`, `payment_attempts`, `abandoned_carts`

---

## 🚨 O PROBLEMA REAL

**VOCÊ NÃO EXECUTOU OS SQLs NO SUPABASE!**

Sem executar os SQLs:
- ❌ Views não existem
- ❌ Funções RPC não existem
- ❌ Dashboard não consegue buscar dados

---

## 🎯 SOLUÇÃO EM 3 PASSOS

### PASSO 1: Executar SQLs no Supabase (5 minutos - VOCÊ FAZ)

1. Acesse https://supabase.com/dashboard
2. Vá no seu projeto
3. Clique em **SQL Editor**
4. Execute **NA ORDEM**:

#### 1️⃣ Primeiro: `fix-mercadopago-analytics.sql`
```sql
-- Copie TODO o conteúdo de:
database/fix-mercadopago-analytics.sql

-- Cole no SQL Editor e clique RUN
-- Cria:
-- ✅ View: sales_by_gateway
-- ✅ View: payment_gateway_performance  
-- ✅ View: cascata_analysis
-- ✅ Função RPC: get_gateway_stats
```

#### 2️⃣ Depois: `fix-include-pending-sales.sql`
```sql
-- Copie TODO o conteúdo de:
database/fix-include-pending-sales.sql

-- Cole no SQL Editor e clique RUN
-- Atualiza:
-- ✅ Função: get_analytics_period (inclui vendas pendentes)
-- ✅ View: sales_overview
```

#### 3️⃣ Por último: Verificar
```sql
-- Cole este bloco para verificar:
-- (Conteúdo de VERIFICAR-DADOS-SUPABASE.sql)

-- Execute a query "DIAGNÓSTICO RÁPIDO"
-- Deve mostrar:
-- Views SQL: 3 / 3
-- Funções RPC: 2 / 2
```

---

### PASSO 2: Testar Mercado Pago (10 minutos - VOCÊ FAZ)

#### 2.1. Teste com Cartão RECUSADO
```
Ir em: https://gravadormedico.com.br/checkout

Preencher:
- Nome: Teste Recusa
- Email: teste@recusa.com
- CPF: 123.456.789-00
- Telefone: (21) 99999-9999

Cartão TESTE (será RECUSADO):
- Número: 5031 4332 1540 6351
- Nome: APRO
- Validade: 11/25
- CVV: 123

Clicar em "Finalizar Compra"
```

#### 2.2. Verificar no Supabase
```sql
-- Verificar tentativa registrada
SELECT * FROM payment_attempts 
WHERE provider = 'mercadopago' 
ORDER BY created_at DESC 
LIMIT 5;

-- Deve aparecer:
-- status: 'rejected'
-- rejection_code: 'cc_rejected_high_risk' (ou similar)
```

#### 2.3. Verificar no Dashboard
```
Ir em: /admin/payments
Tab: Mercado Pago

Deve aparecer:
✅ Tentativa recusada
✅ Email: teste@recusa.com
✅ Status: rejected
✅ Código: cc_rejected_high_risk
```

---

### PASSO 3: Sincronizar AppMax (5 minutos - VOCÊ FAZ)

#### 3.1. Obter Credenciais AppMax
```
1. Acesse: https://app.appmax.com.br
2. Configurações > Integrações > API
3. Copie:
   - TOKEN_KEY: eyJhbGci...
   - USER_CODE: 12345
```

#### 3.2. Adicionar no `.env`
```bash
# Adicione no arquivo .env
APPMAX_TOKEN_KEY=seu_token_aqui
APPMAX_USER_CODE=seu_user_code_aqui
```

#### 3.3. Testar API Manualmente
```bash
# Testar se credenciais funcionam
curl -X GET "https://app.appmax.com.br/api/order_list?start_date=2026-01-20&end_date=2026-01-27&status=paid" \
  -H "token-key: SEU_TOKEN" \
  -H "user-code: SEU_CODE"

# Deve retornar JSON com vendas
```

#### 3.4. Sincronizar via API
```bash
# Método 1: Via curl
curl -X POST http://localhost:3000/api/admin/sync-appmax \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'

# Método 2: Via navegador
# Ir em: /admin/payments
# Clicar no botão "Sincronizar AppMax"
```

#### 3.5. Verificar Vendas Importadas
```sql
-- Ver vendas AppMax sincronizadas
SELECT 
  customer_email,
  customer_name,
  total_amount,
  appmax_order_id,
  created_at
FROM sales
WHERE payment_gateway = 'appmax'
AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## 🔧 COMO TESTAR A API APPMAX

### Teste 1: Verificar Conexão
```bash
curl -X GET "https://app.appmax.com.br/api/order_list?start_date=2026-01-20&end_date=2026-01-27&status=paid" \
  -H "token-key: SEU_TOKEN_AQUI" \
  -H "user-code: SEU_CODE_AQUI" \
  -v

# Resposta esperada (200 OK):
{
  "success": true,
  "data": [
    {
      "id": 123456,
      "customer_email": "cliente@example.com",
      "customer_name": "João Silva",
      "amount": 497.00,
      "status": "paid",
      "created_at": "2026-01-25T10:30:00Z"
    }
  ]
}

# Erro comum (401 Unauthorized):
{
  "success": false,
  "message": "Invalid credentials"
}
# Solução: Verifique token-key e user-code
```

### Teste 2: Ver Campos Disponíveis
```bash
# Buscar 1 venda para ver estrutura completa
curl -X GET "https://app.appmax.com.br/api/order_list?limit=1" \
  -H "token-key: SEU_TOKEN" \
  -H "user-code: SEU_CODE" \
  | jq '.'

# Campos importantes:
# - id (guardar em appmax_order_id)
# - customer_email (chave para evitar duplicatas)
# - customer_name, customer_phone, customer_cpf
# - amount (valor em reais)
# - status (paid, pending, refunded, cancelled)
# - payment_method (credit_card, boleto, pix)
# - created_at, paid_at (timestamps)
```

### Teste 3: Filtrar por Data
```bash
# Últimos 7 dias
START_DATE=$(date -v-7d +%Y-%m-%d)  # macOS
END_DATE=$(date +%Y-%m-%d)

curl -X GET "https://app.appmax.com.br/api/order_list?start_date=$START_DATE&end_date=$END_DATE&status=paid" \
  -H "token-key: SEU_TOKEN" \
  -H "user-code: SEU_CODE"
```

---

## ❌ CARRINHOS ABANDONADOS - NÃO IMPLEMENTADO

**Status:** ⚠️ Sistema NÃO está criando carrinhos abandonados

**Por quê?**
- Tabela `abandoned_carts` existe
- Mas código não está salvando tentativas de checkout
- Não há cron job para detectar abandonos

**O que falta:**
1. Salvar em `checkout_attempts` quando usuário inicia checkout
2. Cron job para marcar como abandonado após 30 minutos
3. Criar registro em `abandoned_carts` com link de recuperação

**Implementar?** 
- ✅ SIM - mas é prioridade BAIXA
- Primeiro: Corrigir MP e AppMax (mais importante)

---

## 📊 CHECKLIST FINAL

### ✅ Alta Prioridade (Fazer AGORA)
- [ ] Executar `fix-mercadopago-analytics.sql` no Supabase
- [ ] Executar `fix-include-pending-sales.sql` no Supabase
- [ ] Executar `VERIFICAR-DADOS-SUPABASE.sql` para confirmar
- [ ] Testar checkout com cartão recusado (5031 4332 1540 6351)
- [ ] Verificar tentativa no dashboard admin

### ✅ Média Prioridade (Fazer HOJE)
- [ ] Obter credenciais AppMax (token-key, user-code)
- [ ] Adicionar no `.env`
- [ ] Testar API com curl
- [ ] Sincronizar vendas via API
- [ ] Verificar vendas importadas no dashboard

### 🔷 Baixa Prioridade (Semana que vem)
- [ ] Implementar carrinhos abandonados
- [ ] Criar cron job de detecção
- [ ] Email de recuperação
- [ ] Dashboard de carrinhos abandonados

---

## 🚀 RESUMO EXECUTIVO

**Problema:**
Dashboard não mostra dados do Mercado Pago e AppMax

**Causa:**
SQLs não foram executados no Supabase

**Solução:**
1. Executar 2 arquivos SQL no Supabase
2. Testar com cartão recusado
3. Configurar credenciais AppMax
4. Sincronizar vendas

**Tempo estimado:** 20 minutos

**Após fazer isso:**
✅ Dashboard mostrará tentativas do MP (inclusive recusadas)
✅ Vendas do AppMax aparecerão
✅ Métricas de cascata estarão corretas
✅ Views SQL estarão funcionando

---

## 📞 PRÓXIMO PASSO IMEDIATO

**PARAR TUDO E FAZER AGORA:**

1. Abrir Supabase: https://supabase.com/dashboard
2. SQL Editor
3. Copiar `database/fix-mercadopago-analytics.sql`
4. Colar e executar (RUN)
5. Copiar `database/fix-include-pending-sales.sql`
6. Colar e executar (RUN)
7. Copiar query de verificação
8. Executar e enviar resultado

**Sem isso, nada funcionará!**

Os códigos estão corretos, o problema é só SQL não executado.
