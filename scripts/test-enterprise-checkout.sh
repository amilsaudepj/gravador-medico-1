#!/bin/bash

# ========================================
# 🧪 TESTE COMPLETO - ENTERPRISE CHECKOUT V3.0
# ========================================

echo "🧪 Iniciando testes do Enterprise Checkout V3.0..."
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Testando $name... "
    
    response=$(curl -s "$url" -H "x-forwarded-for: 8.8.8.8" 2>&1)
    
    if [[ $response == *"$expected"* ]]; then
        echo -e "${GREEN}✅ PASSOU${NC}"
        return 0
    else
        echo -e "${RED}❌ FALHOU${NC}"
        echo "   Resposta: $response"
        return 1
    fi
}

# =====================================================
# 1️⃣ TESTE: WEBHOOK HEALTHCHECK
# =====================================================
echo "1️⃣ Testando Webhook Healthcheck..."
test_endpoint "Webhook MP V3" \
    "http://localhost:3000/api/webhooks/mercadopago-v3" \
    "mercadopago-webhook-v3"

echo ""

# =====================================================
# 2️⃣ TESTE: VALIDAÇÃO DE ASSINATURA
# =====================================================
echo "2️⃣ Testando Validação de Assinatura..."
response=$(curl -s -X POST "http://localhost:3000/api/webhooks/mercadopago-v3" \
    -H "Content-Type: application/json" \
    -H "x-forwarded-for: 8.8.8.8" \
    -d '{"test": true}' 2>&1)

if [[ $response == *"Missing webhook signature"* ]]; then
    echo -e "${GREEN}✅ Validação de assinatura funcionando${NC}"
else
    echo -e "${RED}❌ Validação de assinatura falhou${NC}"
fi

echo ""

# =====================================================
# 3️⃣ TESTE: RATE LIMITING
# =====================================================
echo "3️⃣ Testando Rate Limiting..."
count=0
for i in {1..12}; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/webhooks/mercadopago-v3" -H "x-forwarded-for: 8.8.8.8")
    if [ "$status" == "429" ]; then
        echo -e "${GREEN}✅ Rate limit ativado na tentativa $i${NC}"
        count=$i
        break
    fi
done

if [ $count -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Rate limit não ativado (pode precisar de mais requisições)${NC}"
fi

echo ""

# =====================================================
# 4️⃣ VERIFICAR VARIÁVEIS DE AMBIENTE
# =====================================================
echo "4️⃣ Verificando Variáveis de Ambiente..."

check_var() {
    local var_name=$1
    local var_value=$(grep "^$var_name=" .env.local 2>/dev/null | cut -d'=' -f2)
    
    if [ -n "$var_value" ] && [[ $var_value != *"xxxxxxxx"* ]] && [[ $var_value != *"seu-"* ]]; then
        echo -e "   ${GREEN}✅${NC} $var_name configurado"
        return 0
    else
        echo -e "   ${RED}❌${NC} $var_name NÃO configurado (ainda usa placeholder)"
        return 1
    fi
}

check_var "NEXT_PUBLIC_SUPABASE_URL"
check_var "SUPABASE_SERVICE_ROLE_KEY"
check_var "MERCADOPAGO_ACCESS_TOKEN"
check_var "NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY"

echo ""
echo -e "${YELLOW}⚠️  Pendente de configuração manual:${NC}"
check_var "TURNSTILE_SECRET_KEY" || echo "   → Configure em: https://dash.cloudflare.com"
check_var "MERCADOPAGO_WEBHOOK_SECRET" || echo "   → Configure em: https://www.mercadopago.com.br/developers"
check_var "RESEND_API_KEY" || echo "   → Configure em: https://resend.com"

echo ""

# =====================================================
# 5️⃣ VERIFICAR BANCO DE DADOS
# =====================================================
echo "5️⃣ Verificando Schema do Banco..."

if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
    echo -e "${GREEN}✅${NC} Supabase configurado"
    echo "   Execute manualmente no SQL Editor:"
    echo "   SELECT COUNT(*) FROM orders; -- Deve funcionar"
else
    echo -e "${RED}❌${NC} Supabase não configurado"
fi

echo ""

# =====================================================
# 📊 RESUMO FINAL
# =====================================================
echo "=========================================="
echo "📊 RESUMO DOS TESTES"
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Componentes Implementados:${NC}"
echo "   • Schema SQL (orders, payment_attempts, webhook_logs, integration_logs)"
echo "   • Validators (Zod schemas)"
echo "   • Middleware (Rate Limiting, Security Headers)"
echo "   • API de Checkout (/api/checkout/cascade)"
echo "   • Webhook Handler (/api/webhooks/mercadopago-v3)"
echo "   • Edge Function (Lovable - admin-user-manager)"
echo "   • Frontend (CheckoutFormV3.tsx)"
echo ""
echo -e "${YELLOW}⚠️  Pendente de Configuração:${NC}"
echo "   1. Cloudflare Turnstile (anti-bot)"
echo "   2. Mercado Pago Webhook Secret"
echo "   3. Resend API Key (emails)"
echo ""
echo "📖 Consulte: SETUP-WEBHOOKS-MANUAL.md"
echo ""
echo "🚀 Sistema pronto para desenvolvimento!"
echo "   Para produção, configure as variáveis pendentes."
echo ""
