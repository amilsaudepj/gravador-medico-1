#!/bin/bash

# ================================================================
# Script de Teste - POST /contact/checkNumbers (Evolution v2)
# ================================================================
# Endpoint MAIS ROBUSTO para buscar fotos de perfil na v2
# ================================================================

EVOLUTION_API_URL="https://evolution-api-production-eb21.up.railway.app"
API_KEY="Beagle3005"
INSTANCE_NAME="whatsapp-principal"

# ================================================================
# CONFIGURAÇÃO: Coloque um número de teste real aqui
# Formato: APENAS O NÚMERO (sem @s.whatsapp.net)
# Exemplo: 5511999999999
# ================================================================
PHONE_NUMBER="${1:-5511999999999}"

echo "════════════════════════════════════════════════════════════"
echo "🧪 TESTE: POST /contact/checkNumbers (Evolution v2)"
echo "════════════════════════════════════════════════════════════"
echo "Instance: $INSTANCE_NAME"
echo "Phone Number: $PHONE_NUMBER"
echo ""

# Montar URL
URL="${EVOLUTION_API_URL}/contact/checkNumbers/${INSTANCE_NAME}"

echo "📡 URL:"
echo "$URL"
echo ""
echo "📦 Body JSON:"
echo "{\"numbers\": [\"$PHONE_NUMBER\"]}"
echo ""
echo "────────────────────────────────────────────────────────────"
echo "📥 Resposta JSON:"
echo "────────────────────────────────────────────────────────────"

# Fazer request POST com timeout de 10 segundos
RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 -X POST "$URL" \
  -H "apikey: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"numbers\": [\"$PHONE_NUMBER\"]}")

# Separar corpo e status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

# Exibir resultado formatado
if command -v jq &> /dev/null; then
  echo "$HTTP_BODY" | jq '.'
else
  echo "$HTTP_BODY"
fi

echo ""
echo "────────────────────────────────────────────────────────────"
echo "📊 Status HTTP: $HTTP_CODE"
echo "────────────────────────────────────────────────────────────"

# Verificar resultado
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ SUCESSO! Endpoint funcionando"
  echo ""
  echo "📝 Campos de foto para verificar:"
  echo "   - profilePicUrl (PADRÃO na v2)"
  echo "   - profilePictureUrl"
  echo "   - picture"
  echo "   - imgUrl"
  echo "   - image"
  
  # Tentar extrair URL da foto se tiver jq
  if command -v jq &> /dev/null; then
    PHOTO=$(echo "$HTTP_BODY" | jq -r '
      if type == "array" and length > 0 then
        .[0].profilePicUrl // .[0].profilePictureUrl // .[0].picture // .[0].imgUrl // .[0].image // "null"
      else
        .profilePicUrl // .profilePictureUrl // .picture // .imgUrl // .image // "null"
      end
    ')
    
    if [ "$PHOTO" != "null" ] && [ -n "$PHOTO" ]; then
      echo ""
      echo "🖼️  FOTO ENCONTRADA:"
      echo "$PHOTO"
      echo ""
      echo "✅ Esta URL será salva em whatsapp_contacts.profile_picture_url"
    else
      echo ""
      echo "⚠️  Contato encontrado mas SEM foto de perfil"
      echo "    (Número pode não ter foto ou não estar salvo no WhatsApp)"
    fi
    
    # Mostrar estrutura completa do primeiro item
    echo ""
    echo "📋 Estrutura completa do primeiro item:"
    echo "$HTTP_BODY" | jq '.[0]' 2>/dev/null || echo "$HTTP_BODY" | jq '.'
  fi
else
  echo "❌ ERRO! Status HTTP $HTTP_CODE"
  echo ""
  echo "💡 Possíveis causas:"
  echo "   - API Key inválida"
  echo "   - Instance não conectada"
  echo "   - Número em formato incorreto (use apenas dígitos)"
  echo "   - Endpoint mudou de versão"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Teste concluído!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📖 Uso:"
echo "   ./test-checknumbers.sh                  # Usa número padrão"
echo "   ./test-checknumbers.sh 5511999999999    # Número específico"
echo ""
echo "🔍 Lembre-se:"
echo "   - Use APENAS o número (sem @s.whatsapp.net)"
echo "   - Código do país + DDD + número"
echo "   - Exemplo: 5511999999999"
echo ""
