# 📊 Hub de Métricas Centralizado

## Arquitetura de Dados Blindada

**Data:** 29 de Janeiro de 2026  
**Versão:** 1.0

---

## 🎯 Objetivo

Centralizar TODAS as métricas do painel administrativo em um único ponto de entrada, garantindo:

1. **Consistência**: Mesma definição de "venda" em Dashboard, CAPI e relatórios
2. **Performance**: Cache inteligente por camada (5-10 min)
3. **Resiliência**: Falha em uma fonte não quebra o dashboard
4. **Manutenção**: Um lugar para atualizar lógica de negócio

---

## 📂 Estrutura de Pastas

```
lib/
├── analytics-hub/                    # 📊 LEITURA (Dashboard)
│   ├── index.ts                      # Função principal: getUnifiedDashboardData()
│   ├── external/
│   │   ├── index.ts                  # Re-exports
│   │   ├── meta-connector.ts         # Meta Ads API + CAPI Status
│   │   └── ga4-connector.ts          # Google Analytics 4 Data API
│   └── internal/
│       ├── index.ts                  # Re-exports
│       └── data-connector.ts         # Wrapper para funções SQL
│
├── tracking/                         # ✏️ ESCRITA (Disparo de Eventos)
│   ├── index.ts                      # Re-exports
│   ├── core.ts                       # trackPurchase(), trackEvent()
│   └── core.test.ts                  # Testes unitários
│
database/
└── internal_metrics.sql              # Funções SQL SECURITY DEFINER
```

---

## 🔄 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                     DASHBOARD ADMIN                              │
│                                                                  │
│   import { getUnifiedDashboardData } from '@/lib/analytics-hub'  │
│                                                                  │
│   const data = await getUnifiedDashboardData({                   │
│     startDate: new Date('2026-01-01'),                          │
│     endDate: new Date('2026-01-29'),                            │
│   });                                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ANALYTICS HUB                                 │
│                    (lib/analytics-hub/index.ts)                  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Gateway    │  │    GA4       │  │   Meta Ads   │           │
│  │    (SQL)     │  │  Connector   │  │  Connector   │           │
│  │   Vendas     │  │   Tráfego    │  │ Investimento │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         │                 │                  │                   │
│         └────────────────┬──────────────────┘                   │
│                          ▼                                       │
│              ┌───────────────────┐                               │
│              │  KPIs DERIVADOS   │                               │
│              │  - ROAS Real      │                               │
│              │  - Conversão Real │                               │
│              │  - CPA Real       │                               │
│              └───────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Uso no Dashboard

### Antes (❌ Errado)

```tsx
// ❌ NÃO FAÇA ISSO
// Página chamando múltiplas fontes diretamente
const sales = await supabase.from('sales').select('*');
const ga4 = await fetchGA4Data();
const meta = await fetchMetaInsights();
// ... lógica complexa de merge
```

### Depois (✅ Correto)

```tsx
// ✅ FAÇA ISSO
// Página importa apenas do Hub
import { getUnifiedDashboardData, getTodayDashboard } from '@/lib/analytics-hub';

// Opção 1: Período customizado
const data = await getUnifiedDashboardData({
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-29'),
  label: 'Janeiro 2026',
});

// Opção 2: Atalhos prontos
const today = await getTodayDashboard();
const last7 = await getLast7DaysDashboard();
const last30 = await getLast30DaysDashboard();

// Dados já prontos para renderizar
console.log(data.financial.totalRevenue);      // Receita
console.log(data.traffic.visitors);            // Visitantes
console.log(data.kpis.roasReal);               // ROAS calculado
console.log(data.kpis.conversionRateReal);     // Conversão calculada
```

---

## 🔒 Funções SQL Blindadas

Execute o arquivo `database/internal_metrics.sql` no Supabase:

### Funções Disponíveis

| Função | Descrição | Retorno |
|--------|-----------|---------|
| `get_gateway_sales(start, end, status)` | Vendas do gateway (fonte da verdade) | Totais, por dia, por gateway, por produto |
| `get_checkout_funnel(start, end)` | Funil de conversão do checkout | Etapas, contagens, taxas de abandono |
| `get_sales_for_capi(sale_id, minutes)` | Vendas para disparo no CAPI | Dados formatados para Meta |
| `get_analytics_summary(start, end)` | KPIs com comparação de período | Visitantes, vendas, variações |

