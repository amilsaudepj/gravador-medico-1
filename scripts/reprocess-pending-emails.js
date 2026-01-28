#!/usr/bin/env node
// =====================================================
// 📧 SCRIPT: Reprocessar E-mails Pendentes
// =====================================================
// Uso: node scripts/reprocess-pending-emails.js
// =====================================================

const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

// Carregar .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const lovableEdgeFunctionUrl = process.env.NEXT_PUBLIC_LOVABLE_EDGE_FUNCTION_URL;
const apiSecret = 'webhook-appmax-2026-secure-key';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis SUPABASE não configuradas');
  process.exit(1);
}

if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY não configurada');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

// Gerar senha segura
function generateSecurePassword(length = 12) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Criar usuário no Lovable
async function createLovableUser(email, password, fullName) {
  try {
    console.log(`  👤 Criando usuário no Lovable: ${email}`);
    
    const response = await fetch(lovableEdgeFunctionUrl, {
      method: 'POST',
      headers: {
        'x-api-secret': apiSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Se usuário já existe, considerar como sucesso
      if (data.error?.includes('já existe') || data.error?.includes('already') || data.message?.includes('exists')) {
        console.log(`  ℹ️ Usuário já existe no Lovable - prosseguindo com envio de e-mail`);
        return { success: true, alreadyExists: true };
      }
      throw new Error(data.error || data.message || 'Erro ao criar usuário');
    }
    
    console.log(`  ✅ Usuário criado: ${data.user?.id}`);
    return { success: true, user: data.user };
  } catch (error) {
    console.error(`  ❌ Erro ao criar usuário:`, error.message);
    return { success: false, error: error.message };
  }
}

// Enviar e-mail de boas-vindas
async function sendWelcomeEmail(params) {
  try {
    console.log(`  📧 Enviando e-mail para: ${params.to}`);
    
    const { data, error } = await resend.emails.send({
      from: 'Gravador Médico <noreply@gravadormedico.com.br>',
      to: params.to,
      subject: '🎉 Bem-vindo ao Gravador Médico - Seus Dados de Acesso',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Bem-vindo ao Gravador Médico!</h1>
      <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;">Sua compra foi aprovada com sucesso</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        Olá <strong>${params.customerName}</strong>,
      </p>
      
      <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
        Parabéns pela sua compra! Seu acesso ao Gravador Médico está pronto.
      </p>
      
      <!-- Credentials Box -->
      <div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid #C7D2FE;">
        <h3 style="margin: 0 0 15px 0; color: #4338CA; font-size: 18px;">🔐 Seus Dados de Acesso</h3>
        
        <div style="margin-bottom: 15px;">
          <p style="margin: 0; color: #6B7280; font-size: 14px;">E-mail:</p>
          <p style="margin: 5px 0 0 0; font-family: monospace; background: white; padding: 10px; border-radius: 6px; color: #1F2937; font-size: 14px; border: 1px solid #E5E7EB;">
            ${params.userEmail}
          </p>
        </div>
        
        <div>
          <p style="margin: 0; color: #6B7280; font-size: 14px;">Senha Temporária:</p>
          <p style="margin: 5px 0 0 0; font-family: monospace; background: white; padding: 10px; border-radius: 6px; color: #1F2937; font-size: 14px; border: 1px solid #E5E7EB;">
            ${params.userPassword}
          </p>
        </div>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="https://gravador-medico.lovable.app/login" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%); color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Acessar o Sistema →
        </a>
      </div>
      
      <!-- Order Info -->
      <div style="background: #F9FAFB; border-radius: 8px; padding: 20px; border: 1px solid #E5E7EB;">
        <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px;">Detalhes do Pedido:</p>
        <p style="margin: 0; color: #1F2937; font-size: 14px;">
          <strong>Pedido:</strong> ${params.orderId}<br>
          <strong>Valor:</strong> R$ ${params.orderValue.toFixed(2)}<br>
          <strong>Forma de Pagamento:</strong> ${params.paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito'}
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
      <p style="margin: 0; color: #6B7280; font-size: 13px;">
        Dúvidas? Responda este e-mail ou acesse nosso suporte.<br>
        © 2026 Gravador Médico - Todos os direitos reservados
      </p>
    </div>
  </div>
</body>
</html>
      `
    });
    
    if (error) {
      throw error;
    }
    
    // Salvar log no banco
    await supabase.from('email_logs').insert({
      email_id: data?.id,
      recipient_email: params.to,
      recipient_name: params.customerName,
      subject: '🎉 Bem-vindo ao Gravador Médico - Seus Dados de Acesso',
      email_type: 'welcome',
      from_email: 'noreply@gravadormedico.com.br',
      from_name: 'Gravador Médico',
      order_id: params.orderId,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: {
        user_email: params.userEmail,
        order_value: params.orderValue,
        payment_method: params.paymentMethod,
        reprocessed: true,
        script_version: '1.0'
      },
    });
    
    console.log(`  ✅ E-mail enviado com sucesso: ${data?.id}`);
    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error(`  ❌ Erro ao enviar e-mail:`, error.message);
    
    // Salvar log de erro
    await supabase.from('email_logs').insert({
      recipient_email: params.to,
      recipient_name: params.customerName,
      subject: '🎉 Bem-vindo ao Gravador Médico - Seus Dados de Acesso',
      email_type: 'welcome',
      from_email: 'noreply@gravadormedico.com.br',
      from_name: 'Gravador Médico',
      order_id: params.orderId,
      status: 'failed',
      error_message: error.message,
      metadata: {
        reprocessed: true,
        script_version: '1.0'
      },
    });
    
    return { success: false, error: error.message };
  }
}

// Função principal
async function main() {
  console.log('=====================================================');
  console.log('📧 REPROCESSAR E-MAILS PENDENTES');
  console.log('=====================================================\n');

  // 1. Buscar vendas pagas
  console.log('1️⃣ Buscando vendas pagas...');
  const { data: paidSales, error: salesError } = await supabase
    .from('sales')
    .select('id, customer_email, customer_name, total_amount, payment_method, created_at')
    .eq('order_status', 'paid')
    .order('created_at', { ascending: false });

  if (salesError) {
    console.error('❌ Erro ao buscar vendas:', salesError);
    process.exit(1);
  }

  // Adicionar Helcio Mattos manualmente
  const manualClients = [
    {
      id: 'manual-helcio-mattos',
      customer_email: 'helciodmtt@gmail.com',
      customer_name: 'Helcio Mattos',
      total_amount: 36.0,
      payment_method: 'pix'
    }
  ];

  const allSales = [...manualClients, ...paidSales];

  console.log(`   Encontradas ${paidSales.length} vendas pagas + ${manualClients.length} clientes manuais\n`);

  // 2. Buscar e-mails já enviados
  console.log('2️⃣ Verificando e-mails já enviados...');
  const { data: sentEmails } = await supabase
    .from('email_logs')
    .select('recipient_email')
    .eq('email_type', 'welcome')
    .eq('status', 'sent');

  const sentEmailSet = new Set(sentEmails?.map(e => e.recipient_email.toLowerCase()) || []);
  console.log(`   ${sentEmailSet.size} e-mails já enviados\n`);

  // 3. Filtrar vendas pendentes (sem e-mail enviado)
  const pendingSales = allSales.filter(sale => {
    const email = sale.customer_email?.toLowerCase();
    return email && !sentEmailSet.has(email);
  });

  // Remover duplicatas por e-mail (pegar a venda mais recente)
  const uniquePendingSales = [];
  const seenEmails = new Set();
  for (const sale of pendingSales) {
    const email = sale.customer_email?.toLowerCase();
    if (!seenEmails.has(email)) {
      seenEmails.add(email);
      uniquePendingSales.push(sale);
    }
  }

  console.log(`3️⃣ ${uniquePendingSales.length} clientes precisam receber e-mail:\n`);
  
  if (uniquePendingSales.length === 0) {
    console.log('✅ Nenhum e-mail pendente para processar!');
    process.exit(0);
  }

  uniquePendingSales.forEach((sale, i) => {
    console.log(`   ${i + 1}. ${sale.customer_name} <${sale.customer_email}> - R$ ${sale.total_amount}`);
  });
  console.log('');

  // 4. Processar cada cliente
  console.log('4️⃣ Processando clientes...\n');
  
  let successCount = 0;
  let errorCount = 0;

  for (const sale of uniquePendingSales) {
    console.log(`📌 Processando: ${sale.customer_name} <${sale.customer_email}>`);
    
    const password = generateSecurePassword();
    
    // Criar usuário no Lovable
    const userResult = await createLovableUser(
      sale.customer_email,
      password,
      sale.customer_name
    );
    
    if (!userResult.success && !userResult.alreadyExists) {
      console.log(`   ⚠️ Pulando e-mail pois falhou criação de usuário\n`);
      errorCount++;
      continue;
    }
    
    // Enviar e-mail
    const emailResult = await sendWelcomeEmail({
      to: sale.customer_email,
      customerName: sale.customer_name,
      userEmail: sale.customer_email,
      userPassword: password,
      orderId: sale.id,
      orderValue: sale.total_amount,
      paymentMethod: sale.payment_method
    });
    
    if (emailResult.success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    console.log('');
    
    // Aguardar um pouco entre os e-mails para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Resumo final
  console.log('=====================================================');
  console.log('📊 RESUMO');
  console.log('=====================================================');
  console.log(`   ✅ Sucesso: ${successCount}`);
  console.log(`   ❌ Erros: ${errorCount}`);
  console.log(`   📧 Total processados: ${uniquePendingSales.length}`);
  console.log('=====================================================\n');
}

main().catch(console.error);
