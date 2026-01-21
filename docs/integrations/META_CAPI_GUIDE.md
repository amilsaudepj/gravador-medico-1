# 🚀 META CONVERSION API (CAPI) - GUIA COMPLETO

## O Que É?

A **Meta Conversion API** é uma forma de enviar eventos de conversão (compras, carrinhos, etc.) **diretamente do seu servidor** para o Facebook, sem depender do Pixel do navegador.

### Por Que Usar?

- **iOS 14+ bloqueia cookies**: Apple bloqueou tracking de terceiros
- **Bloqueadores de anúncios**: Muitos usuários têm AdBlock que impede o Pixel
- **Recupera 20-30% das conversões**: Vendas que o Facebook não estava vendo
- **Melhor atribuição**: Facebook entende melhor de onde vieram suas vendas
- **Anúncios mais inteligentes**: O algoritmo do Facebook aprende melhor e vende mais

---

## 📋 Configuração Inicial

### 1. Encontrar seu Pixel ID

1. Acesse: https://business.facebook.com
2. Vá em **Business Manager > Eventos > Pixels**
3. Copie o ID do seu Pixel (exemplo: `123456789012345`)
4. Cole em `.env.local`:
   ```bash
   META_PIXEL_ID=123456789012345
   ```

### 2. Obter Token de Acesso

Você já tem o token configurado:
```bash
META_CONVERSION_API_TOKEN=EAANyKNggzXwBQ...
```

### 3. Adicionar no Vercel

⚠️ **IMPORTANTE**: Adicione essas variáveis no **Vercel Dashboard**:

1. Acesse: https://vercel.com/seu-projeto/settings/environment-variables
2. Adicione:
   - `META_CONVERSION_API_TOKEN` = `EAANyKNggzXwBQ...`
   - `META_PIXEL_ID` = `seu_pixel_id`

---

## 🔧 Como Funciona

### Fluxo Automático

1. **Cliente compra no site** → Pixel do navegador tenta capturar (pode falhar)
2. **Appmax confirma pagamento** → Envia webhook para nosso servidor
3. **Nosso servidor recebe webhook** → Salva no banco + **Envia para Meta CAPI** ✅
4. **Facebook recebe evento** → Marca a conversão (mesmo se Pixel falhou)

### Deduplicação Inteligente

O mesmo `event_id` é usado no Pixel e na API:
- Se o Pixel capturar, Facebook registra 1 vez
- Se o Pixel falhar, a API registra
- Se ambos capturarem, Facebook deduplica automaticamente

Resultado: **Nunca conta 2 vezes** ✅

---

## 📊 O Que É Enviado

### Dados Hasheados (Privacidade)

Para proteger os dados do cliente, enviamos:
- Email hasheado (SHA256)
- Telefone hasheado
- Nome hasheado
- Cidade/Estado hasheado

O Facebook compara com os dados dele sem ver os dados originais.

### Dados de Tracking

Além dos dados do cliente, enviamos:
- **FBC Cookie** (`_fbc`): ID do clique no anúncio do Facebook
- **FBP Cookie** (`_fbp`): ID do navegador do usuário
- **GCLID**: ID de clique do Google Ads
- **IP Address**: Para geolocalização
- **User Agent**: Tipo de dispositivo

Esses dados são capturados pelo nosso `AnalyticsTracker` e ficam salvos no banco.

---

## 🧪 Testar a Integração

### 1. Verificar no Terminal/Logs

Quando uma venda for aprovada, você verá:

```
🚀 Enviando conversão para Meta CAPI...
✅ Conversão enviada para Meta CAPI: fb_trace_id_xyz123
```

Se der erro:
```
⚠️ Falha ao enviar para Meta CAPI: { error: '...' }
```

### 2. Verificar no Facebook

1. Acesse: https://business.facebook.com/events_manager2/list/pixel
2. Clique no seu Pixel
3. Vá em **Teste de Eventos**
4. Faça uma compra teste
5. Você verá 2 eventos:
   - 🌐 `Browser` (Pixel do navegador)
   - 🖥️ `Server` (CAPI - nosso servidor)

### 3. Verificar Qualidade da Correspondência

No Events Manager, você verá uma pontuação de **Qualidade da Correspondência** (0-10):
- **8-10**: Excelente (email + telefone + FBC)
- **5-7**: Bom (email + FBC)
- **0-4**: Baixo (só IP)

**Dica**: Quanto mais dados você enviar (email, telefone, cookies), melhor a correspondência.

---

## 🎯 Eventos Disponíveis

### 1. Purchase (Compra Confirmada)

✅ **Já implementado no webhook**

Enviado automaticamente quando:
- Status = `approved`
- Total > R$ 0

```typescript
sendPurchaseEvent({
  orderId: '105568001',
  customerEmail: 'cliente@email.com',
  customerPhone: '11999999999',
  totalAmount: 497,
  currency: 'BRL',
  productName: 'Gravador Médico',
  fbc: 'fb.1.1234567890.abcdef',
  fbp: 'fb.1.9876543210.xyz123'
})
```

### 2. InitiateCheckout (Carrinho Abandonado)

⏳ **Pode ser implementado depois**

Enviar quando o usuário chega no checkout mas não finaliza:

```typescript
sendInitiateCheckoutEvent({
  sessionId: 'session_xyz',
  customerEmail: 'cliente@email.com',
  cartValue: 497,
  productName: 'Gravador Médico',
  fbc: '...',
  fbp: '...'
})
```

---

## 🔍 Troubleshooting

### Erro: "META_PIXEL_ID não configurado"

✅ Adicione o Pixel ID no `.env.local` e no Vercel

### Erro: "Invalid access token"

✅ Token expirou. Gere um novo em: https://developers.facebook.com/tools/accesstoken

### Conversões não aparecem no Facebook

1. Verifique se o Pixel ID está correto
2. Verifique se o token tem permissão de `ads_management`
3. Aguarde até 20 minutos (pode haver delay)

### Qualidade de Correspondência Baixa

Adicione mais dados:
- ✅ Email (mais importante)
- ✅ Telefone
- ✅ FBC/FBP (cookies do Facebook)
- ✅ Nome completo
- ✅ Cidade/Estado

---

## 📈 Resultados Esperados

### Antes da CAPI
- Facebook marca: **70 conversões**
- Real: **100 conversões**
- **Perda de 30%** 😢

### Depois da CAPI
- Pixel captura: 70 (bloqueados)
- CAPI captura: 30 (recuperados)
- Facebook marca: **100 conversões** ✅
- **Atribuição 100% correta** 🎉

### Impacto nos Anúncios
- ✅ **CPA cai** (custo por aquisição)
- ✅ **ROAS sobe** (retorno sobre investimento)
- ✅ Algoritmo aprende melhor → vende mais

---

## 🎓 Documentação Oficial

- Meta CAPI Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
- Test Events: https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api#test-events
- Event Matching: https://www.facebook.com/business/help/765081237991954

---

## ✅ Checklist de Implementação

- [x] Criar `lib/meta-capi.ts`
- [x] Adicionar no webhook da Appmax
- [x] Configurar variáveis de ambiente
- [ ] Adicionar `META_PIXEL_ID` no `.env.local`
- [ ] Adicionar variáveis no Vercel
- [ ] Fazer compra teste
- [ ] Verificar no Events Manager do Facebook

---

**Próximo Passo**: Adicione o `META_PIXEL_ID` e faça uma compra teste! 🚀
