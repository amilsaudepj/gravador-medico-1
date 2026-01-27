# 🔧 SOLUÇÃO: Mercado Pago em Localhost

## ❌ PROBLEMA IDENTIFICADO:

O SDK do Mercado Pago **NÃO FUNCIONA** em `localhost` HTTP porque exige **HTTPS** para processar dados de cartão por segurança (PCI-DSS).

### Erro no Console:
```
Your payment cannot be processed because the website contains credit 
card data and is not using a secure connection. SSL certificate is 
required to operate.
```

---

## ✅ SOLUÇÕES POSSÍVEIS:

### **Opção 1: HTTPS Local com mkcert (RECOMENDADO)**

1. **Instalar mkcert:**
   ```bash
   brew install mkcert
   mkcert -install
   ```

2. **Criar certificado para localhost:**
   ```bash
   cd "/Users/helciomattos/Desktop/GRAVADOR MEDICO"
   mkcert localhost 127.0.0.1 ::1
   ```

3. **Configurar Next.js para HTTPS:**
   Criar `server.js`:
   ```javascript
   const { createServer } = require('https');
   const { parse } = require('url');
   const next = require('next');
   const fs = require('fs');

   const dev = process.env.NODE_ENV !== 'production';
   const app = next({ dev });
   const handle = app.getRequestHandler();

   const httpsOptions = {
     key: fs.readFileSync('./localhost-key.pem'),
     cert: fs.readFileSync('./localhost.pem'),
   };

   app.prepare().then(() => {
     createServer(httpsOptions, (req, res) => {
       const parsedUrl = parse(req.url, true);
       handle(req, res, parsedUrl);
     }).listen(3000, (err) => {
       if (err) throw err;
       console.log('> Ready on https://localhost:3000');
     });
   });
   ```

4. **Rodar com HTTPS:**
   ```bash
   node server.js
   ```

---

### **Opção 2: Usar ngrok (RÁPIDO mas temporário)**

1. **Instalar ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Expor localhost:**
   ```bash
   npm run dev  # Em um terminal
   ngrok http 3000  # Em outro terminal
   ```

3. **Copiar URL HTTPS gerada:**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3000
   ```

4. **Acessar via HTTPS:**
   Use `https://abc123.ngrok.io/checkout-test`

---

### **Opção 3: Deploy em Vercel (PRODUÇÃO)**

1. **Fazer deploy:**
   ```bash
   git add .
   git commit -m "feat: enterprise checkout"
   git push
   vercel --prod
   ```

2. **Configurar domínio:**
   Vercel automaticamente fornece HTTPS.

---

## 🎯 PRÓXIMOS PASSOS (RECOMENDADO):

Vou criar o script para você usar **mkcert** (Opção 1) agora mesmo!
