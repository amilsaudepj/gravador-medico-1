# 🩺 Voice Pen Pro - Gravador Médico# Voice Pen Pro - Dashboard Médico



> Plataforma completa de gravação e transcrição médica com IA + Sistema de vendas e analyticsPlataforma profissional de gravação e transcrição médica com IA + Sistema completo de vendas e analytics.



[![Deploy](https://img.shields.io/badge/deploy-vercel-black)](https://www.gravadormedico.com.br)## 🚀 Tecnologias

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)- **Next.js 15** (App Router)

- **React 18** + **TypeScript**

## 🚀 Stack Tecnológico- **Tailwind CSS** + **Framer Motion**

- **Supabase** (Database + Auth + RLS)

- **Framework:** Next.js 15 (App Router) + React 18- **AppMax API** (Checkout + Webhooks)

- **Linguagem:** TypeScript 5.7- **Meta Conversions API** (CAPI)

- **Estilo:** Tailwind CSS + Framer Motion- **Lucide Icons** + **shadcn/ui**

- **Banco de Dados:** Supabase (PostgreSQL + Auth + RLS)

- **Pagamento:** AppMax API + Webhooks## 📁 Estrutura do Projeto

- **Analytics:** Meta Conversions API (CAPI)

- **UI:** Lucide Icons + shadcn/ui + Recharts```

gravador-medico/

## 📁 Estrutura do Projeto├── app/               # Next.js App Router

│   ├── admin/         # Painel admin (12 páginas)

```│   └── api/           # API Routes

gravador-medico/├── components/        # 44 componentes React

├── app/                    # Next.js App Router├── lib/              # Utils e helpers

│   ├── admin/             # Painel administrativo├── database/         # SQL migrations + schemas

│   │   ├── dashboard/     # Dashboard principal├── docs/             # Documentação consolidada

│   │   ├── analytics/     # Analytics avançado├── scripts/          # Automação e deploy

│   │   ├── sales/         # Gestão de vendas└── public/           # Assets estáticos

│   │   ├── customers/     # CRM de clientes```

│   │   ├── products/      # Produtos

│   │   └── ...            # Outros módulosVer [CLEANUP-REPORT.md](./CLEANUP-REPORT.md) para detalhes da estrutura.

│   ├── api/               # API Routes

│   ├── checkout/          # Páginas de checkout## 📦 Instalação

│   └── dashboard/         # Dashboard do usuário

├── components/            # Componentes React```bash

│   ├── ui/               # Componentes base (shadcn)# Instalar dependências

│   ├── modals/           # Modais interativosnpm install

│   └── dashboard/        # Componentes do dashboard

├── lib/                  # Utilidades e helpers# Configurar variáveis de ambiente

├── database/             # Migrations e schemas SQLcp .env.example .env.local

├── docs/                 # Documentação organizada# Editar .env.local com suas credenciais

│   ├── setup/           # Guias de instalação

│   ├── features/        # Funcionalidades# Rodar em desenvolvimento

│   ├── integrations/    # Integrações (AppMax, Meta)npm run dev

│   └── checkout/        # Documentação do checkout```

└── scripts/             # Scripts de automação

```**Acessos:**

- Site público: `http://localhost:3000`

## ⚡ Quick Start- Painel admin: `http://localhost:3000/admin/dashboard`

- Login: `http://localhost:3000/login`

### 1️⃣ Instalação

## 🎨 Funcionalidades Completas

```bash

# Clone o repositório### ✅ Implementadas:

git clone https://github.com/mattosconsultor/gravador-medico.git

cd gravador-medico#### **Dashboard Principal**

- Sidebar lateral com navegação completa

# Instale as dependências- Logo animado "Voice Pen Pro"

npm install- Menu de navegação interativo

```- Área VIP destacada (Loja de Prompts)

- Barra de progresso animada (40% concluída)

### 2️⃣ Configuração- Grid de 4 cards interativos com hover effects



```bash#### **Sistema de Modais Interativos**

# Copie o arquivo de exemplo

cp .env.example .env.local**1. SetupGuideModal** (Ver Guia)

- Sistema de **3 ABAS** (Tabs):

# Configure as variáveis de ambiente necessárias:  - **Aba Download**: QR Codes simulados para App Store e Play Store

# - NEXT_PUBLIC_SUPABASE_URL  - **Aba Configuração**: 5 passos detalhados de setup

# - NEXT_PUBLIC_SUPABASE_ANON_KEY  - **Aba Concluir**: Mensagem de sucesso animada

# - JWT_SECRET- Animações de entrada/saída com Framer Motion

# - APPMAX_API_TOKEN- Feedback visual ao completar configuração

# - etc.

```**2. PremiumUnlockModal** (Produtos Premium)

- Modal reutilizável com props dinâmicas

### 3️⃣ Desenvolvimento- Exibe benefícios com checkmarks animados

- Preço em destaque com desconto (40% OFF)

```bash- Badge de garantia de 7 dias

# Inicie o servidor de desenvolvimento- Botão "Desbloquear Agora" com animação hover

npm run dev- Simulação de redirecionamento de pagamento



# Acesse:#### **Interatividade dos Botões**

# - Site público: http://localhost:3000

# - Painel admin: http://localhost:3000/admin/dashboard**Card "Instalar Gravador"**

# - Login: http://localhost:3000/login- Botão "Ver Guia" → Abre SetupGuideModal

```- Navegação por abas funcionais

- QR codes visuais para download

### 4️⃣ Build e Deploy

**Card "Copiar Prompt Mestre"**

```bash- Botão "Copiar Agora" → Copia prompt SOAP completo

# Build de produção- Utiliza `navigator.clipboard.writeText()`

npm run build- Feedback visual: Botão muda para verde escuro

- Texto: "Copiado com Sucesso!" com ícone de check

# Deploy no Vercel- Reset automático após 3 segundos

vercel --prod- Toast notification de confirmação

```

**Card "Prompt Cardiologia" (Bloqueado)**

## 🎯 Funcionalidades Principais- Badge "Premium" em destaque

- Botão "Desbloquear" → Abre PremiumUnlockModal

### 💼 Painel Administrativo- Exibe 6 benefícios específicos de cardiologia

- **Dashboard Analytics:** Métricas em tempo real, gráficos, KPIs- Preço: R$ 29,90 (desconto de R$ 49,90)

- **Gestão de Vendas:** Controle completo de pedidos e transações- Ícone de coração vermelho personalizado

- **CRM:** Gerenciamento de clientes e histórico

- **Produtos:** Sincronização com AppMax**Card "Escudo Jurídico" (Bloqueado)**

- **Recuperação:** Sistema de carrinhos abandonados- Badge "Proteção" em destaque

- **Webhooks:** Monitoramento de integrações- Botão "Desbloquear" → Abre PremiumUnlockModal

- Exibe 6 benefícios de proteção legal (LGPD)

### 👤 Dashboard do Usuário- Preço: R$ 49,90

- **Gravador de Voz:** Transcrição médica com IA- Ícone de escudo azul personalizado

- **Biblioteca de Prompts:** Templates SOAP especializados

- **Loja VIP:** Produtos e recursos premium#### **Animações (Framer Motion)**

- **Perfil Médico:** Wizard de configuração- Fade-in sequencial dos cards

- Animação da barra de progresso

### 🛒 Sistema de Checkout- Transições suaves entre estados de botão

- **Integração AppMax:** Gateway de pagamento completo- Animações de entrada dos modais

- **Order Bumps:** Upsell inteligente- Hover effects em todos os elementos clicáveis

- **Carrinho Abandonado:** Recuperação automática- Scale effects nos cards

- **PIX + Cartão:** Múltiplas formas de pagamento

#### **Sistema de Notificações**

### 📊 Analytics Avançado- Toast Provider global

- **Meta CAPI:** Tracking de conversões- Notificações de sucesso/erro

- **Funil de Vendas:** Visualização completa- Auto-dismiss após 3 segundos

- **Métricas de Produto:** Performance detalhada- Animação slide-in from right

- **Cohort Analysis:** Análise de coortes

## 🔐 Cards do Dashboard

## 📚 Documentação

| Card | Status | Ação | Modal |

A documentação completa está organizada em:|------|--------|------|-------|

| **Instalar Gravador** | Disponível | Ver Guia | SetupGuideModal (3 abas) |

- **[Setup e Configuração](./docs/setup/)** - Guias de instalação| **Copiar Prompt Mestre** | Disponível | Copiar Agora | Toast + Feedback visual |

- **[Funcionalidades](./docs/features/)** - Lista completa de recursos| **Prompt Cardiologia** | Bloqueado | Desbloquear | PremiumUnlockModal |

- **[Integrações](./docs/integrations/)** - AppMax, Meta CAPI, Webhooks| **Escudo Jurídico** | Bloqueado | Desbloquear | PremiumUnlockModal |

- **[Checkout](./docs/checkout/)** - Sistema de pagamento

## 📁 Estrutura Atualizada

## 🔐 Autenticação

```

O sistema usa JWT para autenticação com diferentes níveis de acesso:/app

- **Admin:** Acesso completo ao painel administrativo  /dashboard

- **User:** Acesso ao dashboard e funcionalidades do produto    layout.tsx           # Layout com Sidebar + ToastProvider

    page.tsx            # Página principal com lógica completa

## 🌐 Links Importantes    globals.css         # Estilos globais + animações

/components

- **Produção:** https://www.gravadormedico.com.br  Sidebar.tsx          # Menu lateral + Área VIP

- **Repositório:** https://github.com/mattosconsultor/gravador-medico  /modals

- **Documentação:** [/docs](./docs/)    SetupGuideModal.tsx      # Modal de guia com 3 abas

    PremiumUnlockModal.tsx   # Modal de produtos premium

## 🛠️ Scripts Disponíveis  /ui

    card.tsx           # Componente Card

```bash    button.tsx         # Botão com variantes

npm run dev          # Desenvolvimento    badge.tsx          # Badges (Premium/Proteção)

npm run build        # Build de produção    dialog.tsx         # Sistema de Dialog

npm start            # Servidor de produção    toast.tsx          # Sistema de notificações

npm run lint         # Linter    tabs.tsx           # Sistema de abas (novo)

``````



## 📄 Licença## 🎯 Prompt Mestre (Conteúdo Copiado)



Propriedade de Mattos Consultor © 2026O botão "Copiar Prompt Mestre" copia o seguinte texto:



---```

Atue como um escriba médico especialista em documentação clínica. 

**Desenvolvido com ❤️ para profissionais da saúde**Sua missão é transformar gravações de consultas médicas em 

prontuários estruturados, seguindo rigorosamente a metodologia 
SOAP (Subjetivo, Objetivo, Avaliação, Plano).

[... estrutura SOAP completa com diretrizes ...]
```

## 🎨 Design System

- **Cores Primárias**: Azul Royal (#2563EB)
- **Fonte**: Inter (Google Fonts)
- **Estilo**: Clean, Minimalista, Trustworthy
- **Fundo**: Slate-50
- **Sombras**: Suaves e elegantes
- **Bordas**: Arredondadas (rounded-lg)

## 🚀 Próximos Passos

- Integração com backend
- Sistema de autenticação (NextAuth)
- Gateway de pagamento (Stripe/Mercado Pago)
- Painel de analytics
- Biblioteca de prompts expandida
- Sistema de versionamento de prompts

---

**Voice Pen Pro** - Tecnologia a serviço da medicina moderna. 🩺✨
