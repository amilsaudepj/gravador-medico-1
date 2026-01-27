const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Inicializar Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'localhost.pem')),
  };

  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
      console.log(`║                                                               ║`);
      console.log(`║   🔒 HTTPS SERVER ATIVO - Mercado Pago Pronto!               ║`);
      console.log(`║                                                               ║`);
      console.log(`╚═══════════════════════════════════════════════════════════════╝\n`);
      console.log(`✅ Servidor HTTPS rodando em: https://${hostname}:${port}`);
      console.log(`✅ Checkout disponível em: https://${hostname}:${port}/checkout-test`);
      console.log(`\n🔐 Certificado SSL local ativo (mkcert)`);
      console.log(`💳 Mercado Pago SDK agora funcionará corretamente!\n`);
    });
});
