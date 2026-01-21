# 🚀 Setup Completo - Gravador Médico

## ✅ O que foi implementado:

### 1. **Integração APPMAX Reativada** ✅
- ✅ Botões "Comprar Agora" funcionando
- ✅ Link do checkout: `https://gravadormedico.carrinho.app/one-checkout/ocudf/32880073`
- ✅ Suporte a UTM tracking automático
- ✅ Arquivo: `/lib/appmax.ts`

### 2. **Sistema de Autenticação Completo** ✅
- ✅ Página de login: `/login`
- ✅ Dashboard protegido: `/dashboard`
- ✅ API de autenticação: `/api/auth/login` e `/api/auth/me`
- ✅ Tokens JWT com validade de 7 dias
- ✅ Componente `ProtectedRoute` para proteger páginas

### 3. **Integração com Supabase** ✅
- ✅ Schema SQL criado (tabelas `users` e `sessions`)
- ✅ Funções de gerenciamento de usuários
- ✅ Arquivo: `/lib/supabase.ts`

### 4. **Webhook APPMAX** ✅
- ✅ Endpoint: `/api/webhook/appmax`
- ✅ Cria usuários automaticamente após compra aprovada
- ✅ Atualiza acesso no Supabase

---

## 📋 Próximos Passos (VOCÊ PRECISA FAZER):

### **Passo 1: Configurar Supabase**

1. **Acesse**: https://app.supabase.com
2. **Crie um projeto** (ou use existente)
3. **Execute o SQL**:
   - Vá em **SQL Editor**
   - Copie todo o conteúdo de `supabase-schema.sql`
   - Cole e execute (clique em "Run")

