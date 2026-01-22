# 📢 Sistema de Notificações + 💬 Chat Interno

## ✅ O Que Foi Implementado

### 1️⃣ Sistema de Notificações em Tempo Real

#### Componentes Criados:
- **`NotificationProvider.tsx`** - Context global de notificações
- **`NotificationBell.tsx`** - Sininho com badge e dropdown
- **`lib/types/notifications.ts`** - Types TypeScript

#### Funcionalidades:
✅ Toast visual (biblioteca sonner)
✅ Notificações do navegador (Browser Notification API)
✅ Badge com contador de não lidas
✅ Dropdown com lista de notificações
✅ Click para redirecionar ao chat
✅ Foto do remetente
✅ Timestamp relativo (há 2 minutos, há 1 hora, etc)
✅ Marcar como lida / Marcar todas
✅ Deep linking (URLs com parâmetros)

#### Tipos Suportados:
- `whatsapp_message` - Nova mensagem WhatsApp
- `admin_chat_message` - Mensagem do chat interno
- `system` - Notificação do sistema
- `order` - Pedido novo/atualizado
- `customer` - Novo cliente

#### Integração WhatsApp:
- Notificação automática quando receber mensagem
- Apenas para mensagens recebidas (`from_me=false`)
- Mostra nome e foto do contato
- Botão "Ver" redireciona: `/admin/whatsapp?chat=5521988960217@s.whatsapp.net`

#### Posicionamento:
- Sininho adicionado no `DockSidebar`
- Acima do avatar do usuário
- Visível em todas as páginas do dashboard

---

### 2️⃣ Chat Interno entre Administradores

#### Database Schema:
📄 **`database/10-admin-chat-schema.sql`**

**Tabelas:**
1. `admin_chat_conversations` - Conversas (direct ou group)
2. `admin_chat_participants` - Participantes (N:N)
3. `admin_chat_messages` - Mensagens

**Funcionalidades do Schema:**
✅ Conversas diretas (1:1)
✅ Grupos (N participantes)
✅ Contador de não lidas por usuário
✅ Última mensagem denormalizada (performance)
✅ Soft delete de mensagens
✅ Reply (responder mensagem)
✅ Suporte a mídia (imagem, arquivo)
✅ Triggers automáticos (updated_at, unread_count)
✅ Realtime habilitado

**Funções SQL:**
- `create_direct_conversation(user1_id, user2_id)` - Cria ou retorna conversa
- `mark_admin_chat_as_read(conversation_id, user_id)` - Marca como lida

**VIEW:**
- `admin_chat_conversations_full` - Dados agregados (participant_count, message_count)

#### TypeScript:
📄 **`lib/types/admin-chat.ts`** - Types completos
📄 **`lib/admin-chat-db.ts`** - Funções helper

**Funções Disponíveis:**
```typescript
getUserConversations(userId) // Lista conversas do usuário
getConversationMessages(conversationId) // Busca mensagens
createOrGetDirectConversation(user1Id, user2Id) // Cria conversa 1:1
sendAdminChatMessage(input) // Envia mensagem
markAdminChatAsRead(conversationId, userId) // Marca como lida
createGroupConversation(creatorId, name, participantIds) // Cria grupo
getAdminUsers() // Lista admins para iniciar conversa
```

---

## 🚀 Próximos Passos

### Para Ativar o Chat Interno:

#### 1. Executar SQL no Supabase
```bash
# Copiar conteúdo de:
database/10-admin-chat-schema.sql

# Colar no Supabase SQL Editor:
https://supabase.com/dashboard/project/egsmraszqnmosmtjuzhx/sql/new

# Executar
```

#### 2. Criar Página do Chat
Criar `app/admin/chat/page.tsx` similar ao WhatsApp:
- Sidebar: Lista de conversas
- Main: Mensagens do chat selecionado
- Header: Nome do outro admin (ou grupo)
- Input: Enviar mensagem
- Realtime: Receber mensagens automaticamente

#### 3. Integrar Notificações
No arquivo do chat, adicionar:
```typescript
import { useNotifications } from '@/components/NotificationProvider'

// Quando receber mensagem via Realtime:
addNotification({
  type: 'admin_chat_message',
  title: senderName,
  message: messageContent,
  metadata: {
    admin_chat_conversation_id: conversationId,
    profile_picture_url: senderAvatar
  }
})
```

