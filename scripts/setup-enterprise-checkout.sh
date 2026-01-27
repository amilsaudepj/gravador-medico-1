#!/bin/bash

# ========================================
# 🚀 SETUP ENTERPRISE CHECKOUT V3.0
# ========================================
# Execute este script para configurar o ambiente
# ========================================

set -e # Para no primeiro erro

echo "🚀 Iniciando setup do Enterprise Checkout V3.0..."
echo ""

# =====================================================
# 1️⃣ VERIFICAR DEPENDÊNCIAS
# =====================================================
echo "📦 Verificando dependências..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale: https://nodejs.org"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instale Node.js"
    exit 1
fi

echo "✅ Node.js $(node --version)"
echo "✅ npm $(npm --version)"
echo ""

# =====================================================
# 2️⃣ INSTALAR PACOTES NPM
# =====================================================
echo "📦 Instalando pacotes necessários..."

npm install uuid zod mercadopago @supabase/supabase-js

echo "✅ Pacotes instalados"
echo ""

# =====================================================
# 3️⃣ CONFIGURAR .ENV
# =====================================================
echo "🔧 Configurando variáveis de ambiente..."

if [ ! -f .env.local ]; then
    cp .env.template .env.local
    echo "✅ Arquivo .env.local criado"
    echo "⚠️  IMPORTANTE: Edite .env.local e preencha suas chaves!"
    echo ""
    echo "Pressione ENTER para abrir o arquivo..."
    read
    ${EDITOR:-nano} .env.local
else
    echo "⚠️  .env.local já existe. Pulando..."
fi

echo ""

# =====================================================
# 4️⃣ VERIFICAR SUPABASE CLI
# =====================================================
echo "🗄️  Verificando Supabase CLI..."

if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI não encontrado"
    echo "Deseja instalar? (y/n)"
    read -r response
    
    if [[ "$response" == "y" ]]; then
        npm install -g supabase
        echo "✅ Supabase CLI instalado"
    else
        echo "⚠️  Pule para a próxima etapa se não for usar Edge Functions"
    fi
else
    echo "✅ Supabase CLI instalado"
fi

echo ""

# =====================================================
# 5️⃣ RODAR MIGRATIONS SQL
# =====================================================
echo "🗄️  Configurando banco de dados..."
echo ""
echo "AÇÃO MANUAL NECESSÁRIA:"
echo "1. Abra: https://supabase.com/dashboard/project/SEU_PROJETO/sql/new"
echo "2. Copie o conteúdo de: database/schema-enterprise-checkout.sql"
echo "3. Cole no editor e clique em 'Run'"
echo ""
echo "Pressione ENTER quando terminar..."
read

echo "✅ Schema SQL configurado"
echo ""

# =====================================================
# 6️⃣ DEPLOY EDGE FUNCTION (LOVABLE)
# =====================================================
echo "🚀 Deploy da Edge Function (Lovable)..."
echo ""
echo "AÇÃO MANUAL NECESSÁRIA:"
echo ""
echo "Execute os seguintes comandos:"
echo ""
echo "  supabase login"
echo "  supabase link --project-ref SEU_PROJETO_LOVABLE"
echo "  supabase functions deploy admin-user-manager"
echo "  supabase secrets set EXTERNAL_API_SECRET=webhook-appmax-2026-secure-key"
echo ""
echo "Pressione ENTER quando terminar..."
read

echo "✅ Edge Function deployed"
echo ""

# =====================================================
# 7️⃣ CONFIGURAR WEBHOOKS
# =====================================================
echo "🔔 Configurando webhooks..."
echo ""
echo "AÇÃO MANUAL NECESSÁRIA:"
echo ""
echo "1. MERCADO PAGO:"
echo "   - Acesse: https://www.mercadopago.com.br/developers/panel/app"
echo "   - Configure webhook: https://seudominio.com.br/api/webhooks/mercadopago-v3"
echo "   - Ative evento: payment.updated"
echo "   - Copie o Webhook Secret para .env.local"
echo ""
echo "2. CLOUDFLARE TURNSTILE:"
echo "   - Acesse: https://dash.cloudflare.com/?to=/:account/turnstile"
echo "   - Crie um site"
echo "   - Copie Site Key e Secret Key para .env.local"
echo ""
echo "Pressione ENTER quando terminar..."
read

echo "✅ Webhooks configurados"
echo ""

# =====================================================
# 8️⃣ BUILD & START
# =====================================================
echo "🏗️  Compilando projeto..."

npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build concluído com sucesso"
    echo ""
    echo "🎉 SETUP COMPLETO!"
    echo ""
    echo "Para rodar em desenvolvimento:"
    echo "  npm run dev"
    echo ""
    echo "Para rodar em produção:"
    echo "  npm start"
    echo ""
    echo "📖 Documentação completa: ENTERPRISE-CHECKOUT-GUIA.md"
else
    echo "❌ Build falhou. Verifique os erros acima."
    exit 1
fi
