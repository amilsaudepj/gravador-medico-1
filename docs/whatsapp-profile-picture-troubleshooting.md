# 🔍 Troubleshooting: Foto de Perfil Salvando `null`

## 🧪 Como Testar o Endpoint

### 1. Usar o Script de Teste

```bash
cd "/Users/helciomattos/Desktop/GRAVADOR MEDICO"
./scripts/test-profile-picture.sh
```

O script vai:
- ✅ Verificar variáveis de ambiente
- ✅ Fazer requisição GET para a Evolution API
- ✅ Mostrar a resposta completa
- ✅ Tentar extrair a URL da foto

### 2. Teste Manual com cURL

```bash
# Opção 1: Endpoint atual (GET /chat/findContact)
curl -H "apikey: Beagle3005" \
  "https://evolution-api-production-eb21.up.railway.app/chat/findContact/whatsapp-principal?number=5521988960217@s.whatsapp.net"

# Opção 2: Endpoint alternativo (GET /profile/picture)
curl -H "apikey: Beagle3005" \
  "https://evolution-api-production-eb21.up.railway.app/profile/picture/whatsapp-principal?number=5521988960217@s.whatsapp.net"

# Opção 3: POST /chat/findProfilePicture
curl -X POST \
  -H "apikey: Beagle3005" \
  -H "Content-Type: application/json" \
  -d '{"number":"5521988960217@s.whatsapp.net"}' \
  "https://evolution-api-production-eb21.up.railway.app/chat/findProfilePicture/whatsapp-principal"
```

---

## 📋 Possíveis Estruturas de Resposta

A Evolution API v2 pode retornar a foto em diferentes formatos:

### Formato 1: Objeto direto
```json
{
  "profilePictureUrl": "https://pps.whatsapp.net/v/..."
}
```

### Formato 2: Dentro de `contact`
```json
{
  "contact": {
    "id": "5521988960217@s.whatsapp.net",
    "name": "João Silva",
    "profilePictureUrl": "https://pps.whatsapp.net/v/..."
  }
}
```

### Formato 3: Campo alternativo
```json
{
  "profilePicUrl": "https://pps.whatsapp.net/v/...",
  "picture": "https://pps.whatsapp.net/v/...",
  "imgUrl": "https://pps.whatsapp.net/v/..."
}
```

### Formato 4: Sem foto
```json
{
  "profilePictureUrl": null
}
```
ou
```json
{}
```

---

## 🔧 Código Atual no Webhook

**Arquivo:** `app/api/webhooks/whatsapp/route.ts`

```typescript
async function fetchProfilePicture(remoteJid: string): Promise<string | null> {
  // Endpoint: GET /chat/findContact/{instance}?number={remoteJid}
  const url = `${EVOLUTION_API_URL}/chat/findContact/${EVOLUTION_INSTANCE_NAME}?number=${encodeURIComponent(remoteJid)}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': EVOLUTION_API_KEY
    }
  })

  const data = await response.json()
  
  // Tentar vários formatos possíveis
  const photoUrl = 
    data.profilePictureUrl || 
    data.profilePicUrl || 
    data.picture || 
    data.imgUrl ||
    (data.contact && data.contact.profilePictureUrl) ||
    null

  return photoUrl
}
```

---

## 🐛 Diagnóstico de Problemas

### Problema 1: Foto sempre `null`

**Sintoma:** Banco de dados mostra `profile_picture_url = null` sempre

**Possíveis causas:**
1. ❌ Endpoint errado da Evolution API
2. ❌ Estrutura de resposta diferente
3. ❌ Contato sem foto no WhatsApp
4. ❌ API key inválida
5. ❌ Instance não conectada

**Como verificar:**

```bash
# 1. Verificar logs do webhook
# Procure por:
📸 Buscando foto de perfil em: ...
📸 Resposta da API: { ... }
✅ Foto de perfil encontrada: https://...
# ou
⚠️ Nenhuma foto de perfil encontrada na resposta
```

```bash
# 2. Testar endpoint manualmente
./scripts/test-profile-picture.sh
```

```bash
# 3. Verificar se a instância está conectada
curl -H "apikey: Beagle3005" \
  "https://evolution-api-production-eb21.up.railway.app/instance/connectionState/whatsapp-principal"
