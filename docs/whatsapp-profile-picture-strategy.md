# 📸 Estratégia de Fallback para Fotos de Perfil - DEFINITIVA v3

## 🔍 Problema Identificado (Evolução dos Testes)

### Histórico de Testes:
1. **Primeira tentativa**: Endpoints `findPicture`, `fetchProfilePicture` → ❌ 404
2. **Segunda tentativa**: `GET /chat/findContacts` → ❌ 404  
3. **Solução DEFINITIVA**: `POST /contact/checkNumbers` → ✅ **FUNCIONA!**

### ✅ Endpoint Final (Confirmado Funcional):
```bash
POST /contact/checkNumbers/{instance}
Body: {"numbers": ["5511999999999"]}
```

**Por que este funciona:**
- ✅ É o endpoint OFICIAL da Evolution API v2 para validar números
- ✅ Retorna dados completos do contato incluindo `profilePicUrl`
- ✅ Mais robusto e estável que endpoints de chat
- ✅ Aceita múltiplos números de uma vez (array)

## 🎯 Solução Implementada (v3 - FINAL)

### Estratégia de 2 Níveis (Simplificada e Robusta)

#### 1️⃣ **Tentar extrair do payload da mensagem**
Algumas vezes a Evolution API já envia a foto no próprio evento `messages.upsert`:

```typescript
messagePayload.profilePictureUrl
messagePayload.profilePicUrl
messagePayload.picture
messagePayload.imgUrl
```

#### 2️⃣ **POST /contact/checkNumbers (SOLUÇÃO DEFINITIVA)**

**Request:**
```bash
POST https://evolution-api-production-eb21.up.railway.app/contact/checkNumbers/whatsapp-principal

Headers:
  apikey: Beagle3005
  Content-Type: application/json

Body:
{
  "numbers": ["5511999999999"]  // Apenas o número, sem @s.whatsapp.net
}
```

**Response (HTTP 200):**
```json
[
  {
    "exists": true,
    "jid": "5511999999999@s.whatsapp.net",
    "numberFormatted": "+55 11 99999-9999",
    "profilePicUrl": "https://pps.whatsapp.net/v/...",  ← ESTE CAMPO!
    "isGroup": false,
    "isWhatsApp": true
  }
]
```

**Extração da Foto:**
```typescript
const phoneNumber = remoteJid.split('@')[0]  // "5511999999999@s.whatsapp.net" → "5511999999999"

const response = await fetch(`${API_URL}/contact/checkNumbers/${instance}`, {
  method: 'POST',
  headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ numbers: [phoneNumber] })
})

const data = await response.json()
const photoUrl = data[0]?.profilePicUrl  // ✅ Foto do perfil
```

## 📊 Campos Verificados na Resposta

A função tenta múltiplos campos na resposta da API:

```typescript
contact.profilePictureUrl  // Mais comum
contact.profilePicUrl      // Variação 1
contact.picture            // Variação 2
contact.imgUrl             // Variação 3
```

## 🧪 Como Testar

### 1. Testar endpoint manualmente:
```bash
./scripts/test-findcontacts.sh
```

### 2. Verificar logs do webhook:
```bash
# Logs no Vercel/Railway
"📸 Buscando foto via findContacts: https://..."
"✅ Foto de perfil encontrada via findContacts: https://..."
```

### 3. Verificar no banco Supabase:
```sql
SELECT 
  remote_jid,
  push_name,
  profile_picture_url,
  updated_at
FROM whatsapp_contacts
ORDER BY updated_at DESC
LIMIT 10;
```

## 🔄 Realtime Automático

Como o **Supabase Realtime já está SUBSCRIBED**, assim que uma foto for salva:

1. ✅ Webhook salva foto no banco (`whatsapp_contacts.profile_picture_url`)
2. ✅ Trigger Postgres dispara evento `UPDATE`
3. ✅ Frontend recebe via WebSocket
4. ✅ Interface atualiza automaticamente

## 🎨 Resultado Visual

**Antes (sem foto):**
```
┌─────┐
│  H  │  Helcio Mattos
└─────┘  Oi
```

**Depois (com foto):**
```
┌─────┐
│ 👤  │  Helcio Mattos
└─────┘  Oi
```

## ⚠️ Observações Importantes

1. **Não é crítico**: Se a foto não carregar, o sistema continua funcionando normalmente
2. **Tentativas múltiplas**: Cada nova mensagem tenta buscar a foto novamente
3. **Cache natural**: Uma vez salva, a foto fica no banco e não precisa buscar de novo
4. **Grupos**: Funciona tanto para contatos individuais quanto grupos

## 🚀 Próximos Passos

- [ ] Implementar job periódico para atualizar fotos antigas (opcional)
- [ ] Adicionar cache de fotos no CDN (otimização futura)
- [ ] Criar endpoint manual para forçar atualização de foto específica

## 📝 Changelog

**21/01/2026 - v2.0 (DEFINITIVA)**
- ✅ Mudança para endpoint `/chat/findContacts` (único funcional)
- ✅ Estratégia de 3 níveis (payload → API → null)
- ✅ Não trava processo se falhar
- ✅ Logs detalhados para debug
