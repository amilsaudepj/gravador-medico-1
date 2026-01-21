#!/bin/bash

# ================================================================
# Script de Teste: Buscar Foto de Perfil via Evolution API
# ================================================================
# Use este script para testar se o endpoint está funcionando
# ================================================================

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testando busca de foto de perfil na Evolution API v2"
echo ""

# Carregar variáveis de ambiente
source .env.local

# Verificar variáveis
if [ -z "$EVOLUTION_API_URL" ] || [ -z "$EVOLUTION_API_KEY" ] || [ -z "$EVOLUTION_INSTANCE_NAME" ]; then
  echo -e "${RED}❌ Variáveis de ambiente não configuradas!${NC}"
  echo "Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME no .env.local"
  exit 1
fi

echo -e "${GREEN}✅ Variáveis configuradas:${NC}"
echo "   API URL: $EVOLUTION_API_URL"
echo "   Instance: $EVOLUTION_INSTANCE_NAME"
echo ""

# Número de teste (substitua por um número real do seu WhatsApp)
# Formato: 5521999999999@s.whatsapp.net
read -p "Digite o número (com @s.whatsapp.net): " REMOTE_JID

if [ -z "$REMOTE_JID" ]; then
  echo -e "${RED}❌ Número não informado!${NC}"
  exit 1
fi

# URL completa
URL="${EVOLUTION_API_URL}/chat/findContact/${EVOLUTION_INSTANCE_NAME}?number=${REMOTE_JID}"

echo ""
echo -e "${YELLOW}📡 Fazendo requisição...${NC}"
echo "URL: $URL"
echo ""

# Fazer requisição
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -H "apikey: $EVOLUTION_API_KEY" \
  "$URL")

# Separar corpo e status
HTTP_BODY=$(echo "$RESPONSE" | sed -e 's/HTTP_STATUS\:.*//g')
HTTP_STATUS=$(echo "$RESPONSE" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

echo -e "${YELLOW}📊 Status HTTP: $HTTP_STATUS${NC}"
echo ""

if [ "$HTTP_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✅ Sucesso! Resposta:${NC}"
  echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
  
  # Tentar extrair a URL da foto
  PHOTO_URL=$(echo "$HTTP_BODY" | jq -r '.profilePictureUrl // .profilePicUrl // .picture // .imgUrl // .contact.profilePictureUrl // "null"' 2>/dev/null)
  
  echo ""
  if [ "$PHOTO_URL" != "null" ]; then
    echo -e "${GREEN}📸 Foto encontrada:${NC}"
    echo "   $PHOTO_URL"
  else
    echo -e "${YELLOW}⚠️  Nenhuma URL de foto encontrada na resposta${NC}"
  fi
else
  echo -e "${RED}❌ Erro! Resposta:${NC}"
  echo "$HTTP_BODY"
fi

echo ""
echo "================================================"
echo ""
echo "💡 Endpoints possíveis da Evolution API v2:"
echo ""
echo "Opção 1: GET /chat/findContact/{instance}?number=..."
echo "Opção 2: GET /profile/picture/{instance}?number=..."
echo "Opção 3: POST /chat/findProfilePicture/{instance}"
echo ""
echo "Se este não funcionar, teste os outros endpoints manualmente:"
echo ""
echo "curl -H 'apikey: $EVOLUTION_API_KEY' \\"
echo "  '$EVOLUTION_API_URL/profile/picture/$EVOLUTION_INSTANCE_NAME?number=$REMOTE_JID'"
echo ""
