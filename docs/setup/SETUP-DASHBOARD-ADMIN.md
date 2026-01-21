# 🚀 GUIA SETUP DASHBOARD ADMIN - PASSO A PASSO

## ✅ O QUE JÁ ESTÁ PRONTO

### 1. Configuração
- [x] Credenciais Supabase configuradas no `.env.local`
- [x] Biblioteca `@supabase/supabase-js` instalada
- [x] `lib/supabase.ts` com cliente admin (service_role)
- [x] Webhook Appmax salvando dados no Supabase

### 2. Código
- [x] Dashboard Admin em `/app/admin/dashboard/page.tsx`
- [x] Integração com views otimizadas
- [x] Gráficos de receita e vendas (últimos 7 dias)
- [x] Tabela de vendas recentes
- [x] Verificação de role=admin

---

## 📋 EXECUTE AGORA (NESTA ORDEM)

### PASSO 1: Criar Schema no Supabase ⚠️ OBRIGATÓRIO!

1. **Acesse:** https://supabase.com/dashboard/project/egsmraszqnmosmtjuzhx
2. **Vá em:** SQL Editor (menu lateral esquerdo)
3. **Clique em:** "+ New query"
4. **Copie TODO o conteúdo** do arquivo `supabase-admin-schema.sql` (272 linhas)
5. **Cole no editor** e clique em **RUN** ▶️
6. **Aguarde** a mensagem "Success. No rows returned"

**O que será criado:**
- ✅ Tabelas: `profiles`, `sales`, `sales_items`, `webhooks_logs`
- ✅ RLS (apenas admins veem vendas)
- ✅ Views: `dashboard_metrics`, `sales_last_7_days`, `top_selling_products`
- ✅ Índices para performance
- ✅ Triggers para `updated_at`

---

### PASSO 2: Criar seu Usuário Admin

**2.1 - Criar conta no Auth**

1. **Acesse:** https://supabase.com/dashboard/project/egsmraszqnmosmtjuzhx/auth/users
2. **Clique em:** "Add user" → "Create new user"
3. **Preencha:**
   - Email: `helcio@seudominio.com` (use seu email real)
   - Password: (senha forte)
   - Auto Confirm User: ✅ **Marque esta opção!**
4. **Clique em:** "Create user"
5. **COPIE o UUID** que aparece (ex: `a1b2c3d4-...`)

**2.2 - Tornar Admin no SQL**

Volte no **SQL Editor** e rode (substitua os valores):

```sql
-- SUBSTITUA:
-- 'SEU_UUID_AQUI' pelo UUID copiado acima
-- 'seu-email@aqui.com' pelo seu email

INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'SEU_UUID_AQUI',
  'seu-email@aqui.com',
  'Administrador',
  'admin'
)
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

---

### PASSO 3: Testar o Dashboard

1. **Inicie o projeto:**
   ```bash
   npm run dev
   ```

2. **Acesse:** http://localhost:3000/admin/dashboard

3. **Faça login** com o email/senha criados

4. **Você deve ver:**
   - ✅ 4 cards de métricas (receita, vendas, ticket médio, PIX)
   - ✅ 2 gráficos (receita e vendas dos últimos 7 dias)
   - ✅ Tabela de vendas recentes (vazia por enquanto)

**Se der erro "Access Denied":**
- Verifique se você rodou o UPDATE no SQL para tornar admin
- Confirme no Supabase: Table Editor → profiles → Veja se seu email tem `role = 'admin'`

---

### PASSO 4: Fazer Venda de Teste

**Para popular o dashboard:**

1. **Abra outra aba:** http://localhost:3000/checkout
2. **Preencha com dados fictícios:**
   - Nome: Teste Silva
   - Email: teste@teste.com
   - Telefone: (11) 99999-9999
   - CPF: 111.111.111-11
3. **Escolha PIX** e finalize
4. **No painel da Appmax:**
   - Vá em: https://admin.appmax.com.br/pedidos
   - Encontre o pedido recém-criado
   - **Marque como "Aprovado"**
5. **O webhook será disparado automaticamente!**
6. **Volte ao dashboard** (F5) - a venda deve aparecer!

---

## 🔍 VERIFICAR SE FUNCIONOU

### No Supabase (Table Editor):

**1. Tabela `sales`:**
- Deve ter 1 linha com o pedido de teste
- Status: `approved`
- Total_amount: 36.00 (ou o valor que você pagou)

**2. Tabela `sales_items`:**
- Deve ter os produtos comprados (produto principal + bumps se selecionou)

**3. Tabela `webhooks_logs`:**
- Deve ter o log do webhook da Appmax
- `processed: true`, `success: true`

**4. View `dashboard_metrics`:**
- SQL Editor → rode: `SELECT * FROM dashboard_metrics;`
- Deve retornar 1 linha com as métricas

---

## 🐛 TROUBLESHOOTING

### Erro: "relation 'dashboard_metrics' does not exist"
**Solução:** Você esqueceu o PASSO 1 - rode o SQL schema!

### Erro: "row-level security policy"
**Solução:** Seu usuário não é admin - rode o UPDATE do PASSO 2.2

### Dashboard vazio (sem vendas)
**Solução:** Faça o PASSO 4 - venda de teste

### Webhook não salvou
**Possíveis causas:**
1. Appmax webhook não configurado: https://admin.appmax.com.br/configuracoes/webhooks
2. URL errada no webhook (deve ser: `https://gravadormedico.com.br/api/webhook/appmax`)
3. Pedido não foi marcado como "Aprovado" no painel Appmax

