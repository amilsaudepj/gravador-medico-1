#!/bin/bash

# =====================================================
# SCRIPT DE CORREÇÃO AUTOMÁTICA
# Identifica e mostra o que precisa ser corrigido
# =====================================================

echo ""
echo "🏥 VERIFICAÇÃO DE SCHEMA - APPMAX INTEGRATION"
echo "============================================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Verificando arquivos de schema disponíveis..."
echo ""

if [ -f "database/CORRECAO-URGENTE-SCHEMA.sql" ]; then
  echo "  ${GREEN}✅${NC} CORRECAO-URGENTE-SCHEMA.sql encontrado"
else
  echo "  ${RED}❌${NC} CORRECAO-URGENTE-SCHEMA.sql NÃO encontrado"
fi

if [ -f "supabase-admin-schema.sql" ]; then
  echo "  ${GREEN}✅${NC} supabase-admin-schema.sql encontrado"
else
  echo "  ${RED}❌${NC} supabase-admin-schema.sql NÃO encontrado"
fi

if [ -f "database/01-schema-completo.sql" ]; then
  echo "  ${GREEN}✅${NC} database/01-schema-completo.sql encontrado"
else
  echo "  ${RED}❌${NC} database/01-schema-completo.sql NÃO encontrado"
fi

echo ""
echo "============================================================"
echo "🎯 AÇÃO NECESSÁRIA"
echo "============================================================"
echo ""
echo "Execute os seguintes passos:"
echo ""
echo "${YELLOW}1.${NC} Acesse o Supabase Dashboard:"
echo "   https://supabase.com/dashboard"
echo ""
echo "${YELLOW}2.${NC} Vá em: SQL Editor > New Query"
echo ""
echo "${YELLOW}3.${NC} Cole o conteúdo do arquivo:"
echo "   ${GREEN}database/CORRECAO-URGENTE-SCHEMA.sql${NC}"
echo ""
echo "${YELLOW}4.${NC} Execute o SQL (Cmd/Ctrl + Enter)"
echo ""
echo "${YELLOW}5.${NC} Teste se funcionou:"
echo "   ${GREEN}node scripts/diagnostico-completo.js${NC}"
echo ""
echo "============================================================"
echo ""
echo "📖 Para mais detalhes, leia: ${GREEN}CORRECAO-URGENTE.md${NC}"
echo ""