### Regra de Ouro ⚠️

> A definição de "Venda Aprovada" em `get_gateway_sales` é a MESMA usada em `get_sales_for_capi`.
> Isso garante que o CAPI dispare exatamente para as mesmas vendas que aparecem no Dashboard.

```sql
-- Definição canônica de venda aprovada:
WHERE status IN ('approved', 'paid', 'authorized')
  AND deleted_at IS NULL
```

---

## ✏️ Tracking / Disparo de Eventos

### Uso

```typescript
import { trackPurchase, trackLead, trackInitiateCheckout } from '@/lib/tracking';

// No webhook de pagamento aprovado:
await trackPurchase({
  orderId: sale.external_id,
  totalAmount: sale.amount,
  customerEmail: sale.customer_email,
  customerPhone: sale.customer_phone,
  customerName: sale.customer_name,
  productName: sale.product_name,
  fbc: cookies.fbc,  // Facebook Click ID
  fbp: cookies.fbp,  // Facebook Browser ID
});

// O trackPurchase:
// 1. Dispara para Meta CAPI
// 2. Dispara para GA4 Measurement Protocol
// 3. Se um falhar, o outro continua
// 4. Nunca lança exceção - sempre retorna resultado
```

### Garantias

- ✅ `event_id` único (usa orderId para deduplicação)
- ✅ `em` (email) hasheado com SHA256
- ✅ `ph` (phone) hasheado com SHA256
- ✅ `value` em BRL
- ✅ Logs completos para debug
- ✅ Falha no Meta não para o GA4
- ✅ Falha no GA4 não para o Meta

---

## 🧪 Testes

### Rodar testes de tracking:

```bash
npx ts-node lib/tracking/core.test.ts
```

### Validar payload manualmente:

```typescript
import { createTestPayload, validateCapiPayload } from '@/lib/tracking';

const payload = createTestPayload('Purchase');
const result = validateCapiPayload(payload);

console.log('Válido:', result.valid);
console.log('Erros:', result.errors);
```

---

## 📊 Tipos Principais

```typescript
interface UnifiedDashboardData {
  period: UnifiedPeriod;
  financial: FinancialMetrics;      // Vendas, receita, ticket médio
  traffic: TrafficMetrics;          // Visitantes, sessões, fontes
  investment: InvestmentMetrics;    // Gasto, ROAS do Meta
  funnel: FunnelMetrics;            // Funil de conversão
  kpis: DerivedKPIs;                // ROAS Real, Conversão Real
  realtime: RealtimeMetrics;        // Usuários ativos agora
  integrations: IntegrationStatus;  // Status das APIs
  errors: string[];                 // Erros (se houver)
}

interface DerivedKPIs {
  roasReal: number;           // Receita Gateway / Gasto Meta
  conversionRateReal: number; // Vendas Gateway / Visitantes GA4
  cpaReal: number;            // Gasto Meta / Vendas Gateway
  avgTicket: number;          // Receita / Vendas
  changes: {
    revenue: number;          // Variação % receita
    sales: number;            // Variação % vendas
    visitors: number;         // Variação % visitantes
    conversion: number;       // Variação % conversão
  };
}
```

---

## 🔧 Configuração de Ambiente

### Variáveis Necessárias

```env
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Meta CAPI
FACEBOOK_PIXEL_ID=
FACEBOOK_ACCESS_TOKEN=
FACEBOOK_AD_ACCOUNT_ID=
META_TEST_EVENT_CODE=           # Opcional, para testes

# Google Analytics 4
GA4_PROPERTY_ID=
GA4_MEASUREMENT_ID=             # Para Measurement Protocol
GA4_API_SECRET=                 # Para Measurement Protocol
GOOGLE_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS_JSON=  # ou GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY
```

---

## 🚀 Próximos Passos

1. [ ] Executar `database/internal_metrics.sql` no Supabase
2. [ ] Atualizar páginas do dashboard para usar `getUnifiedDashboardData()`
3. [ ] Atualizar webhooks para usar `trackPurchase()` do novo módulo
4. [ ] Configurar variáveis de ambiente de produção
5. [ ] Monitorar logs para garantir disparo correto

---

## 📝 Changelog

### v1.0 (29/01/2026)
- Criação inicial do Hub de Métricas
- Funções SQL SECURITY DEFINER
- Conectores Meta e GA4 com cache
- Tracking Core blindado
- Testes unitários
