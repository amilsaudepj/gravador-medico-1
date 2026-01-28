// =====================================================
// 📧 API ADMIN - REPROCESSAR E-MAILS NÃO ENVIADOS
// =====================================================
// Endpoint: /api/admin/reprocess-emails
// Métodos: GET (listar pendentes), POST (reprocessar)
// Descrição: Reprocessa clientes que compraram mas não receberam e-mail
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWelcomeEmail } from '@/lib/email';
import { createLovableUser, generateSecurePassword, listLovableUsers } from '@/services/lovable-integration';

export async function GET(request: NextRequest) {
  try {
    // Buscar vendas pagas que não têm registro de e-mail enviado
    const { data: paidSales, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('id, customer_email, customer_name, total_amount, payment_method, order_status, created_at')
      .eq('order_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(50);

    if (salesError) {
      throw salesError;
    }

    // Buscar e-mails já enviados
    const { data: sentEmails } = await supabaseAdmin
      .from('email_logs')
      .select('recipient_email')
      .eq('email_type', 'welcome')
      .eq('status', 'sent');

    const sentEmailSet = new Set(sentEmails?.map(e => e.recipient_email.toLowerCase()) || []);

    // Buscar usuários já criados no Lovable
    const lovableResult = await listLovableUsers();
    const lovableEmailSet = new Set(
      lovableResult.users?.map(u => u.email?.toLowerCase()) || []
    );

    // Filtrar vendas que ainda não receberam e-mail
    const pendingEmails = paidSales?.filter(sale => {
      const email = sale.customer_email?.toLowerCase();
      return email && !sentEmailSet.has(email);
    }) || [];

    // Adicionar info se já tem usuário no Lovable
    const pendingWithLovableInfo = pendingEmails.map(sale => ({
      ...sale,
      has_lovable_account: lovableEmailSet.has(sale.customer_email?.toLowerCase())
    }));

    return NextResponse.json({
      success: true,
      pendingCount: pendingWithLovableInfo.length,
      pending: pendingWithLovableInfo,
      totalPaidSales: paidSales?.length || 0,
      totalSentEmails: sentEmailSet.size,
      lovableUsers: lovableEmailSet.size
    });

  } catch (error: any) {
    console.error('[REPROCESS] Erro ao listar pendentes:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { saleId, all } = body;

    const results: Array<{
      saleId: string;
      email: string;
      userCreated: boolean;
      emailSent: boolean;
      error?: string;
    }> = [];

    // Buscar vendas para processar
    let query = supabaseAdmin
      .from('sales')
      .select('*')
      .eq('order_status', 'paid');

    if (saleId) {
      query = query.eq('id', saleId);
    } else if (all) {
      query = query.limit(20); // Limitar para não sobrecarregar
    } else {
      return NextResponse.json(
        { success: false, error: 'Informe saleId ou all=true' },
        { status: 400 }
      );
    }

    const { data: sales, error: salesError } = await query;

    if (salesError) {
      throw salesError;
    }

    if (!sales || sales.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma venda encontrada para processar',
        results: []
      });
    }

    // Buscar usuários existentes no Lovable
    const lovableResult = await listLovableUsers();
    const lovableEmailMap = new Map(
      lovableResult.users?.map(u => [u.email?.toLowerCase(), u]) || []
    );

    // Buscar e-mails já enviados
    const { data: sentEmails } = await supabaseAdmin
      .from('email_logs')
      .select('recipient_email')
      .eq('email_type', 'welcome')
      .eq('status', 'sent');

    const sentEmailSet = new Set(sentEmails?.map(e => e.recipient_email.toLowerCase()) || []);

    // Processar cada venda
    for (const sale of sales) {
      const customerEmail = sale.customer_email?.toLowerCase();
      const customerName = sale.customer_name || 'Cliente';

      if (!customerEmail) {
        results.push({
          saleId: sale.id,
          email: 'N/A',
          userCreated: false,
          emailSent: false,
          error: 'E-mail do cliente não encontrado'
        });
        continue;
      }

      // Pular se já enviou e-mail
      if (sentEmailSet.has(customerEmail)) {
        results.push({
          saleId: sale.id,
          email: customerEmail,
          userCreated: true,
          emailSent: true,
          error: 'E-mail já foi enviado anteriormente'
        });
        continue;
      }

      let userCreated = false;
      let password = '';

      // Verificar se já tem usuário no Lovable
      const existingUser = lovableEmailMap.get(customerEmail);

      if (existingUser) {
        console.log(`[REPROCESS] Usuário já existe no Lovable: ${customerEmail}`);
        userCreated = true;
        // Gerar nova senha para enviar no e-mail
        password = generateSecurePassword();
        
        // TODO: Reset de senha no Lovable se necessário
        // Por enquanto, só envia o e-mail com a senha gerada
      } else {
        // Criar usuário no Lovable
        console.log(`[REPROCESS] Criando usuário no Lovable: ${customerEmail}`);
        password = generateSecurePassword();

        const createResult = await createLovableUser({
          email: customerEmail,
          password: password,
          full_name: customerName
        });

        if (createResult.success) {
          userCreated = true;
          console.log(`[REPROCESS] ✅ Usuário criado: ${customerEmail}`);

          // Registrar log
          await supabaseAdmin.from('integration_logs').insert({
            action: 'create_user_reprocess',
            status: 'success',
            recipient_email: customerEmail,
            user_id: createResult.user?.id,
            details: {
              source: 'admin_reprocess',
              sale_id: sale.id,
              full_name: customerName
            }
          });
        } else {
          results.push({
            saleId: sale.id,
            email: customerEmail,
            userCreated: false,
            emailSent: false,
            error: `Falha ao criar usuário: ${createResult.error}`
          });
          continue;
        }
      }

      // Enviar e-mail de boas-vindas
      console.log(`[REPROCESS] Enviando e-mail para: ${customerEmail}`);

      const emailResult = await sendWelcomeEmail({
        to: customerEmail,
        customerName: customerName,
        userEmail: customerEmail,
        userPassword: password,
        orderId: sale.id,
        orderValue: sale.total_amount || 0,
        paymentMethod: sale.payment_method || 'pix'
      });

      // Registrar log do e-mail
      await supabaseAdmin.from('integration_logs').insert({
        action: 'send_email_reprocess',
        status: emailResult.success ? 'success' : 'error',
        recipient_email: customerEmail,
        details: {
          email_type: 'welcome_credentials',
          email_id: emailResult.emailId,
          sale_id: sale.id,
          sent_at: new Date().toISOString(),
          error: emailResult.error
        }
      });

      if (emailResult.success) {
        console.log(`[REPROCESS] ✅ E-mail enviado: ${customerEmail}`);
        results.push({
          saleId: sale.id,
          email: customerEmail,
          userCreated: userCreated,
          emailSent: true
        });
      } else {
        console.error(`[REPROCESS] ❌ Falha ao enviar e-mail: ${emailResult.error}`);
        results.push({
          saleId: sale.id,
          email: customerEmail,
          userCreated: userCreated,
          emailSent: false,
          error: `Falha ao enviar e-mail: ${emailResult.error}`
        });
      }
    }

    const successCount = results.filter(r => r.emailSent).length;
    const failCount = results.filter(r => !r.emailSent).length;

    return NextResponse.json({
      success: true,
      message: `Processados: ${results.length}, Sucesso: ${successCount}, Falhas: ${failCount}`,
      results
    });

  } catch (error: any) {
    console.error('[REPROCESS] Erro ao reprocessar:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
