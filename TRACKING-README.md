# 🎯 Módulo Tintim Killer - Rastreamento e Atribuição

Sistema completo de rastreamento de cliques e atribuição de vendas para WhatsApp com integração ao Meta Pixel.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Funcionalidades](#funcionalidades)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Fluxo de Dados](#fluxo-de-dados)
- [Configuração](#configuração)
- [Uso](#uso)
- [API Reference](#api-reference)

## 🎯 Visão Geral

O módulo **Tintim Killer** permite:

1. ✅ Criar links rastreáveis que redirecionam para WhatsApp
2. ✅ Rastrear cada clique com código único (ref code)
3. ✅ Atribuir vendas/leads às campanhas corretas
4. ✅ Integrar com Meta Pixel para otimização de anúncios
5. ✅ Dashboard completo de métricas e conversões

## 🏗️ Arquitetura

### Tabelas do Banco de Dados

```sql
-- Integração com Meta/Facebook
integrations_meta (
  id, user_id, access_token, pixel_id, test_event_code, is_active
)

-- Links rastreáveis
tracking_links (
  id, user_id, slug, whatsapp_number, whatsapp_message, 
  campaign_name, utm_source, utm_medium, utm_campaign, is_active
)

-- Cliques rastreados
tracking_clicks (
  id, link_id, ref_code, event_id, ip_address, user_agent, clicked_at
)

-- Fila de eventos Meta Pixel
tracking_events_queue (
  id, integration_id, event_id, event_type, event_data, 
  user_data, custom_data, status, retry_count
)

-- Mapeamento de funil
funnel_events_map (
  id, ref_code, event_type, event_id, remote_jid, 
  customer_email, sale_id, event_data
)
```

## ✨ Funcionalidades

### 1. Bridge Page (`/r/[slug]`)
- Página intermediária de redirecionamento
- Botão compliance LGPD
- Dispara Meta Pixel PageView
- Gera ref code único por clique

### 2. Dashboard de Tracking (`/admin/tracking`)
- Cards de estatísticas (cliques, eventos, conversões)
- Status de eventos pendentes/falhados
- Links rápidos para configuração

### 3. Gerenciamento de Links (`/admin/tracking/links`)
- CRUD completo de links rastreáveis
- Configuração de mensagem do WhatsApp
- Parâmetros UTM customizáveis
- Copiar link com um clique

### 4. Configuração de Pixel (`/admin/tracking/pixels`)
- Salvar credenciais do Meta/Facebook
- Ativar/Desativar integração
- Instruções de configuração
- Test event code para debugging

### 5. Sistema de Atribuição
- Busca por ref code na mensagem
- Fallback por IP address (24h)
- Enfileiramento automático de eventos
- Suporte a múltiplos tipos de evento

## 📁 Estrutura de Arquivos

```
lib/
├── types/tracking.ts           # Interfaces TypeScript
├── tracking-utils.ts           # Funções auxiliares
└── attribution.ts              # Lógica de atribuição

actions/
└── tracking.ts                 # Server Actions

components/
└── tracking/
    └── RedirectClient.tsx      # Componente de redirecionamento

app/
├── r/[slug]/page.tsx          # Bridge page (Server Component)
└── admin/tracking/
    ├── layout.tsx              # Layout compartilhado
    ├── page.tsx                # Dashboard
    ├── links/page.tsx          # CRUD de links
    └── pixels/page.tsx         # Configuração Meta Pixel
```

## 🔄 Fluxo de Dados

### 1. Criação do Link
```
Admin → /admin/tracking/links → createTrackingLink()
  ↓
tracking_links (banco de dados)
  ↓
Link disponível: /r/{slug}
```

### 2. Clique no Link
```
Usuário → /r/promo-jan
  ↓
Server Component busca link
  ↓
Gera: eventId (UUID) + refCode (6 chars)
  ↓
RedirectClient renderiza
  ↓
Dispara Meta Pixel PageView
  ↓
Usuário clica "Iniciar no WhatsApp"
  ↓
trackClick() salva em tracking_clicks
  ↓
Enfileira evento ViewContent
  ↓
Redireciona: wa.me/5511999999999?text=Olá ref:ABC123
```

### 3. Atribuição de Conversão
```
Cliente manda mensagem no WhatsApp
  ↓
Webhook recebe mensagem
  ↓
processAttribution() é chamado
  ↓
Extrai ref:ABC123 da mensagem
  ↓
Busca em tracking_clicks
  ↓
Salva em funnel_events_map
  ↓
Enfileira evento Lead/Purchase no Meta Pixel
```

## ⚙️ Configuração

### 1. Criar Tabelas no Supabase

Execute os scripts SQL em ordem:
1. `database/create-tracking-tables.sql`
2. `database/create-funnel-events.sql`

### 2. Configurar Meta Pixel

1. Acesse `/admin/tracking/pixels`
2. Obtenha suas credenciais:
   - **Pixel ID**: Facebook Business Manager → Gerenciador de Eventos
   - **Access Token**: Configurações do Sistema → Tokens de Acesso
3. Cole as credenciais e salve
4. Ative a integração

### 3. Criar Primeiro Link

1. Acesse `/admin/tracking/links`
2. Clique em "Novo Link"
3. Preencha:
   - Nome da campanha
   - Número do WhatsApp (formato: 5511999999999)
   - Mensagem pré-preenchida
   - Parâmetros UTM (opcional)
4. Clique em "Criar Link"
5. Copie o link gerado e use em suas campanhas

### 4. Integrar com Webhook do WhatsApp

Veja instruções completas em `TRACKING-WEBHOOK-INTEGRATION.md`

## 📖 Uso

### Exemplo: Criar Link Programaticamente

```typescript
import { createTrackingLink } from '@/actions/tracking';

const result = await createTrackingLink({
  user_id: 'user-uuid',
  slug: 'promo-janeiro',
  campaign_name: 'Promoção Janeiro 2026',
  whatsapp_number: '5511999999999',
  whatsapp_message: 'Olá! Vi sua promoção e gostaria de saber mais!',
  destination_url: 'https://seusite.com/promo',
  utm_source: 'facebook',
  utm_medium: 'cpc',
  utm_campaign: 'janeiro-2026',
});

if (result.success) {
  console.log('Link criado:', result.link);
  // Usar: https://seudominio.com/r/promo-janeiro
}
```

### Exemplo: Processar Atribuição Manual

```typescript
import { processAttribution } from '@/lib/attribution';

const result = await processAttribution({
  messageText: 'Olá! Quero comprar ref:ABC123',
  remoteJid: '5511999999999@s.whatsapp.net',
  eventType: 'Purchase',
  saleId: 'sale-uuid',
  customerEmail: 'cliente@email.com',
  customerPhone: '5511999999999',
  eventData: {
    value: 197.00,
    currency: 'BRL',
    product_name: 'Gravador Médico PRO',
  },
});

if (result.success) {
  console.log('Atribuição:', result.attribution);
  console.log('Event ID:', result.eventId);
}
```

### Exemplo: Buscar Estatísticas

```typescript
import { getTrackingStats } from '@/actions/tracking';

const { stats } = await getTrackingStats('user-uuid');

console.log(`
  Total de Cliques: ${stats.totalCliques}
  Eventos Disparados: ${stats.totalEvents}
  Conversões: ${stats.conversions}
  Taxa de Conversão: ${(stats.conversions / stats.totalCliques * 100).toFixed(2)}%
`);
```

## 🔌 API Reference

### Server Actions

#### `trackClick(params)`
Salva um clique rastreado.

**Parâmetros:**
- `linkId`: ID do link
- `refCode`: Código de referência (6 chars)
- `eventId`: UUID do evento
- `userAgent`: User agent do navegador
- `referer`: URL de origem

**Retorno:**
```typescript
{ success: true, click: TrackingClick }
```

#### `createTrackingLink(data)`
Cria novo link rastreável.

**Parâmetros:** `TrackingLinkInsert`

**Retorno:**
```typescript
{ success: true, link: TrackingLink }
```

#### `saveIntegration(data)`
Salva/atualiza integração do Meta Pixel.

**Parâmetros:**
```typescript
{
  user_id: string;
  access_token: string;
  pixel_id: string;
  test_event_code?: string;
  is_active?: boolean;
}
```

### Funções de Atribuição

#### `findAttribution(params)`
Busca atribuição por ref code ou IP.

**Parâmetros:**
```typescript
{
  messageText?: string;
  remoteJid: string;
  ipAddress?: string;
}
```

**Retorno:**
```typescript
{
  found: boolean;
  refCode?: string;
  method?: 'ref_code' | 'ip_address' | 'none';
  clickData?: TrackingClick;
  linkData?: TrackingLink;
}
```

#### `processAttribution(params)`
Processa atribuição completa (salva evento e enfileira pixel).

**Parâmetros:**
```typescript
{
  messageText?: string;
  remoteJid: string;
  ipAddress?: string;
  eventType: 'Lead' | 'Contact' | 'Purchase';
  saleId?: string;
  customerEmail?: string;
  customerPhone?: string;
  eventData?: Record<string, any>;
}
```

### Utilitários

#### `generateRefCode()`
Gera código de referência único (6 caracteres alfanuméricos).

#### `generateEventId()`
Gera UUID v4 para rastreamento de eventos.

#### `extractRefCodeFromMessage(message)`
Extrai ref code de uma mensagem (procura padrão `ref:XXXXXX`).

#### `generateWhatsAppURL(phone, message, refCode?)`
Gera URL do WhatsApp com mensagem pré-preenchida.

## 🎨 Customização

### Adicionar Novo Tipo de Evento

1. Atualizar tipo em `lib/types/tracking.ts`:
```typescript
export type EventType = 
  | 'PageView' 
  | 'ViewContent' 
  | 'Lead'
  | 'Purchase'
  | 'MyCustomEvent'; // ← adicionar aqui
```

2. Usar no processAttribution:
```typescript
await processAttribution({
  // ...
  eventType: 'MyCustomEvent',
  // ...
});
```

### Customizar Mensagem do WhatsApp

No formulário de criação de link, a mensagem aceita variáveis:

```
Olá! Vi sua promoção {campaign_name}!
Gostaria de saber mais sobre {product_name}.

Ref: {ref_code} (adicionado automaticamente)
```

## 🐛 Troubleshooting

### Links não estão rastreando

1. Verifique se o link está ativo: `/admin/tracking/links`
2. Confirme que o slug está correto
3. Veja logs no console do navegador (F12)

### Atribuição não funciona

1. Verifique se a mensagem contém `ref:XXXXXX`
2. Confirme que o IP está sendo capturado corretamente
3. Veja logs no servidor: `processAttribution()`

### Meta Pixel não dispara

1. Confirme integração ativa: `/admin/tracking/pixels`
2. Verifique token e pixel ID
3. Use test_event_code e monitore no Event Manager do Facebook
4. Veja eventos pendentes na fila: `/admin/tracking`

## 📊 Métricas Disponíveis

- ✅ Total de cliques
- ✅ Taxa de conversão
- ✅ Eventos disparados (PageView, ViewContent, Lead, Purchase)
- ✅ Eventos pendentes/falhados
- ✅ Links ativos/inativos
- ✅ Conversões por campanha
- ✅ ROI por fonte de tráfego (via UTM)

## 🚀 Próximos Passos

- [ ] Worker para processar fila de eventos
- [ ] Relatórios avançados de atribuição
- [ ] A/B testing de mensagens
- [ ] Integração com Google Analytics
- [ ] QR Codes rastreáveis
- [ ] Link shortener customizado

## 📝 Licença

Este módulo faz parte do projeto Gravador Médico.

## 🤝 Suporte

Para dúvidas ou problemas, consulte a documentação completa ou entre em contato com o time de desenvolvimento.
