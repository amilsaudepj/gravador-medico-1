# 📸 Estratégia de Fallback para Fotos de Perfil - DEFINITIVA

## 🔍 Problema Identificado

Todos os endpoints tradicionais de foto de perfil retornam **404** na versão atual da Evolution API:
- ❌ `POST /chat/fetchProfilePicture` - 404
- ❌ `GET /chat/findProfilePicture` - 404
- ❌ `GET /chat/findContact` - 404

**Único endpoint funcional:**
- ✅ `GET /chat/findContacts/{instance}?where[remoteJid]=xxx`

## 🎯 Solução Implementada

### Estratégia de 3 Níveis

#### 1️⃣ **Tentar extrair do payload da mensagem**
Algumas vezes a Evolution API já envia a foto no próprio evento `messages.upsert`:

```typescript
// Campos possíveis no payload
messagePayload.profilePictureUrl
messagePayload.profilePicUrl
messagePayload.picture
messagePayload.imgUrl
```

#### 2️⃣ **Buscar via findContacts (ÚNICO que funciona)**
```bash
GET /chat/findContacts/{instance}?where[remoteJid]=5511999999999@s.whatsapp.net
```

**Resposta esperada:**
```json
[
  {
    "id": "5511999999999@s.whatsapp.net",
    "profilePictureUrl": "https://...",
    "pushName": "João Silva",
    ...
  }
]
```

#### 3️⃣ **Fallback para null**
Se nenhuma das estratégias funcionar, salva `null` no banco e **não trava o processo**.

## 🔧 Implementação no Webhook

```typescript
// PASSO 1: Tentar buscar foto com fallback
const profilePictureUrl = await fetchProfilePicture(
  key.remoteJid,    // Ex: 5511999999999@s.whatsapp.net
  payload.data      // Payload completo da mensagem
)

// PASSO 2: Salvar no contato (null é aceito)
await upsertWhatsAppContact({
  remote_jid: key.remoteJid,
  push_name: pushName || undefined,
  profile_picture_url: profilePictureUrl || undefined,  // ✅ Pode ser null
  is_group: key.remoteJid.includes('@g.us')
})
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
