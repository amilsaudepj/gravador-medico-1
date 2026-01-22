# 🔍 DEBUG: Problema from_me no WhatsApp

## 🔴 Problema Atual:
- Mensagens enviadas pelo sistema NÃO aparecem no chat do dashboard
- Apenas mensagens recebidas dos clientes aparecem (lado esquerdo)
- Todas as mensagens no banco têm `from_me: false`

## 📊 Status Atual:

### ✅ O que funciona:
1. Envio de mensagens via `/api/whatsapp/send`
2. Evolution API confirma envio com `fromMe: true`
3. Webhook recebe a confirmação
4. Mensagem é salva no banco

### ❌ O que NÃO funciona:
1. Campo `from_me` sempre salva como `false`
2. Mensagens enviadas não renderizam do lado direito
3. Chat não mostra conversa completa

## 🔍 Logs para Verificar:

### No Console do Navegador (F12):
```
🔍 [MessageBubble] {
  id: "xxx",
  content: "...",
  from_me: false/true,  ← VERIFICAR ESTE VALOR
  isFromMe: false/true
}
```

### No Vercel Runtime Logs:
```
🔍 [DEBUG CONVERSÃO] from_me original: XXX
🔍 [DEBUG CONVERSÃO] from_me convertido: true/false
💾 [upsertWhatsAppMessage] Recebendo input: { from_me: true/false }
💾 [upsertWhatsAppMessage] Mensagem salva no banco: { from_me: true/false }
✅ Mensagem salva: XXX, from_me final: true/false
```

## 🎯 Próximos Passos:

1. **Enviar mensagem nova** pelo dashboard
2. **Verificar logs do console** (navegador)
3. **Verificar logs do Vercel** (Runtime Logs)
4. **Executar SQL** para ver últimas mensagens:

```sql
SELECT 
  id,
  SUBSTRING(content, 1, 30) as preview,
  from_me,
  timestamp,
  created_at
FROM whatsapp_messages
WHERE remote_jid = '5521988960217@s.whatsapp.net'  -- Ajustar remote_jid
ORDER BY timestamp DESC
LIMIT 10;
```

## 🔧 Possíveis Causas:

1. **Tipo de dado errado**: Evolution API pode enviar `fromMe` como string `"true"` ou número `1`
2. **Conversão falhando**: Nossa conversão não está pegando todos os casos
3. **Supabase sobrescrevendo**: Algum trigger ou default está mudando o valor
4. **TypeScript casting**: Type assertion pode estar causando problema

## 💡 Solução Temporária:

Se os logs mostrarem que está salvando `false`, podemos:
1. Atualizar manualmente no SQL
2. Adicionar flag alternativa
3. Verificar raw_payload para extrair valor correto

## 📝 Comandos Úteis:

### Ver mensagens recentes:
```sql
SELECT * FROM whatsapp_messages 
ORDER BY created_at DESC 
LIMIT 5;
```

### Atualizar mensagens antigas:
```sql
UPDATE whatsapp_messages 
SET from_me = true 
WHERE message_id LIKE '3EB%';  -- IDs de mensagens enviadas
```

### Verificar raw_payload:
```sql
SELECT 
  id,
  content,
  from_me,
  raw_payload->>'key' as key_data
FROM whatsapp_messages
ORDER BY created_at DESC
LIMIT 3;
```