**Debug:**
```bash
# Ver logs do Next.js:
npm run dev

# Depois faça uma compra e veja se aparece:
# "✅ Venda salva: <uuid>"
```

---

## 📊 ENTENDENDO O DASHBOARD

### Cards de Métricas:

1. **Receita Total (verde)**
   - Soma de todas as vendas aprovadas
   - Crescimento: comparado com período anterior (mock por enquanto)

2. **Total de Vendas (azul)**
   - Quantidade de pedidos aprovados
   - Hoje: vendas feitas nas últimas 24h

3. **Ticket Médio (roxo)**
   - Receita total ÷ número de vendas
   - Mostra valor médio por compra

4. **Vendas PIX (laranja)**
   - Quantas vendas foram feitas via PIX
   - Mostra também vendas via cartão

### Gráficos:

- **Receita:** Linha verde mostrando faturamento diário (últimos 7 dias)
- **Vendas:** Barras azuis mostrando quantidade de vendas por dia

### Tabela:

- **ID Pedido:** Número do pedido na Appmax
- **Cliente:** Nome + email
- **Status:** Badge verde (aprovado), amarelo (pendente), vermelho (rejeitado)
- **Pagamento:** PIX ou credit_card
- **Valor:** Total da compra
- **Data:** Quando a venda foi aprovada

---

## 🎨 PERSONALIZAÇÕES FUTURAS

### 1. Adicionar Filtros de Data

No `page.tsx`, adicione:

```tsx
const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d')

// Modificar query:
WHERE created_at >= NOW() - INTERVAL '${period === '7d' ? '7 days' : ...}'
```

### 2. Exportar Relatórios

```tsx
const exportToCSV = () => {
  const csv = recentSales.map(sale => 
    `${sale.appmax_order_id},${sale.customer_name},${sale.total_amount}`
  ).join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'vendas.csv'
  a.click()
}
```

### 3. Notificações em Tempo Real

```tsx
// Escutar mudanças no Supabase:
useEffect(() => {
  const channel = supabase
    .channel('sales_changes')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'sales' },
      (payload) => {
        alert('Nova venda! 🎉')
        loadDashboardData() // Recarrega dashboard
      }
    )
    .subscribe()
  
  return () => { channel.unsubscribe() }
}, [])
```

---

## 🔐 SEGURANÇA

### Variáveis Secretas

**NUNCA COMMITE:**
- `.env.local` com `SUPABASE_SERVICE_ROLE_KEY`

**Se vazar acidentalmente:**
1. Supabase → Settings → API
2. "Reset service_role key"
3. Atualize `.env.local` com a nova key

### RLS (Row Level Security)

Apenas usuários com `role='admin'` podem:
- Ver tabela `sales`
- Ver tabela `sales_items`
- Ver tabela `webhooks_logs`

Usuários normais: **bloqueados automaticamente**

Webhooks: usam `service_role` (ignora RLS para INSERT)

---

## 📱 ACESSO MOBILE

Dashboard **100% responsivo**:
- ✅ Cards adaptam em coluna única
- ✅ Gráficos redimensionam automaticamente
- ✅ Tabela com scroll horizontal
- ✅ Menu lateral (sidebar) colapsa em mobile

Teste em: http://localhost:3000/admin/dashboard (redimensione o navegador)

---

## 🚀 PRÓXIMAS FEATURES (FASE 2)

Depois de tudo funcionando:

1. **Página de Clientes** (`/admin/clientes`)
   - Lista todos os compradores
   - Histórico de compras por cliente
   - Lifetime value (LTV)

2. **Página de Produtos** (`/admin/produtos`)
   - Quais order bumps vendem mais
   - Taxa de conversão por produto
   - Receita por produto

3. **Configurações** (`/admin/configuracoes`)
   - Gerenciar outros admins
   - Configurar webhooks
   - Exportar dados

4. **Automações (n8n + Evolution API)**
   - Recuperação de carrinho (email/WhatsApp após 15min)
   - Mensagens automáticas de confirmação
   - Follow-up pós-compra

---

## ✅ CHECKLIST FINAL

Antes de dar por concluído:

- [ ] SQL schema rodado (todas as tabelas criadas)
- [ ] Usuário admin criado e testado
- [ ] Dashboard acessível e sem erros
- [ ] Métricas aparecendo (mesmo que zeradas)
- [ ] Venda de teste apareceu no dashboard
- [ ] Gráficos renderizando corretamente
- [ ] Webhook salvando no Supabase
- [ ] RLS funcionando (usuário normal não acessa /admin)

---

## 🎉 PARABÉNS!

Você tem agora um **Dashboard Admin nível Yampi/Stripe**!

**Recursos:**
- ✅ Métricas em tempo real
- ✅ Gráficos profissionais (Recharts)
- ✅ Auditoria completa (webhooks_logs)
- ✅ Segurança com RLS
- ✅ Performance com views SQL otimizadas
- ✅ 100% responsivo

**Próximo nível:** Automações e recuperação de carrinho! 🚀