#### 4. Adicionar Menu no Sidebar
Em `DockSidebar.tsx`, adicionar item:
```typescript
{
  id: "admin-chat",
  icon: <MessageCircle className="w-6 h-6" />,
  href: "/admin/chat",
  label: "Chat Interno",
  description: "Mensagens entre admins",
}
```

---

## 📊 Estrutura de Dados

### Exemplo de Conversa Direta:
```json
{
  "id": "uuid-123",
  "type": "direct",
  "participant_ids": ["user-1", "user-2"],
  "last_message_content": "Oi, tudo bem?",
  "last_message_timestamp": "2026-01-21T21:30:00Z",
  "unread_count": 3
}
```

### Exemplo de Mensagem:
```json
{
  "id": "msg-456",
  "conversation_id": "uuid-123",
  "sender_id": "user-1",
  "content": "Podemos revisar o dashboard?",
  "message_type": "text",
  "created_at": "2026-01-21T21:30:00Z",
  "sender_name": "João Silva",
  "sender_avatar": "https://..."
}
```

---

## 🎨 UI Sugerida

### Layout Similar ao WhatsApp:
```
┌─────────────────────────────────────────────┐
│ [Header] Chat Interno                       │
├──────────┬──────────────────────────────────┤
│ Conversas│ [Conversa Selecionada]           │
│          │ ┌────────────────────────────┐   │
│ [João]   │ │ João: Oi!         10:30   │   │
│ 3 novas  │ │ Você: Tudo bem?   10:31   │   │
│          │ │ João: Sim!        10:32   │   │
│ [Maria]  │ └────────────────────────────┘   │
│ 1 nova   │                                   │
│          │ [Digite uma mensagem...] [Enviar]│
└──────────┴──────────────────────────────────┘
```

---

## 🔔 Fluxo de Notificações

### WhatsApp:
1. Mensagem chega → Webhook processa
2. Salva no banco → Trigger Supabase Realtime
3. Frontend detecta INSERT → `addNotification()`
4. Toast aparece + Badge atualiza + Browser notification

### Chat Interno:
1. Admin envia mensagem → INSERT em `admin_chat_messages`
2. Trigger atualiza `unread_count` dos outros participantes
3. Supabase Realtime notifica frontend
4. Frontend `addNotification()` para outros admins
5. Click em "Ver" → Redireciona `/admin/chat?conversation=uuid-123`

---

## 🧪 Como Testar

### Notificações WhatsApp:
1. Enviar mensagem para o WhatsApp conectado
2. Ver toast aparecer no canto superior direito
3. Ver badge no sininho com número
4. Clicar no sininho → Ver notificação na lista
5. Clicar em "Ver" → Abre o chat correto

### Chat Interno (após criar UI):
1. Admin 1 envia mensagem para Admin 2
2. Admin 2 (em outra aba) recebe notificação
3. Badge atualiza automaticamente
4. Click → Abre conversa

---

## 📦 Bibliotecas Instaladas
- `sonner` - Toast notifications

---

## ✅ Status

- [x] Sistema de notificações (Provider + Context)
- [x] NotificationBell (sininho com dropdown)
- [x] Integração WhatsApp (notificações automáticas)
- [x] Database schema (chat interno)
- [x] Types TypeScript (admin-chat.ts)
- [x] Functions helper (admin-chat-db.ts)
- [x] **UI do Chat Interno** (/admin/chat criada!)
- [x] **Realtime no Chat Interno** (integrado!)
- [x] **Notificações do Chat Interno** (addNotification integrado!)
- [x] **Autenticação** (supabase.auth.getUser)
- [x] **Menu no DockSidebar** (Chat Interno adicionado)
- [ ] **Executar SQL no Supabase** (ação do usuário)
- [ ] **Upload de arquivos** (futuro)

---

## 🎯 Commits
```
22f01e0 - feat: sistema de notificações em tempo real com sininho
1999b11 - feat: database schema e funções para chat interno entre admins
PRÓXIMO - feat: UI completa do chat interno com Realtime
```

**Deployed:** ✅ Vercel
**Database:** ⏳ Aguardando execução do SQL
