#!/bin/bash

# ================================================================
# Script de Teste - Endpoint findContacts
# ================================================================
# Testa o ÚNICO endpoint que funciona para buscar fotos de perfil
# ================================================================

EVOLUTION_API_URL="https://evolution-api-production-eb21.up.railway.app"
API_KEY="Beagle3005"
INSTANCE_NAME="whatsapp-principal"

# Números de teste (substitua por números reais do seu WhatsApp)
# Exemplo: 5511999999999@s.whatsapp.net
REMOTE_JID="5511999999999@s.whatsapp.net"

echo "🧪 Testando endpoint findContacts..."
echo "Instance: $INSTANCE_NAME"
echo "RemoteJid: $REMOTE_JID"
echo ""

# Montar URL correta
URL="${EVOLUTION_API_URL}/chat/findContacts/${INSTANCE_NAME}?where[remoteJid]=${REMOTE_JID}"

echo "📡 URL: $URL"
echo ""

# Fazer request
echo "📥 Resposta:"
curl -X GET "$URL" \
  -H "apikey: $API_KEY" \
  | jq '.'

echo ""
echo "✅ Teste concluído!"
echo ""
echo "📝 O que verificar na resposta:"
echo "   - Se retornou array de contatos"
echo "   - Se tem campo 'profilePictureUrl' ou 'profilePicUrl'"
echo "   - Se tem campo 'picture' ou 'imgUrl'"
