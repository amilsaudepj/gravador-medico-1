# 🎯 Módulo Tintim Killer

### Sistema de Rastreamento e Atribuição para WhatsApp + Meta Pixel

[![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)]()
[![Version](https://img.shields.io/badge/version-3.0-blue)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()

---

## 🚀 Início Rápido (5 minutos)

```bash
# 1. Criar tabelas
Execute: database/18-tracking-module-complete.sql no Supabase

# 2. Acessar painel
Navegue para: /admin/tracking

# 3. Configurar Meta Pixel
Acesse: /admin/tracking/pixels
Insira: Pixel ID + Access Token

# 4. Criar link
Acesse: /admin/tracking/links
Clique: "Novo Link"

# 5. Usar!
Compartilhe: https://seudominio.com/r/seu-slug
```

**✅ Pronto! Agora você está rastreando conversões.**

---

## 📚 Documentação Completa

- **🎯 Novo aqui?** Comece pelo [Índice](./TRACKING-INDEX.md)
- **💼 Executivo/Gerente?** Leia o [Sumário Executivo](./TRACKING-EXECUTIVE-SUMMARY.md)
- **👨‍💻 Desenvolvedor?** Consulte o [README Completo](./TRACKING-README.md)
- **🔌 Integração?** Veja o [Guia de Webhook](./TRACKING-WEBHOOK-INTEGRATION.md)
- **📋 Implementação?** Confira o [Resumo de Implementação](./TRACKING-IMPLEMENTATION-SUMMARY.md)

---

## ⚡ O Que Este Módulo Faz?

### Problema que Resolve:
❌ "Não sei de onde vêm minhas vendas"  
❌ "Meus anúncios do Facebook não convertem"  
❌ "Não consigo atribuir vendas às campanhas"  
❌ "Meta Pixel não rastreia WhatsApp"  

### Solução:
✅ Links rastreáveis com código único  
✅ Atribuição automática de vendas  
✅ Integração completa com Meta Pixel  
✅ Dashboard de métricas em tempo real  

---

## 🎯 Funcionalidades Principais

| Funcionalidade | Descrição | Status |
|---------------|-----------|--------|
| **Links Rastreáveis** | Crie URLs curtas para campanhas | ✅ |
| **Meta Pixel** | Integração automática com Facebook | ✅ |
| **Atribuição** | Por ref code ou IP address | ✅ |
| **Dashboard** | Métricas e estatísticas | ✅ |
| **CRUD Links** | Gerenciamento completo | ✅ |
| **UTM Params** | Rastreamento por fonte/mídia | ✅ |
| **Fila de Eventos** | Garantia de entrega | ✅ |
| **Compliance LGPD** | Transparência total | ✅ |

---

## 📊 Exemplo de Uso

### 1️⃣ Criar Link
```typescript
import { createTrackingLink } from '@/actions/tracking';

await createTrackingLink({
  user_id: 'user-uuid',
  slug: 'promo-janeiro',
  whatsapp_number: '5511999999999',
  whatsapp_message: 'Olá! Quero aproveitar a promoção!',
  utm_source: 'facebook',
  utm_campaign: 'janeiro-2026',
});
```

### 2️⃣ Compartilhar
```
Link gerado: https://seusite.com/r/promo-janeiro

Use em:
- Facebook Ads → https://seusite.com/r/promo-janeiro
- Instagram → https://seusite.com/r/promo-janeiro
- Email → https://seusite.com/r/promo-janeiro
```

### 3️⃣ Rastrear
```
Cliente clica → Código ABC123 gerado
Cliente compra → Venda atribuída à campanha
Meta Pixel → Recebe evento Purchase
Facebook → Otimiza anúncios automaticamente
```

---

## 🏗️ Arquitetura

```
Cliente → /r/promo-jan
   ↓
Bridge Page (gera ref:ABC123)
   ↓
WhatsApp (wa.me/...?text=... ref:ABC123)
   ↓
Webhook recebe mensagem
   ↓
Sistema extrai ref:ABC123
   ↓
Atribui venda à campanha
   ↓
Envia evento ao Meta Pixel
   ↓
Facebook otimiza anúncios
```

---

## 📦 O Que Está Incluído?

### Código-Fonte
- ✅ 12 arquivos TypeScript/React
- ✅ 4 páginas de admin
- ✅ 1 bridge page
- ✅ Server Actions completos
- ✅ Lógica de atribuição

### Banco de Dados
- ✅ 5 tabelas otimizadas
- ✅ 2 views customizadas
- ✅ Índices de performance
- ✅ Triggers automáticos

### Documentação
- ✅ 5 arquivos de documentação
- ✅ Guias passo a passo
- ✅ API Reference completa
- ✅ Troubleshooting

---

## 🎨 Screenshots

### Dashboard Principal
```
┌─────────────────────────────────────────────┐
│  Rastreamento & Atribuição                  │
├─────────────────────────────────────────────┤
│  📊 Total de Cliques: 1,234                 │
│  ⚡ Eventos Disparados: 987                 │
│  💰 Conversões: 45                          │
│  🔗 Links Ativos: 12                        │
├─────────────────────────────────────────────┤
│  [Configurar Pixel]  [Gerenciar Links]     │
└─────────────────────────────────────────────┘
```

### CRUD de Links
```
┌─────────────────────────────────────────────┐
│  Links Rastreáveis        [+ Novo Link]    │
├─────────────────────────────────────────────┤
│  🔗 Promoção Janeiro                        │
│     /r/promo-jan                            │
│     📊 324 cliques | 💰 12 conversões       │
│     [Copiar] [Editar] [Deletar]            │
├─────────────────────────────────────────────┤
│  🔗 Black Friday                            │
│     /r/black-friday                         │
│     📊 856 cliques | 💰 28 conversões       │
│     [Copiar] [Editar] [Deletar]            │
└─────────────────────────────────────────────┘
```

---

## 🚀 Instalação

### Pré-requisitos
- ✅ Next.js 14+
- ✅ Supabase configurado
- ✅ Meta Pixel ID
- ✅ Access Token do Facebook

### Passo a Passo

**1. Clone os arquivos**
```bash
# Todos os arquivos já estão no projeto!
# Localizados em: app/admin/tracking/
```

**2. Execute o SQL**
```bash
# No Supabase, execute:
database/18-tracking-module-complete.sql
```

**3. Configure variáveis de ambiente**
```env
NEXT_PUBLIC_SUPABASE_URL=sua-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-key
```

**4. Teste localmente**
```bash
npm run dev
# Acesse: http://localhost:3000/admin/tracking
```

**5. Deploy**
```bash
npm run build
# Deploy no Vercel/Railway/etc
```

---

## 🔧 Configuração

### Meta Pixel
1. Acesse Facebook Business Manager
2. Vá em "Gerenciador de Eventos"
3. Copie seu Pixel ID
4. Gere Access Token (ads_management)
5. Cole em `/admin/tracking/pixels`

### Webhook WhatsApp
1. Abra `app/api/webhooks/whatsapp/route.ts`
2. Adicione import: `import { processAttribution } from '@/lib/attribution'`
3. Insira snippet após salvar mensagem
4. Teste com mensagem real

*Veja detalhes completos em: [TRACKING-WEBHOOK-INTEGRATION.md](./TRACKING-WEBHOOK-INTEGRATION.md)*

---

## 📈 Métricas

### Dashboard Mostra:
- 📊 **Total de Cliques**: Todos os acessos aos links
- ⚡ **Eventos Disparados**: ViewContent, Lead, Purchase
- 💰 **Conversões**: Vendas atribuídas
- 🔗 **Links Ativos**: Campanhas em execução
- ⏱️ **Eventos Pendentes**: Na fila de envio
- ❌ **Eventos Falhados**: Requerem atenção

### Por Link:
- Cliques individuais
- Taxa de conversão
- Último clique
- Performance histórica

---

## 💡 Casos de Uso

| Setor | Uso | Benefício |
|-------|-----|-----------|
| **E-commerce** | Link em anúncio → WhatsApp → Venda | Atribuição precisa |
| **Serviços** | Landing page → WhatsApp → Agendamento | ROI calculado |
| **Educação** | Post Instagram → WhatsApp → Matrícula | Otimização de ads |
| **Saúde** | Google Ads → WhatsApp → Consulta | Custo por paciente |

---

## 🛠️ Stack Tecnológica

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js Server Actions, Supabase
- **Banco**: PostgreSQL (Supabase)
- **Integração**: Meta Conversions API, Evolution API
- **Deploy**: Vercel-ready

---

## 🔒 Segurança

- ✅ Ref codes únicos e aleatórios
- ✅ Validação em Server Actions
- ✅ Rate limiting (recomendado)
- ✅ Compliance LGPD
- ✅ Dados criptografados no banco

---

## 🆘 Troubleshooting

### Link não rastreia
```bash
# Verifique:
1. Link está ativo? (/admin/tracking/links)
2. Slug correto?
3. Console do navegador (F12)
```

### Atribuição não funciona
```bash
# Verifique:
1. Mensagem contém ref:XXXXXX?
2. Webhook integrado?
3. Logs do servidor
```

### Meta Pixel não dispara
```bash
# Verifique:
1. Integração ativa? (/admin/tracking/pixels)
2. Token válido?
3. Test event code no Facebook
```

*Troubleshooting completo em: [TRACKING-README.md](./TRACKING-README.md)*

---

## 📞 Suporte

### Documentação
- [Índice Completo](./TRACKING-INDEX.md)
- [README Técnico](./TRACKING-README.md)
- [Guia Executivo](./TRACKING-EXECUTIVE-SUMMARY.md)

### Contato
- 📧 Email: suporte@gravadormedico.com
- 💬 WhatsApp: (11) 99999-9999
- 🌐 Site: https://gravadormedico.com

---

## 🎉 Contribuindo

Este é um módulo proprietário do **Gravador Médico**.  
Para sugestões ou melhorias, entre em contato com a equipe de desenvolvimento.

---

## 📝 Changelog

### v3.0.0 (Janeiro 2026)
- ✅ Implementação completa do módulo
- ✅ Integração Meta Pixel
- ✅ Sistema de atribuição
- ✅ Dashboard e CRUD
- ✅ Documentação completa

---

## 📄 Licença

Proprietary - Gravador Médico © 2026

---

## 🙏 Agradecimentos

Desenvolvido com ❤️ para maximizar conversões e ROI.

---

**🚀 Comece agora:** [TRACKING-INDEX.md](./TRACKING-INDEX.md)

---

*Última atualização: Janeiro 2026*