```

---

### Problema 2: Erro HTTP 404

**Sintoma:** Log mostra `⚠️ Erro HTTP 404 ao buscar foto`

**Solução:** Testar endpoints alternativos

```typescript
// Opção 1: Tentar /profile/picture
const url = `${EVOLUTION_API_URL}/profile/picture/${EVOLUTION_INSTANCE_NAME}?number=${encodeURIComponent(remoteJid)}`

// Opção 2: Tentar /chat/profilePicUrl
const url = `${EVOLUTION_API_URL}/chat/profilePicUrl/${EVOLUTION_INSTANCE_NAME}?number=${encodeURIComponent(remoteJid)}`
```

---

### Problema 3: Erro de Autenticação

**Sintoma:** Log mostra `⚠️ Erro HTTP 401` ou `403`

**Verificar:**
```bash
# API Key correta?
echo $EVOLUTION_API_KEY

# Instance name correto?
echo $EVOLUTION_INSTANCE_NAME
```

---

## 📝 Logs Esperados (Funcionando)

```bash
📥 Webhook recebido: { remoteJid: '5521988960217@s.whatsapp.net' }
📸 Buscando foto de perfil em: https://evolution-api.../chat/findContact/whatsapp-principal?number=5521988960217%40s.whatsapp.net
📸 Resposta da API: {
  "contact": {
    "id": "5521988960217@s.whatsapp.net",
    "name": "João Silva",
    "profilePictureUrl": "https://pps.whatsapp.net/v/t61.24694-24/..."
  }
}
✅ Foto de perfil encontrada: https://pps.whatsapp.net/v/t61.24694-24/...
🔄 Criando/atualizando contato primeiro...
✅ Contato garantido: 5521988960217@s.whatsapp.net
✅ Mensagem salva: <uuid>
```

---

## 🔄 Se Nenhum Endpoint Funcionar

### Solução Alternativa 1: Desabilitar busca de foto temporariamente

```typescript
async function fetchProfilePicture(remoteJid: string): Promise<string | null> {
  // TODO: Verificar documentação correta da Evolution API v2
  console.warn('⚠️ Busca de foto desabilitada temporariamente')
  return null
}
```

### Solução Alternativa 2: Usar webhook de atualização de perfil

Configurar webhook específico para `profile.update`:

```typescript
// Novo webhook para atualização de perfil
export async function POST(request: NextRequest) {
  const payload = await request.json()
  
  if (payload.event === 'profile.update') {
    await upsertWhatsAppContact({
      remote_jid: payload.data.jid,
      profile_picture_url: payload.data.profilePictureUrl
    })
  }
}
```

---

## 📚 Documentação da Evolution API v2

Para verificar o endpoint correto, consulte:

1. **Swagger da sua instância:**
   ```
   https://evolution-api-production-eb21.up.railway.app/docs
   ```

2. **GitHub da Evolution API:**
   ```
   https://github.com/EvolutionAPI/evolution-api
   ```

3. **Testar no Postman/Insomnia:**
   - Importar collection da Evolution API
   - Testar cada endpoint manualmente

---

## ✅ Checklist de Validação

- [ ] Variáveis de ambiente configuradas
- [ ] Script de teste executado com sucesso
- [ ] Endpoint retorna dados válidos
- [ ] Estrutura de resposta identificada
- [ ] Código atualizado com endpoint correto
- [ ] Webhook recebendo fotos corretamente
- [ ] Banco de dados com URLs válidas
- [ ] Interface mostrando fotos

---

## 🆘 Próximos Passos

1. **Execute o script de teste:**
   ```bash
   ./scripts/test-profile-picture.sh
   ```

2. **Compartilhe a resposta** para ajustar o código

3. **Se funcionar:** Commit e deploy

4. **Se não funcionar:** Testar endpoints alternativos