4. **Copie as credenciais**:
   - Vá em **Settings** → **API**
   - Copie:
     - `Project URL` (ex: https://abc123.supabase.co)
     - `anon public` key

### **Passo 2: Configurar Variáveis de Ambiente**

1. **Crie o arquivo `.env.local`** na raiz do projeto:

```bash
cp .env.example .env.local
```

2. **Edite `.env.local`** e preencha:

```env
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui

# JWT (gere uma chave forte)
JWT_SECRET=sua-chave-secreta-super-forte-aqui

# APPMAX (opcional, para validação de webhook)
APPMAX_WEBHOOK_SECRET=sua-chave-webhook-appmax

# APP
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Dica**: Para gerar JWT_SECRET forte:
```bash
openssl rand -base64 32
```

### **Passo 3: Configurar Webhook na APPMAX**

1. **Acesse o painel da APPMAX**: https://app.appmax.com.br
2. **Vá em**: Configurações → Integrações → Webhooks
3. **Adicione novo webhook**:
   - **URL**: `https://seu-dominio.com/api/webhook/appmax`
   - **Evento**: `purchase.approved` (compra aprovada)
   - **Método**: POST

4. **Teste o webhook**:
   - Acesse: `https://seu-dominio.com/api/webhook/appmax` (GET)
   - Deve retornar: `{"message": "Webhook APPMAX está funcionando"}`

### **Passo 4: Testar Localmente**

```bash
# Rodar o projeto
npm run dev

# Testar:
# 1. Acesse: http://localhost:3000
# 2. Clique em "Comprar Agora" → Deve abrir checkout APPMAX
# 3. Clique em "Entrar" → Deve abrir página de login
# 4. Tente acessar /dashboard → Deve redirecionar para login
```

### **Passo 5: Criar Primeiro Usuário (Teste)**

**Opção A: Via Supabase (Manual)**
1. Vá no Supabase → **Table Editor** → `users`
2. Clique em **Insert** → **Insert row**
3. Preencha:
   - `email`: seu@email.com
   - `name`: Seu Nome
   - `has_access`: `true`
4. Salve

**Opção B: Via Webhook (Automático)**
1. Faça uma compra de teste na APPMAX
2. O webhook criará o usuário automaticamente

### **Passo 6: Testar Login**

1. Acesse: http://localhost:3000/login
2. Digite o email que você criou
3. Digite qualquer senha (por enquanto aceita qualquer senha)
4. Clique em "Entrar"
5. Deve redirecionar para `/dashboard`

---

## 🔒 Segurança (IMPORTANTE para Produção)

### **Adicionar Hash de Senha**

Atualmente, o sistema aceita qualquer senha. Para produção, você deve:

1. **Instalar bcrypt**:
```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

2. **Atualizar schema SQL** (adicionar coluna de senha):
```sql
ALTER TABLE users ADD COLUMN password_hash TEXT;
```

3. **Atualizar `lib/auth.ts`** para verificar senha com hash

---

## 📁 Estrutura de Arquivos Criados/Atualizados

```
├── lib/
│   ├── appmax.ts          ✅ Integração APPMAX
│   ├── supabase.ts        ✅ Cliente Supabase
│   └── auth.ts            ✅ Autenticação JWT
├── app/
│   ├── login/
│   │   └── page.tsx       ✅ Página de login
│   ├── dashboard/
│   │   └── page.tsx       ✅ Dashboard protegido
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts    ✅ API de login
│       │   └── me/route.ts       ✅ API de usuário
│       └── webhook/
│           └── appmax/route.ts   ✅ Webhook APPMAX
├── components/
│   └── ProtectedRoute.tsx ✅ Proteção de rotas
├── supabase-schema.sql    ✅ Schema do banco
├── .env.example           ✅ Template de variáveis
└── SETUP-COMPLETO.md      📄 Este arquivo
```

---

## 🎯 Fluxo Completo

### **Fluxo de Compra:**
1. Cliente clica em "Comprar Agora" no site
2. Abre checkout APPMAX
3. Cliente preenche dados e paga
4. APPMAX aprova pagamento
5. APPMAX envia webhook para `/api/webhook/appmax`
6. Sistema cria usuário no Supabase com `has_access: true`
7. Cliente recebe email com instruções de login (TODO)

### **Fluxo de Login:**
1. Cliente acessa `/login`
2. Digita email e senha
3. Sistema valida no Supabase
4. Gera token JWT
5. Salva token no localStorage
6. Redireciona para `/dashboard`

### **Fluxo de Acesso ao Dashboard:**
1. Cliente acessa `/dashboard`
2. `ProtectedRoute` verifica token
3. Faz request para `/api/auth/me`
4. Valida token e acesso
5. Se válido: mostra dashboard
6. Se inválido: redireciona para `/login`

---

## 🐛 Troubleshooting

### **Erro: "Missing Supabase environment variables"**
- Verifique se criou `.env.local`
- Verifique se as variáveis estão corretas
- Reinicie o servidor (`npm run dev`)

### **Erro: "Token inválido"**
- Limpe o localStorage: `localStorage.clear()`
- Faça login novamente

### **Webhook não funciona**
- Verifique se a URL está correta
- Teste com GET: `curl https://seu-dominio.com/api/webhook/appmax`
- Veja logs no console do servidor

### **Botão "Comprar Agora" não abre**
- Verifique se o link está correto em `lib/appmax.ts`
- Abra o console do navegador (F12) e veja erros

---

## 🚀 Deploy na Vercel

1. **Adicione variáveis de ambiente** no dashboard da Vercel:
   - Settings → Environment Variables
   - Adicione todas as variáveis do `.env.local`

2. **Configure webhook da APPMAX** com URL de produção:
   - `https://seu-dominio.vercel.app/api/webhook/appmax`

3. **Deploy**:
```bash
git add .
git commit -m "Sistema de autenticação completo"
git push
```

---

## ✅ Checklist Final

- [ ] Supabase configurado e SQL executado
- [ ] `.env.local` criado e preenchido
- [ ] Webhook APPMAX configurado
- [ ] Primeiro usuário criado (teste)
- [ ] Login testado e funcionando
- [ ] Dashboard protegido e acessível
- [ ] Botões "Comprar Agora" funcionando
- [ ] Deploy na Vercel com variáveis configuradas

---

## 📞 Suporte

Se tiver dúvidas, me chame! 🚀

**Próximos passos sugeridos:**
1. Adicionar hash de senha (bcrypt)
2. Enviar email de boas-vindas após compra
3. Adicionar recuperação de senha
4. Criar painel admin para gerenciar usuários
5. Adicionar analytics (Google Analytics, Facebook Pixel)
