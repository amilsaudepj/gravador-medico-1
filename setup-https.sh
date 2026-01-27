#!/bin/bash

echo "
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔒 CONFIGURANDO HTTPS LOCAL COM MKCERT                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"

# Verificar se mkcert está instalado
if ! command -v mkcert &> /dev/null; then
    echo "❌ mkcert não encontrado!"
    echo ""
    echo "📦 INSTALAÇÃO MANUAL:"
    echo ""
    echo "1️⃣ Com Homebrew (recomendado):"
    echo "   brew install mkcert"
    echo ""
    echo "2️⃣ Sem Homebrew:"
    echo "   curl -JLO \"https://dl.filippo.io/mkcert/latest?for=darwin/amd64\""
    echo "   chmod +x mkcert-v*-darwin-amd64"
    echo "   sudo mv mkcert-v*-darwin-amd64 /usr/local/bin/mkcert"
    echo ""
    exit 1
fi

echo "✅ mkcert encontrado!"
echo ""

# Instalar CA local
echo "📋 Instalando CA local (pode pedir senha de administrador)..."
mkcert -install

# Gerar certificados
echo ""
echo "🔐 Gerando certificados SSL para localhost..."
mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 ::1

# Verificar se os arquivos foram criados
if [ -f "localhost.pem" ] && [ -f "localhost-key.pem" ]; then
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║   ✅ CERTIFICADOS SSL CRIADOS COM SUCESSO!                   ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📁 Arquivos criados:"
    echo "   • localhost.pem (certificado)"
    echo "   • localhost-key.pem (chave privada)"
    echo ""
    echo "🚀 PRÓXIMO PASSO:"
    echo "   npm run dev:https"
    echo ""
    echo "🌐 Acesse:"
    echo "   → https://localhost:3000"
    echo "   → https://localhost:3000/checkout-test"
    echo ""
    echo "💳 Agora o Mercado Pago SDK funcionará!"
    echo ""
else
    echo ""
    echo "❌ Erro ao criar certificados!"
    echo "Tente manualmente:"
    echo "   mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost"
    exit 1
fi
