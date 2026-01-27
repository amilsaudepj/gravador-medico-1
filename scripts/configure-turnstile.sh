#!/bin/bash

# ========================================
# 🔧 CONFIGURAR TURNSTILE NO .ENV
# ========================================

echo "🤖 Configuração do Cloudflare Turnstile"
echo ""
echo "Após criar o site no Cloudflare Turnstile, você receberá duas chaves:"
echo ""
echo "1️⃣ Site Key (público - frontend)"
echo "2️⃣ Secret Key (privado - backend)"
echo ""

# Ler Site Key
read -p "Cole o SITE KEY aqui: " SITE_KEY
echo ""

# Ler Secret Key
read -p "Cole o SECRET KEY aqui: " SECRET_KEY
echo ""

# Validar formato básico
if [[ ! $SITE_KEY =~ ^0x4 ]] || [[ ! $SECRET_KEY =~ ^0x4 ]]; then
    echo "⚠️  ATENÇÃO: As chaves geralmente começam com '0x4...'"
    echo "   Tem certeza que copiou corretamente?"
    read -p "Continuar mesmo assim? (y/n): " confirm
    if [[ $confirm != "y" ]]; then
        echo "❌ Cancelado. Execute novamente quando tiver as chaves corretas."
        exit 1
    fi
fi

# Backup do .env.local
cp .env.local .env.local.backup
echo "💾 Backup criado: .env.local.backup"
echo ""

# Atualizar .env.local
sed -i '' "s|^NEXT_PUBLIC_TURNSTILE_SITE_KEY=.*|NEXT_PUBLIC_TURNSTILE_SITE_KEY=$SITE_KEY|" .env.local
sed -i '' "s|^TURNSTILE_SECRET_KEY=.*|TURNSTILE_SECRET_KEY=$SECRET_KEY|" .env.local

echo "✅ Chaves do Turnstile configuradas no .env.local!"
echo ""

# Verificar
echo "🔍 Verificando configuração:"
grep "TURNSTILE" .env.local
echo ""

echo "✅ Pronto! Agora reinicie o servidor:"
echo "   pkill -9 -f 'next dev' && npm run dev"
echo ""
